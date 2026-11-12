import type { TextProps } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/design-system/tokens';

type AppTextProps = TextProps & {
  variant?: keyof typeof typography;
  tone?: 'primary' | 'secondary' | 'muted' | 'accent';
};

const textColors = {
  primary: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.accent,
} as const;

export function AppText({ variant = 'body', tone = 'primary', style, ...props }: AppTextProps) {
  return <Text {...props} style={[typography[variant], { color: textColors[tone] }, style]} />;
}

const typography = StyleSheet.create({
  hero: { fontSize: 48, lineHeight: 52, fontWeight: '600', letterSpacing: -2.2 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.8 },
  heading: { fontSize: 21, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 19 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 1.8 },
  number: { fontSize: 38, lineHeight: 44, fontWeight: '500', fontVariant: ['tabular-nums'] },
});
