export type LanguagePreference = 'system' | 'en' | 'uk';
export type SupportedLanguage = Exclude<LanguagePreference, 'system'>;
export type AppearancePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<AppearancePreference, 'system'>;

export type Preferences = Readonly<{
  language: LanguagePreference;
  appearance: AppearancePreference;
}>;

export const defaultPreferences: Preferences = { language: 'system', appearance: 'system' };

export function decodePreferences(raw: string | null): Preferences {
  if (raw === null) return defaultPreferences;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('version' in value) ||
      value.version !== 1
    ) {
      return defaultPreferences;
    }
    const language = 'language' in value ? value.language : undefined;
    const appearance = 'appearance' in value ? value.appearance : undefined;
    return {
      language:
        language === 'en' || language === 'uk' || language === 'system' ? language : 'system',
      appearance:
        appearance === 'light' || appearance === 'dark' || appearance === 'system'
          ? appearance
          : 'system',
    };
  } catch {
    return defaultPreferences;
  }
}

export function encodePreferences(preferences: Preferences): string {
  return JSON.stringify({ version: 1, ...preferences });
}

export function resolveLanguage(
  preference: LanguagePreference,
  preferredLanguages: readonly (string | null)[],
): SupportedLanguage {
  if (preference !== 'system') return preference;
  for (const tag of preferredLanguages) {
    const language = tag?.toLowerCase().split(/[-_]/)[0];
    if (language === 'en' || language === 'uk') return language;
  }
  return 'en';
}

export function resolveTheme(
  preference: AppearancePreference,
  systemTheme: string | null | undefined,
): ResolvedTheme {
  if (preference !== 'system') return preference;
  return systemTheme === 'dark' ? 'dark' : 'light';
}
