/**
 * AppSearchBar Component
 * Layer 2 - Composite Component
 *
 * Purpose: Search input with icon and clear button
 * Usage: <AppSearchBar value={query} onChangeText={setQuery} onClear={handleClear} />
 *
 * Features:
 * - Search icon on left
 * - Clear button (X) on right
 * - Placeholder text
 * - Optional onChange and onClear callbacks
 * - Optimized for quick text clearing
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native'
import { AppInput } from '../primitives/AppInput'
import { AppIconButton } from '../primitives/AppIconButton'
import { colors, spacing, borderRadius, componentSizes } from '@constants/tokens'

export interface AppSearchBarProps extends Omit<TextInputProps, 'onChangeText'> {
  /** Current search text */
  value?: string
  /** Callback when text changes */
  onChangeText?: (text: string) => void
  /** Callback when clear button is pressed */
  onClear?: () => void
  /** Custom search icon (defaults to text "🔍") */
  searchIcon?: React.ReactNode
  /** Custom clear icon (defaults to text "✕") */
  clearIcon?: React.ReactNode
  /** Container style override */
  containerStyle?: ViewStyle
  /** Show clear button only when text is not empty */
  showClearOnlyWhenFilled?: boolean
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    height: componentSizes.searchBar,
  },
  searchIconContainer: {
    marginRight: spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing[1],
  },
  clearButton: {
    marginLeft: spacing[1],
  },
  searchIconText: {
    width: componentSizes.icon.md,
    height: componentSizes.icon.md,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppSearchBar - Search input with icon and clear button
 *
 * @example
 * // Basic search bar
 * <AppSearchBar
 *   value={searchQuery}
 *   onChangeText={setSearchQuery}
 *   placeholder="Search customers..."
 * />
 *
 * // With clear callback
 * <AppSearchBar
 *   value={searchQuery}
 *   onChangeText={setSearchQuery}
 *   onClear={() => setSearchQuery('')}
 *   placeholder="Find order..."
 * />
 *
 * // Minimal - only show clear when has text
 * <AppSearchBar
 *   value={query}
 *   onChangeText={setQuery}
 *   showClearOnlyWhenFilled
 * />
 */
export const AppSearchBar: React.FC<AppSearchBarProps> = ({
  value = '',
  onChangeText,
  onClear,
  searchIcon = '🔍',
  clearIcon = '✕',
  placeholder = 'Search...',
  containerStyle,
  showClearOnlyWhenFilled = true,
  ...inputProps
}) => {
  const shouldShowClear = !showClearOnlyWhenFilled || (value && value.length > 0)

  const handleClear = () => {
    onChangeText?.('')
    onClear?.()
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.searchIconContainer}>
        {typeof searchIcon === 'string' ? (
          <AppInput
            editable={false}
            value={searchIcon}
            style={styles.searchIconText}
            pointerEvents="none"
            importantForAccessibility="no"
          />
        ) : (
          searchIcon
        )}
      </View>

      <AppInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        {...inputProps}
      />

      {shouldShowClear && value && value.length > 0 && (
        <AppIconButton
          icon={typeof clearIcon === 'string' ? clearIcon : clearIcon}
          onPress={handleClear}
          variant="ghost"
          size="sm"
          style={styles.clearButton}
        />
      )}
    </View>
  )
}

export default AppSearchBar
