export const Colors = {
  background: '#0f0f14',
  surface: '#1a1a24',
  surfaceAlt: '#22222e',
  border: '#2e2e3e',
  text: '#f0f0f5',
  textSecondary: '#8888a0',
  textMuted: '#555568',

  green: '#00d084',
  greenDim: '#00d08422',
  red: '#ff4757',
  redDim: '#ff475722',
  amber: '#ffa502',
  amberDim: '#ffa50222',
  blue: '#3d8ef0',
  blueDim: '#3d8ef022',

  bullish: '#00d084',
  bearish: '#ff4757',
  neutral: '#ffa502',
};

export const SectorColors: Record<string, string> = {
  Technology:         '#3d8ef0',
  Healthcare:         '#00c9a7',
  Financials:         '#f39c12',
  'Consumer Discretionary': '#e74c3c',
  'Consumer Staples': '#27ae60',
  Industrials:        '#8e44ad',
  Energy:             '#e67e22',
  Materials:          '#16a085',
  Utilities:          '#2980b9',
  'Real Estate':      '#d35400',
  'Communication Services': '#c0392b',
  Unknown:            '#555568',
};

export const Typography = {
  ticker:   { fontSize: 32, fontWeight: '800' as const, letterSpacing: 1 },
  company:  { fontSize: 15, fontWeight: '500' as const },
  price:    { fontSize: 24, fontWeight: '700' as const },
  label:    { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  micro:    { fontSize: 10, fontWeight: '400' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
