import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { ThemeColors } from '@/design-system/tokens';
import { radii } from '@/design-system/tokens';
import { useTheme, useThemeStyles } from '@/design-system/use-theme';

export function MacIllustration() {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.scene} accessibilityElementsHidden pointerEvents="none">
      <View style={styles.orbitOuter} />
      <View style={styles.orbitInner} />
      <View style={styles.display}>
        <View style={styles.camera} />
        <View style={styles.wallpaper}>
          <View style={styles.archBack} />
          <View style={styles.archFront} />
          <View style={styles.remoteMark}>
            <Icon name="wave.3.right" size={34} color={colors.onAccent} />
          </View>
        </View>
      </View>
      <View style={styles.base}>
        <View style={styles.notch} />
      </View>
      <View style={styles.signal}>
        <Icon name="wifi" size={19} color={colors.accent} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scene: { height: 204, alignItems: 'center', justifyContent: 'center' },
    orbitOuter: {
      position: 'absolute',
      width: 268,
      height: 220,
      borderRadius: 140,
      borderWidth: 1,
      borderColor: colors.orbit,
    },
    orbitInner: {
      position: 'absolute',
      width: 218,
      height: 178,
      borderRadius: 110,
      borderWidth: 1,
      borderColor: colors.border,
    },
    display: {
      width: '77%',
      maxWidth: 276,
      height: 164,
      padding: 7,
      paddingTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.deviceBorder,
      backgroundColor: colors.deviceBody,
    },
    camera: {
      position: 'absolute',
      top: 4,
      alignSelf: 'center',
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.camera,
    },
    wallpaper: {
      flex: 1,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: colors.wallpaper,
      alignItems: 'center',
      justifyContent: 'center',
    },
    archBack: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: colors.archBack,
      left: -94,
      top: 28,
    },
    archFront: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.archFront,
      right: -68,
      top: 78,
    },
    remoteMark: {
      width: 64,
      height: 64,
      borderRadius: radii.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-9deg' }],
    },
    base: {
      width: '90%',
      maxWidth: 322,
      height: 10,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      backgroundColor: colors.deviceBase,
      alignItems: 'center',
    },
    notch: {
      width: 54,
      height: 3,
      backgroundColor: colors.deviceNotch,
      borderBottomLeftRadius: 5,
      borderBottomRightRadius: 5,
    },
    signal: {
      position: 'absolute',
      right: '7%',
      top: 18,
      width: 44,
      height: 44,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.accentBorder,
      backgroundColor: colors.accentSurface,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '9deg' }],
    },
  });
