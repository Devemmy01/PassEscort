/**
 * Brand vectors as plain SVG strings — the single source for the in-app
 * <Logomark> (rendered with react-native-svg's SvgXml) and for the generated
 * app icon, adaptive icon, splash and favicon PNGs
 * (scripts/generate-brand-assets.ts, which runs under Node — so this file must
 * not import images or React Native).
 *
 * Source: Figma "PassEscort (Edtech Product)", Splash section (62:574). The
 * mark is redrawn as vectors from the 2556px Figma export and matches it to
 * within 1% of pixels (antialiased edges only): a navy "D" stroke with round
 * caps, one sky pill inside it and one beneath it.
 *
 * The wordmark ("PassEscort" in a custom geometric face) and the mascot, Passy
 * the owl, are raster artwork from Figma and live in assets/brand and
 * assets/passy; see src/components/Brand.tsx.
 */
import { palette } from '../theme/tokens';

/** Figma Navy 900 and Sky 500 — the only two colours in the mark. */
export const LOGO_NAVY = palette.navy900;
export const LOGO_SKY = palette.sky500;
/** Figma "Neutral / Background" — the splash screen colour (frame 01 Splash). */
export const SPLASH_BACKGROUND = palette.slate50;
/** Behind the full-bleed app icon and the Android adaptive icon layer. */
export const ICON_BACKGROUND = palette.white;

/** The mark's own artboard: 270 × 355 units. */
export const LOGOMARK_ASPECT = 270 / 355;

const MARK_PATHS = (navy: string, sky: string) =>
  `<path d="M25.5 25.5H142.6A101.9 101.9 0 0 1 142.6 229.3H25.5" fill="none" stroke="${navy}" stroke-width="51" stroke-linecap="round"/>` +
  `<rect x="0" y="101.4" width="168.2" height="50" rx="25" fill="${sky}"/>` +
  `<rect x="0" y="305" width="168.2" height="50" rx="25" fill="${sky}"/>`;

export interface LogomarkOptions {
  /** Paint a background behind the mark (app icon, favicon). Omit for a transparent canvas. */
  background?: string;
  /** Corner radius of the background in a 512 canvas; 0 for full-bleed icons the OS masks. */
  backgroundRadius?: number;
  /** Single-colour silhouette (Android themed icon, mark on photos/dark cards). */
  monochrome?: string;
  /** Height of the mark as a share of the square canvas (1 = touches top and bottom). */
  scale?: number;
  /** Square 512 canvas with the mark centred (icons). False = tight 270×355 artboard. */
  square?: boolean;
}

/**
 * Logomark SVG. With `square` (the default for icons) the mark is centred on a
 * 512×512 canvas at `scale` of its height; otherwise the viewBox hugs the mark,
 * which is what in-app lockups want.
 */
export function logomarkSvg({ background, backgroundRadius = 112, monochrome, scale = 0.62, square = true }: LogomarkOptions = {}): string {
  const navy = monochrome ?? LOGO_NAVY;
  const sky = monochrome ?? LOGO_SKY;
  if (!square) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 355">${MARK_PATHS(navy, sky)}</svg>`;
  }
  const k = (512 * scale) / 355;
  const x = (512 - 270 * k) / 2;
  const y = (512 - 355 * k) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    (background ? `<rect width="512" height="512" rx="${backgroundRadius}" fill="${background}"/>` : '') +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})">${MARK_PATHS(navy, sky)}</g>` +
    `</svg>`
  );
}
