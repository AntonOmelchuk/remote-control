import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { colors, layout, radii } from '@/design-system/tokens';

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
  return (
    <Pressable
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

const styles = StyleSheet.create({
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
