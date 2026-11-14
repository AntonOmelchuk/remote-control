import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import type { ThemeColors } from '@/design-system/tokens';
import { layout, radii } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  emphasis?: boolean;
  disabled?: boolean;
  selected?: boolean;
  size?: number;
};

export function IconButton({
  icon,
  label,
  onPress,
  emphasis = false,
  disabled = false,
  selected,
  size = layout.minimumTouchTarget,
}: IconButtonProps) {
  const { accessibilityLanguage } = useAppTranslation();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityLanguage={accessibilityLanguage}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        emphasis && styles.emphasis,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Icon
        name={icon}
        size={emphasis ? 26 : 21}
        color={emphasis ? colors.onAccent : colors.text}
      />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      minWidth: layout.minimumTouchTarget,
      minHeight: layout.minimumTouchTarget,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emphasis: { backgroundColor: colors.accent },
    dimmed: { opacity: 0.45 },
  });
