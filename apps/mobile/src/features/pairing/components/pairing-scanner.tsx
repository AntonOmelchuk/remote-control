import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppText } from '@/components/ui/app-text';
import { radii, spacing } from '@/design-system/tokens';
import { useTheme } from '@/design-system/use-theme';
import { useAppTranslation } from '@/localization/use-app-translation';

type Props = { onScan: (code: string) => void; onError: () => void };

export default function PairingScanner({ onScan, onError }: Props) {
  const { t } = useAppTranslation();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  if (!permission) return <ActivityIndicator color={colors.accent} />;
  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <AppText tone="secondary">
          {t(permission.canAskAgain ? 'pairing.permission' : 'pairing.permissionSettings')}
        </AppText>
        {permission.canAskAgain ? (
          <ActionButton
            label={t('pairing.allowCamera')}
            onPress={() => {
              void requestPermission();
            }}
          />
        ) : null}
      </View>
    );
  }
  return (
    <CameraView
      style={styles.camera}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => onScan(data)}
      onMountError={onError}
      accessibilityLabel={t('pairing.scanner')}
    />
  );
}

const styles = StyleSheet.create({
  camera: { height: 280, width: '100%', borderRadius: radii.md, overflow: 'hidden' },
  permission: { gap: spacing.md },
});
