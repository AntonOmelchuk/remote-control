import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import type { ThemeColors } from '@/design-system/tokens';
import { layout, radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

type ActionButtonProps = {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function ActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  const { accessibilityLanguage } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const primary = variant === 'primary';
  const foreground = primary ? colors.onAccent : colors.text;
  return (
    <Pressable
      accessibilityLanguage={accessibilityLanguage}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="label" style={[styles.label, { color: foreground }]}>
        {label}
      </AppText>
      {icon ? <Icon name={icon} size={19} color={foreground} /> : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      minHeight: 58,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    primary: { backgroundColor: colors.accent },
    secondary: { backgroundColor: colors.surfaceRaised, minHeight: layout.minimumTouchTarget },
    label: { flexShrink: 1, textAlign: 'center' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.5 },
  });
