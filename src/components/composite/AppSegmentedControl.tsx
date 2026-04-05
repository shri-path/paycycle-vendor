/**
 * AppSegmentedControl Component
 * Layer 2 - Composite Component
 *
 * Purpose: Segmented control for switching between related views
 * Usage: <AppSegmentedControl segments={['Daily', 'Weekly', 'Monthly']} selectedIndex={0} onChange={setSelected} />
 *
 * Features:
 * - Multiple segments displayed as buttons
 * - Single selection mode
 * - Animated active indicator
 * - Touch-friendly sizing
 * - Optional icons with labels
 */

import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { colors, spacing, borderRadius, componentSizes, fontSize, fontWeight, animation } from '@constants/tokens'

export interface Segment {
  label: string
  value: string | number
  icon?: React.ReactNode
}

export interface AppSegmentedControlProps {
  /** Array of segments */
  segments: Segment[] | string[]
  /** Currently selected segment index */
  selectedIndex?: number
  /** Callback when segment is selected */
  onChange?: (index: number, value: string | number) => void
  /** Disable the control */
  disabled?: boolean
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: spacing[1],
    flexDirection: 'row',
    height: componentSizes.input.md,
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    minWidth: 80,
    marginHorizontal: spacing[1],
  },
  segmentActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentDisabled: {
    opacity: animation.opacity.disabled,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  segmentIcon: {
    fontSize: fontSize.base,
  },
  segmentLabel: {
    fontWeight: fontWeight.medium,
  },
  segmentLabelActive: {
    color: colors.primary,
  },
  segmentLabelInactive: {
    color: colors.textSecondary,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppSegmentedControl - Segmented control for switching between related views
 *
 * @example
 * // Basic string segments
 * <AppSegmentedControl
 *   segments={['Daily', 'Weekly', 'Monthly']}
 *   selectedIndex={0}
 *   onChange={(index) => setTimeframe(index)}
 * />
 *
 * // With icons and complex segments
 * <AppSegmentedControl
 *   segments={[
 *     { label: 'List', value: 'list', icon: '📋' },
 *     { label: 'Grid', value: 'grid', icon: '📊' },
 *   ]}
 *   selectedIndex={0}
 *   onChange={(index, value) => setViewType(value)}
 * />
 *
 * // Disabled state
 * <AppSegmentedControl
 *   segments={['Option 1', 'Option 2']}
 *   selectedIndex={0}
 *   disabled
 * />
 */
export const AppSegmentedControl: React.FC<AppSegmentedControlProps> = ({
  segments,
  selectedIndex = 0,
  onChange,
  disabled = false,
  containerStyle,
}) => {
  const normalizedSegments = segments.map((segment) => {
    if (typeof segment === 'string') {
      return { label: segment, value: segment }
    }
    return segment
  })

  const handlePress = (index: number) => {
    if (!disabled && onChange) {
      const value = normalizedSegments[index].value
      onChange(index, value)
    }
  }

  return (
    <ScrollView
      style={[styles.container, containerStyle]}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.scrollContainer}>
        {normalizedSegments.map((segment, index) => {
          const isSelected = index === selectedIndex

          return (
            <TouchableOpacity
              key={String(segment.value)}
              onPress={() => handlePress(index)}
              disabled={disabled}
              style={[
                styles.segment,
                isSelected && styles.segmentActive,
                disabled && styles.segmentDisabled,
              ]}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <View style={styles.segmentContent}>
                {segment.icon && (
                  <AppText style={styles.segmentIcon}>
                    {typeof segment.icon === 'string'
                      ? segment.icon
                      : segment.icon}
                  </AppText>
                )}
                <AppText
                  variant="label"
                  style={[
                    styles.segmentLabel,
                    isSelected
                      ? styles.segmentLabelActive
                      : styles.segmentLabelInactive,
                  ]}
                >
                  {segment.label}
                </AppText>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}

export default AppSegmentedControl
