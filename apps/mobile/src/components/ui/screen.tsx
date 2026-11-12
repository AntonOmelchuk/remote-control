import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/design-system/tokens';

type ScreenProps = PropsWithChildren<{ insetTop?: boolean; accessibilityElementsHidden?: boolean }>;

export function Screen({
  children,
  insetTop = false,
  accessibilityElementsHidden = false,
}: ScreenProps) {
  return (
    <SafeAreaView
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

const styles = StyleSheet.create({
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
