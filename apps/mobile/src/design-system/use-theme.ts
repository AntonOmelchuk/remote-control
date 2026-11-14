import { useMemo } from 'react';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import type { ThemeColors } from '@/design-system/tokens';
import { usePreferences } from '@/preferences/context';

export function useTheme() {
  const { colors, theme } = usePreferences();
  return { colors, theme };
}

export function useThemeStyles<Styles extends Record<string, ViewStyle | TextStyle | ImageStyle>>(
  createStyles: (colors: ThemeColors) => Styles,
): Styles {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
