import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import type { ThemeColors } from '@/design-system/tokens';
import { layout, radii, spacing } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

type PreferenceOptionProps = {
  label: string;
  description?: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
};

export function PreferenceOption({
  label,
  description,
  hint,
  selected,
  onPress,
}: PreferenceOptionProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { accessibilityLanguage } = useAppTranslation();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityHint={hint}
      accessibilityLanguage={accessibilityLanguage}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <AppText variant="label">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.indicator, selected && styles.indicatorSelected]}>
        {selected ? <Icon name="checkmark" size={14} color={colors.onAccent} /> : null}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    option: {
      minHeight: layout.minimumTouchTarget + spacing.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    copy: { flex: 1, gap: spacing.xs },
    selected: { borderColor: colors.accentBorder, backgroundColor: colors.accentSurface },
    indicator: {
      width: 26,
      height: 26,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    indicatorSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    pressed: { opacity: 0.75 },
  });
