/**
 * Color contrast utility functions for WCAG compliance
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(rgb: RGB): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    throw new Error('Invalid color format. Use hex format (#RRGGBB)');
  }

  const ratio = getContrastRatio(fgRgb, bgRgb);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,           // Normal text AA
    passesAAA: ratio >= 7,             // Normal text AAA
    passesAALarge: ratio >= 3,         // Large text AA
    passesAAALarge: ratio >= 4.5       // Large text AAA
  };
}

/**
 * Get a readable color (black or white) for a given background
 */
export function getReadableColor(background: string): string {
  const bgRgb = hexToRgb(background);
  if (!bgRgb) {
    return '#000000';
  }

  const luminance = getRelativeLuminance(bgRgb);
  
  // If background is light, use black text; if dark, use white text
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Validate color palette for WCAG compliance
 */
export function validateColorPalette(palette: { [key: string]: string }, background: string): {
  [key: string]: ContrastResult
} {
  const results: { [key: string]: ContrastResult } = {};

  for (const [name, color] of Object.entries(palette)) {
    results[name] = checkContrast(color, background);
  }

  return results;
}

/**
 * Suggest a darker or lighter version of a color to meet contrast requirements
 */
export function suggestAccessibleColor(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): string {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    throw new Error('Invalid color format');
  }

  const bgLuminance = getRelativeLuminance(bgRgb);
  
  // Determine if we need to darken or lighten the foreground
  const shouldDarken = bgLuminance > 0.5;

  // Binary search for the right color
  let low = 0;
  let high = 255;
  let bestColor = foreground;
  let bestRatio = 0;

  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((low + high) / 2);
    const factor = mid / 255;

    const adjustedRgb: RGB = shouldDarken
      ? { r: Math.floor(fgRgb.r * factor), g: Math.floor(fgRgb.g * factor), b: Math.floor(fgRgb.b * factor) }
      : { r: Math.min(255, Math.floor(fgRgb.r + (255 - fgRgb.r) * factor)), 
          g: Math.min(255, Math.floor(fgRgb.g + (255 - fgRgb.g) * factor)), 
          b: Math.min(255, Math.floor(fgRgb.b + (255 - fgRgb.b) * factor)) };

    const ratio = getContrastRatio(adjustedRgb, bgRgb);

    if (ratio >= targetRatio) {
      bestColor = rgbToHex(adjustedRgb);
      bestRatio = ratio;
      if (shouldDarken) {
        high = mid;
      } else {
        low = mid;
      }
    } else {
      if (shouldDarken) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return bestColor;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Application color palette for validation
 */
export const APP_COLOR_PALETTE = {
  primary: '#00BCD4',
  primaryDark: '#0097A7',
  accent: '#FF9800',
  accentDark: '#F57C00',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textDisabled: 'rgba(255, 255, 255, 0.4)',
  backgroundDark: '#121212',
  backgroundCard: '#1E1E1E',
  backgroundElevated: '#2A2A2A'
};

/**
 * Validate application color palette
 */
export function validateAppColors(): void {
  console.group('Color Contrast Validation');

  // Test text colors on dark backgrounds
  const textOnDark = validateColorPalette({
    'Primary Text': APP_COLOR_PALETTE.textPrimary,
    'Primary Color': APP_COLOR_PALETTE.primary,
    'Success': APP_COLOR_PALETTE.success,
    'Warning': APP_COLOR_PALETTE.warning,
    'Error': APP_COLOR_PALETTE.error,
    'Info': APP_COLOR_PALETTE.info
  }, APP_COLOR_PALETTE.backgroundDark);

  console.table(textOnDark);

  // Test text colors on card backgrounds
  const textOnCard = validateColorPalette({
    'Primary Text': APP_COLOR_PALETTE.textPrimary,
    'Primary Color': APP_COLOR_PALETTE.primary,
    'Success': APP_COLOR_PALETTE.success,
    'Warning': APP_COLOR_PALETTE.warning,
    'Error': APP_COLOR_PALETTE.error,
    'Info': APP_COLOR_PALETTE.info
  }, APP_COLOR_PALETTE.backgroundCard);

  console.table(textOnCard);

  console.groupEnd();
}
