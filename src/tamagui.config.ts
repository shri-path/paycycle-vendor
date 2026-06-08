/**
 * Tamagui Design System Configuration
 * Trust Green Theme for PayCycle Vendor App
 *
 * Design tokens: colors, typography, spacing, shadows
 */

import { createTamagui, createTokens, createFont } from 'tamagui'

// Colors - Trust Green Theme
const colors = {
  // Primary Colors
  primary: '#075E54',
  primaryLight: '#128C7E',
  secondary: '#128C7E',
  accent: '#25D366',

  // Neutral Colors
  background: '#F0F2F5',
  surface: '#FFFFFF',

  // Text Colors
  textPrimary: '#111B21',
  textSecondary: '#667781',

  // Semantic Colors
  success: '#25D366',
  error: '#DC2626',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Shades
  dark: '#111B21',
  light: '#F0F2F5',
  white: '#FFFFFF',
  black: '#000000',

  // Gray scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
}

// Typography
// Screens render text via the plain-RN AppText primitive, so this font config only
// needs to be valid for createTamagui — layout primitives (YStack/XStack) don't use it.
const bodyFont = createFont({
  family: 'System',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, true: 16 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 28, 5: 30, 6: 36, true: 24 },
  weight: { 1: '400', 4: '500', 6: '600', 7: '700', true: '400' },
  letterSpacing: { 1: 0, true: 0 },
})

const fonts = {
  body: bodyFont,
  heading: bodyFont,
}

// Tokens
// Tamagui v2 requires these exact group names: color, space, size, radius, zIndex.
// Each group needs a `true` entry (the default used when a prop is passed `true`).
// Screens pass raw values (hex colors, numeric spacing) so these are mainly to make
// createTamagui valid; fontSize/lineHeight live on the font config, not here.
const tokens = createTokens({
  color: colors,
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    full: '100%',
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    round: 999,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    modal: 1000,
    true: 0,
  },
})

// Theme configuration
const appConfig = createTamagui({
  tokens,
  fonts,
  defaultFont: 'body',
  themes: {
    light: {
      background: colors.background,
      foreground: colors.textPrimary,
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      surface: colors.surface,
      muted: colors.gray400,
      error: colors.error,
      success: colors.success,
      warning: colors.warning,
    },
  },
  defaultTheme: 'light',
})

export default appConfig
export type AppConfig = typeof appConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
