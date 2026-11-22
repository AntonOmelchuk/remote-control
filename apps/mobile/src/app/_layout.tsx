import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { useTheme } from '@/design-system/use-theme';
import { i18n } from '@/localization/i18n';
import { useAppTranslation } from '@/localization/use-app-translation';
import { PreferencesProvider } from '@/preferences/context';

// Expo Go may not expose a controllable native splash; restoration still gates the first screen.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppNavigator() {
  const { colors, theme } = useTheme();
  const { t } = useAppTranslation();
  const baseTheme = theme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={() => {
        void SplashScreen.hideAsync().catch(() => undefined);
      }}
    >
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="index"
            options={{ headerShown: false, title: t('navigation.devices') }}
          />
          <Stack.Screen
            name="preview"
            options={{
              title: t('navigation.preview'),
              headerRight: () => (
                <IconButton
                  icon="gearshape"
                  label={t('common.settings')}
                  onPress={() => router.push('/settings')}
                />
              ),
            }}
          />
          <Stack.Screen name="connection-guide" options={{ title: t('navigation.guide') }} />
          <Stack.Screen name="remote" options={{ title: t('remoteAudio.navigation') }} />
          <Stack.Screen name="pair" options={{ title: t('pairing.navigation') }} />
          <Stack.Screen name="settings" options={{ title: t('navigation.settings') }} />
        </Stack>
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <I18nextProvider i18n={i18n}>
        <AppNavigator />
      </I18nextProvider>
    </PreferencesProvider>
  );
}
