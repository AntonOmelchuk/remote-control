import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { colors, layout, radii, spacing } from '@/design-system/tokens';

type ActionButtonProps = {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function ActionButton({ label, icon, onPress, variant = 'primary' }: ActionButtonProps) {
  const primary = variant === 'primary';
  const foreground = primary ? colors.onAccent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="label" style={[styles.label, { color: foreground }]}>
        {label}
      </AppText>
      {icon ? <Icon name={icon} size={19} color={foreground} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
