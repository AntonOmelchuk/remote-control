import type { SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/design-system/tokens';

export type IconName = Extract<SymbolViewProps['name'], string>;
type IconProps = { name: IconName; size?: number; color?: string };

export function Icon({ name, size = 22, color = colors.text }: IconProps) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight="medium"
      accessible={false}
      accessibilityElementsHidden
      style={{ width: size, height: size }}
    />
  );
}
