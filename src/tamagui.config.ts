/**
 * Tamagui Design System Configuration
 * Trust Green Theme for PayCycle Vendor App
 *
 * Design tokens: colors, typography, spacing, shadows
 */

import { createTamagui, createTokens } from 'tamagui'
import { createInterFont } from '@tamagui/font-inter'

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
const fonts = {
  body: createInterFont(),
}

// Tokens
const tokens = createTokens({
  colors,
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
  },
  sizes: {
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
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    modal: 1000,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 30,
    '2xl': 36,
    '3xl': 42,
    '4xl': 48,
  },
})

// Theme configuration
const appConfig = createTamagui({
  tokens,
  fonts,
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
