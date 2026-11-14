const dark = {
  background: '#101211',
  surface: '#1B1E1C',
  surfaceRaised: '#252A26',
  border: '#343B35',
  text: '#F5F6F2',
  textSecondary: '#B7BEB6',
  textMuted: '#98A291',
  accent: '#D7F59C',
  accentSurface: '#293320',
  onAccent: '#1C2713',
  overlay: 'rgba(0, 0, 0, 0.72)',
  accentBorder: '#4B5B3D',
  artwork: '#35472B',
  artworkDisc: '#435B34',
  orbit: '#252C25',
  deviceBorder: '#687267',
  deviceBody: '#242B24',
  camera: '#7A8879',
  wallpaper: '#303E29',
  archBack: '#455C36',
  archFront: '#637E46',
  deviceBase: '#737D70',
  deviceNotch: '#40493E',
} as const;

export type ThemeColors = { readonly [Key in keyof typeof dark]: string };

const light = {
  background: '#F5F7F2',
  surface: '#FFFFFF',
  surfaceRaised: '#E9EEE4',
  border: '#D4DCCE',
  text: '#192316',
  textSecondary: '#465540',
  textMuted: '#5C6C55',
  accent: '#365C18',
  accentSurface: '#E2EFD3',
  onAccent: '#FFFFFF',
  overlay: 'rgba(17, 27, 12, 0.42)',
  accentBorder: '#B8CFA5',
  artwork: '#E2EFD3',
  artworkDisc: '#CBDEB8',
  orbit: '#DCE5D4',
  deviceBorder: '#8E9E83',
  deviceBody: '#DCE5D4',
  camera: '#56684A',
  wallpaper: '#D6E8C4',
  archBack: '#B2CE97',
  archFront: '#85AB62',
  deviceBase: '#A8BA9B',
  deviceNotch: '#738A64',
} as const satisfies ThemeColors;

export const palettes = { light, dark } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const layout = { contentWidth: 560, minimumTouchTarget: 36 } as const;
