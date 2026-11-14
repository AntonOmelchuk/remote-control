import type { SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/design-system/use-theme';

export type IconName = Extract<SymbolViewProps['name'], string>;
type IconProps = { name: IconName; size?: number; color?: string };

export function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useTheme();
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color ?? colors.text}
      weight="medium"
      accessible={false}
      accessibilityElementsHidden
      style={{ width: size, height: size }}
    />
  );
}
