/**
 * PassEscort design tokens — the single source of truth for the visual
 * language. Every component in src/components and every screen is assembled
 * from these values; nothing should hard-code a hex colour or pixel size.
 *
 * Source: the Figma file "PassEscort (Edtech Product)", page "PassEscort —
 * Design System" (variables `PE/Colors/*` and `PE/Typography/*`). Values that
 * are not Figma variables are marked "derived": they come from the same
 * Tailwind ramps the Figma neutrals and functional colours are taken from
 * (slate, green, red, amber, orange) and exist only where a Figma colour fails
 * the contrast rules below.
 *
 * Legibility rules for low-end Android screens (enforced by
 * src/theme/__tests__/contrast.test.ts):
 *  - every text/background pair listed in TEXT_PAIRS meets WCAG AA (4.5:1);
 *  - no font weight below 400, body text never below 16sp;
 *  - interactive targets are at least 48dp (layout.minTouch);
 *  - surfaces are flat (Figma): 1px borders and fill changes, never blurred
 *    shadows, which are expensive and render muddily on cheap panels.
 */

export const palette = {
  // Brand — Figma "Navy Blue" (PE/Colors/Navy 900 is the brand colour)
  navy950: '#021A3D',
  navy900: '#042455',
  navy800: '#07336F',
  navy700: '#0A4A91',
  navy100: '#E6EEF8',
  navy50: '#F3F7FC',

  // Brand — Figma "Sky Blue" (PE/Colors/Sky 500 is the brand colour)
  sky700: '#0967D5',
  sky600: '#1477E6',
  sky500: '#1D82F8',
  sky400: '#4A9BFA',
  sky100: '#DCEEFF',
  sky50: '#EFF7FF',

  // Neutrals — Figma PE/Colors/Neutral *
  white: '#FFFFFF',
  slate50: '#F8FAFC', // Background
  gray200: '#E5E7EB', // Border
  slate400: '#94A3B8', // Disabled
  slate500: '#64748B', // Secondary text
  slate900: '#0F172A', // Text, and the dark-mode background
  slate100: '#F1F5F9', // derived
  slate300: '#CBD5E1', // derived
  slate600: '#475569', // derived
  slate700: '#334155', // derived

  // Functional — Figma PE/Colors/Green, Red, Yellow
  green600: '#16A34A',
  red600: '#DC2626',
  amber500: '#F59E0B',
  // Home-screen accents — Figma "Color / Yellow" and "Color / Orange"
  sun: '#FFCE51',
  orange: '#FF7324',

  // Derived tints and text shades for the functional colours
  green50: '#F0FDF4',
  green200: '#BBF7D0',
  green700: '#15803D',
  green800: '#166534',
  red50: '#FEF2F2',
  red200: '#FECACA',
  red700: '#B91C1C',
  red800: '#991B1B',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber700: '#B45309',
  amber900: '#78350F',
  orange50: '#FFF7ED',
  /** Large-text orange: 3.56:1 on white (Figma's amber streak numeral is 2.15:1). */
  orange600: '#EA580C',
  orange700: '#C2410C',

  // Third-party brand colours used only on their own share buttons
  whatsapp: '#25D366',
  whatsappDark: '#0B6E3A',
  whatsappLedge: '#074D28',
} as const;

export const colors = {
  // Surfaces
  background: palette.slate50,
  surface: palette.white,
  surfaceSunken: palette.navy100,
  surfaceRaised: palette.white,
  overlay: 'rgba(2, 26, 61, 0.55)',
  /** Figma "Dark mode" swatch — used for full-bleed dark moments (Level 50, share cards). */
  ink: palette.slate900,

  // Text
  text: palette.slate900,
  textSecondary: palette.slate500,
  /** Figma has no muted text tier; Disabled (#94A3B8) fails AA as text, so muted = secondary. */
  textMuted: palette.slate500,
  textOnPrimary: palette.white,
  textOnGold: palette.slate900,
  /** Figma links use Sky 500, which is 3.75:1 on white; Sky 700 is the nearest passing shade. */
  textLink: palette.sky700,
  placeholder: palette.slate400,

  // Lines
  border: palette.gray200,
  /**
   * Input outlines — must clear 3:1 against surfaces (WCAG 1.4.11). Figma
   * draws inputs with Border #E5E7EB (1.24:1), so this stays darker than Figma.
   */
  borderStrong: palette.slate500,
  focus: palette.sky500,

  // Brand
  primary: palette.navy900,
  primaryPressed: palette.navy700,
  primaryLedge: palette.navy950,
  primarySoft: palette.navy50,
  primarySoftBorder: palette.navy100,
  accent: palette.sky500,
  accentText: palette.sky700,
  accentSoft: palette.sky50,

  // Rewards
  /** XP is sky blue in Figma (XP hexagon, XP counter pill). */
  xp: palette.sky500,
  xpLedge: palette.sky700,
  xpSoft: palette.sky100,
  /** Gold accent for premium CTAs, medals and highlights — Figma Yellow. */
  gold: palette.amber500,
  goldLedge: palette.amber700,
  goldSoft: palette.amber100,
  goldSoftBorder: palette.amber200,
  /** Gems are yellow in Figma (gem hexagon). */
  gem: palette.amber500,
  gemSoft: palette.amber100,
  streak: palette.orange,
  streakSoft: palette.orange50,

  // Feedback
  success: palette.green600,
  successText: palette.green700,
  successSoft: palette.green50,
  successSoftBorder: palette.green200,
  successLedge: palette.green700,
  danger: palette.red600,
  dangerText: palette.red700,
  dangerSoft: palette.red50,
  dangerSoftBorder: palette.red200,
  dangerLedge: palette.red700,
  warning: palette.amber500,
  warningText: palette.amber700,
  warningSoft: palette.amber50,
  info: palette.sky500,
  infoText: palette.sky700,
  infoSoft: palette.sky50,

  // Disabled
  disabledBg: palette.slate100,
  disabledText: palette.slate600,
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Text/background pairs that ship in the UI. The contrast test asserts each
 * one meets WCAG AA for normal-size text (4.5:1).
 */
export const TEXT_PAIRS: ReadonlyArray<readonly [ColorToken, ColorToken]> = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'background'],
  ['textOnPrimary', 'primary'],
  ['textOnPrimary', 'primaryPressed'],
  ['textOnGold', 'gold'],
  ['textOnGold', 'goldSoft'],
  ['textLink', 'surface'],
  ['textLink', 'background'],
  ['accentText', 'accentSoft'],
  ['primary', 'primarySoft'],
  ['primary', 'xpSoft'],
  ['successText', 'successSoft'],
  ['successText', 'surface'],
  ['dangerText', 'dangerSoft'],
  ['dangerText', 'surface'],
  ['warningText', 'warningSoft'],
  ['infoText', 'infoSoft'],
  ['disabledText', 'disabledBg'],
  ['textOnPrimary', 'successLedge'],
  ['textOnPrimary', 'dangerLedge'],
  ['textOnPrimary', 'xpLedge'],
  ['dangerText', 'streakSoft'],
  ['textOnPrimary', 'ink'],
];

/** Non-text UI boundaries that must clear 3:1 (inputs, focus, progress fills). */
export const UI_PAIRS: ReadonlyArray<readonly [ColorToken, ColorToken]> = [
  ['borderStrong', 'surface'],
  ['focus', 'surface'],
  ['primary', 'surface'],
  ['accent', 'surface'],
  ['danger', 'surface'],
];

/** 4-point spacing scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;


export const layout = {
  minTouch: 48,
  screenGutter: 16,
  /** Content column on phones (and narrow iPad Split View). */
  maxContentWidth: 480,
  /** Windows at least this wide (iPad full screen, either orientation) get the tablet column. */
  tabletBreakpoint: 768,
  /** Content column on tablets: wide enough to use the screen, short enough lines to read (~90 characters). */
  tabletContentWidth: 720,
  tabBarHeight: 64,
} as const;

/** Content column width for a window `width` dp wide (phones and iPad Split View get the phone column). */
export function contentWidthFor(width: number): number {
  return width >= layout.tabletBreakpoint ? layout.tabletContentWidth : layout.maxContentWidth;
}

/**
 * Inter, loaded with expo-font in App.tsx. React Native needs one family name
 * per weight (a single family with fontWeight would be faux-bolded on
 * Android), so <Text> resolves the variant's fontWeight to one of these.
 */
export const fontFamilies = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fontFamilies;

/** Maps any fontWeight to the nearest loaded Inter face (Figma tops out at Bold). */
export function fontFamilyFor(weight: string | number | undefined): string {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  if (w >= 700) return fontFamilies['700'];
  if (w >= 600) return fontFamilies['600'];
  if (w >= 500) return fontFamilies['500'];
  return fontFamilies['400'];
}

/**
 * Type scale — Figma PE/Typography/* (Inter). Figma names in brackets:
 * display [Display 32 Bold], h1 [H1 28 Bold], h2 [H2 22 Bold],
 * h3 [H3 18 SemiBold], body [Body Large 16 Regular], bodySm [Body 14 Regular],
 * label [Label 14 Medium], caption [Caption 12 Medium]. The rest are coded
 * roles Figma does not define yet.
 *
 * Figma sets line height to 100%. That clips descenders on Android and is
 * too tight for multi-line copy, so line heights here are 1.25–1.5×.
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  bodyLg: { fontSize: 17, lineHeight: 26, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8 },
  mono: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Motion durations (ms) and the shared easing intent for micro-interactions. */
export const motion = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 400,
  celebrate: 900,
} as const;
