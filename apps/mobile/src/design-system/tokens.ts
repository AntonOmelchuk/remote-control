export const colors = {
  background: '#101211',
  surface: '#1B1E1C',
  surfaceRaised: '#252A26',
  border: '#343B35',
  text: '#F5F6F2',
  textSecondary: '#B7BEB6',
  textMuted: '#8E998D',
  accent: '#D7F59C',
  accentSurface: '#293320',
  onAccent: '#1C2713',
  overlay: 'rgba(0, 0, 0, 0.72)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const layout = { contentWidth: 560, minimumTouchTarget: 48 } as const;
