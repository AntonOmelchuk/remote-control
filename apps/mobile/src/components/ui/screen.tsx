import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/design-system/tokens';
import { layout, spacing } from '@/design-system/tokens';
import { useThemeStyles } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

type ScreenProps = PropsWithChildren<{ insetTop?: boolean; accessibilityElementsHidden?: boolean }>;

export function Screen({
  children,
  insetTop = false,
  accessibilityElementsHidden = false,
}: ScreenProps) {
  const { accessibilityLanguage } = useAppTranslation();
  const styles = useThemeStyles(createStyles);
  return (
    <SafeAreaView
      accessibilityLanguage={accessibilityLanguage}
      style={styles.safeArea}
      edges={insetTop ? ['top', 'right', 'bottom', 'left'] : ['right', 'bottom', 'left']}
      accessibilityElementsHidden={accessibilityElementsHidden}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth: layout.contentWidth,
      alignSelf: 'center',
      padding: spacing.xl,
      paddingTop: spacing.lg,
      gap: spacing.xl,
    },
  });
