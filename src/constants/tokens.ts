/**
 * Design Tokens exported from tamagui.config.ts
 * Single source of truth for all design values
 */

// ============================================================================
// COLORS - Trust Green Theme
// ============================================================================

export const colors = {
  // Primary Colors
  primary: '#075E54',
  primaryLight: '#128C7E',
  secondary: '#128C7E',
  accent: '#25D366',

  // Background & Surface
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

  // Gray Scale
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

  // Badge Background Colors (light tints)
  primaryBg: '#F0F9FF',
  successBg: '#ECFDF5',
  warningBg: '#FFFBEB',
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',

  // Focus States (lighter-variant border shown on focus)
  // Applied to inputs (via useFocusRing) and every clickable element on web.
  focusBorder: '#128C7E',                 // lighter variant of primary (#075E54)
  focusBorderError: '#F87171',            // lighter variant of error (#DC2626)
} as const

// ============================================================================
// SPACING - Base unit: 4px
// ============================================================================

export const spacing = {
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
} as const

export const spacingValues = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[3],
  lg: spacing[4],
  xl: spacing[5],
  xxl: spacing[6],
  xxxl: spacing[8],
} as const

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  0: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 999,
} as const

// ============================================================================
// FONT SIZES
// ============================================================================

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const

// ============================================================================
// LINE HEIGHTS
// ============================================================================

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 30,
  '2xl': 36,
  '3xl': 42,
  '4xl': 48,
} as const

// ============================================================================
// FONT WEIGHTS
// ============================================================================

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  base: 0,
  low: 100,
  medium: 200,
  high: 300,
  modal: 1000,
  toast: 1100,
} as const

// ============================================================================
// SHADOWS (iOS + Android compatible)
// ============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  base: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
} as const

// ============================================================================
// COMPONENT SIZES - Standardized dimensions for UI elements
// ============================================================================

export const componentSizes = {
  // Button & Touch Target Sizes
  button: {
    sm: 32,    // Small button height
    md: 44,    // Medium button height (minimum touch target)
    lg: 56,    // Large button height
  },

  // Icon Button Sizes
  iconButton: {
    sm: 32,
    md: 40,
    lg: 48,
  },

  // Avatar Sizes
  avatar: {
    sm: 32,
    md: 40,
    lg: 56,
  },

  // Input Field Heights
  input: {
    sm: 36,
    md: 44,
    lg: 52,
  },

  // Textarea Height
  textArea: 100,

  // Icon Sizes
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,  // For empty states and large illustrations
  },

  // Toggle Switch
  toggle: {
    sm: { width: 40, height: 24, thumb: 20 },
    md: { width: 50, height: 28, thumb: 24 },
    lg: { width: 60, height: 34, thumb: 30 },
  },

  // Checkbox & Radio
  checkbox: 20,
  radio: 20,
  radioDot: 8,  // Inner dot size for selected radio

  // Badge & Indicators
  badge: {
    indicator: 20,     // Badge size for notifications
    statusDot: 14,     // Small status indicator
  },

  // Header & Header Elements
  header: {
    height: 56,
    hitSlop: 8,        // Touch target expansion
  },

  // Search Bar
  searchBar: 44,

  // Progress Bar
  progressBar: 8,

  // Timeline
  timeline: {
    indicator: 20,
    connector: 2,
    statusDot: 14,
  },

  // Modal & Bottom Sheet
  bottomSheet: {
    handle: { height: 4, borderRadius: 2 },
  },

  // Divider
  divider: 1,
} as const

// ============================================================================
// BORDER WIDTH - Consistent border thicknesses
// ============================================================================

export const borderWidth = {
  thin: 1,
  medium: 1.5,
  thick: 2,
  extraThick: 4,
} as const

// ============================================================================
// ANIMATION & INTERACTION - Timing and effects
// ============================================================================

export const animation = {
  // Duration in milliseconds
  duration: {
    fast: 150,
    base: 200,
    slow: 300,
    slower: 500,
  },

  // Opacity values for interactions
  opacity: {
    disabled: 0.5,
    hover: 0.8,
    active: 0.7,
    focus: 0.85,
  },
} as const

// ============================================================================
// INTERACTION - Touch targets and feedback
// ============================================================================

export const interaction = {
  // Minimum touch target size (Apple HIG: 44x44)
  minTouchTarget: 44,

  // Default hit slop for easier touch targets
  defaultHitSlop: 8,

  // Active states
  activeOpacity: 0.7,
  disabledOpacity: 0.5,
} as const

// ============================================================================
// SEMANTIC TOKENS (for common use cases)
// ============================================================================

export const semanticColors = {
  primary: colors.primary,
  primaryLight: colors.primaryLight,
  secondary: colors.secondary,
  accent: colors.accent,

  text: {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    disabled: colors.gray400,
    inverse: colors.white,
  },

  background: {
    default: colors.background,
    surface: colors.surface,
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  border: {
    default: colors.gray200,
    light: colors.gray100,
    dark: colors.gray300,
  },

  status: {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  },

  disabled: {
    background: colors.gray100,
    border: colors.gray300,
    text: colors.gray400,
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorKey = keyof typeof colors
export type SpacingKey = keyof typeof spacing
export type BorderRadiusKey = keyof typeof borderRadius
export type FontSizeKey = keyof typeof fontSize
export type LineHeightKey = keyof typeof lineHeight
export type FontWeightKey = keyof typeof fontWeight
export type ZIndexKey = keyof typeof zIndex
export type ComponentSizeKey = keyof typeof componentSizes
export type BorderWidthKey = keyof typeof borderWidth
export type AnimationDurationKey = keyof typeof animation.duration
export type OpacityKey = keyof typeof animation.opacity
