import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemeColors } from '@/design-system/tokens';
import { palettes } from '@/design-system/tokens';
import type {
  AppearancePreference,
  LanguagePreference,
  Preferences,
  ResolvedTheme,
  SupportedLanguage,
} from '@/preferences/model';
import { defaultPreferences, resolveLanguage, resolveTheme } from '@/preferences/model';
import { createPreferencesRepository } from '@/preferences/storage';

type StorageStatus = 'saved' | 'saving' | 'error';
type PreferencesContextValue = {
  preferences: Preferences;
  language: SupportedLanguage;
  theme: ResolvedTheme;
  colors: ThemeColors;
  storageStatus: StorageStatus;
  setLanguage: (language: LanguagePreference) => void;
  setAppearance: (appearance: AppearancePreference) => void;
  retrySave: () => void;
};

const repository = createPreferencesRepository(AsyncStorage);
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const locales = useLocales();
  const systemTheme = useColorScheme();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('saved');
  const latestPreferences = useRef(defaultPreferences);
  const latestRequest = useRef(0);

  useEffect(() => {
    let active = true;
    void repository.load().then((result) => {
      if (!active) return;
      latestPreferences.current = result.preferences;
      setPreferences(result.preferences);
      setStorageStatus(result.failed ? 'error' : 'saved');
    });
    return () => {
      active = false;
    };
  }, []);

  function persist(next: Preferences) {
    const request = ++latestRequest.current;
    setStorageStatus('saving');
    void repository.save(next).then(
      () => {
        if (request === latestRequest.current) setStorageStatus('saved');
      },
      () => {
        if (request === latestRequest.current) setStorageStatus('error');
      },
    );
  }

  function update(patch: Partial<Preferences>) {
    const next = { ...latestPreferences.current, ...patch };
    latestPreferences.current = next;
    setPreferences(next);
    persist(next);
  }

  if (preferences === null) return null;
  const language = resolveLanguage(
    preferences.language,
    locales.map((locale) => locale.languageCode),
  );
  const theme = resolveTheme(preferences.appearance, systemTheme);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        language,
        theme,
        colors: palettes[theme],
        storageStatus,
        setLanguage: (value) => update({ language: value }),
        setAppearance: (value) => update({ appearance: value }),
        retrySave: () => persist(latestPreferences.current),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (context === null) throw new Error('usePreferences must be used within PreferencesProvider');
  return context;
}
