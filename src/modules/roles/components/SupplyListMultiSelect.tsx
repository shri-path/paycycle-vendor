/**
 * SupplyListMultiSelect — roles module composite (US-002, OQ-6).
 * Purpose: Checkbox list to assign a staff member to zero-or-more supply lists.
 * Used inline on Invite and inside a bottom sheet on Staff Detail.
 *
 * OQ-6 dependency risk: options are sourced from the backend list-assignment STUB
 * until US-005 ships the real supply-list service. The SupplyListOptionDto shape
 * may change then.
 *
 * Presentational: receives options + value + onChange; the screen owns fetching.
 * Handles its own loading skeleton and empty state.
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppText } from '@components/primitives/AppText'
import { AppLoader } from '@components/primitives/AppLoader'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, interaction } from '@constants/tokens'
import type { SupplyListOptionDto } from '../../../types/roles'

export interface SupplyListMultiSelectProps {
  /** Available supply-list options (stub-backed until US-005). */
  options: SupplyListOptionDto[]
  /** Currently selected list ids. */
  value: string[]
  /** Called with the next selected ids when a row is toggled. */
  onChange: (next: string[]) => void
  /** Show a loading skeleton while options load. */
  isLoading?: boolean
  /**
   * Render the selected lists as a non-interactive display (no toggling).
   * Staff-side list assignment is now managed from the supply-list detail screen
   * (US-005, OQ-2), so the roles module shows this read-only.
   *
   * RESERVED: no caller wires this yet — it is kept for the planned read-only
   * Staff Detail "assigned lists" view. Covered by the readOnly-mode tests.
   */
  readOnly?: boolean
  /** Test ID prefix. */
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
    minHeight: interaction.minTouchTarget,
  },
  row: {
    minHeight: interaction.minTouchTarget,
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: spacing[3],
  },
})

export const SupplyListMultiSelect: React.FC<SupplyListMultiSelectProps> = ({
  options,
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  testID,
}) => {
  const { t } = useTranslation()

  const toggle = useCallback(
    (listId: string, checked: boolean) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const next = checked
        ? Array.from(new Set([...value, listId]))
        : value.filter((id) => id !== listId)
      onChange(next)
    },
    [value, onChange],
  )

  if (isLoading) {
    return (
      <View style={styles.container} testID={testID ? `${testID}-loading` : undefined}>
        <AppLoader />
      </View>
    )
  }

  // Read-only display (US-005, OQ-2): show only the assigned lists, non-interactive.
  if (readOnly) {
    const selected = options.filter((opt) => value.includes(opt.listId))
    if (selected.length === 0) {
      return (
        <View style={styles.empty} testID={testID ? `${testID}-empty` : undefined}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('roles.no_lists_assigned')}
          </AppText>
        </View>
      )
    }
    return (
      <View style={styles.container}>
        {selected.map((opt) => (
          <View
            key={opt.listId}
            style={styles.row}
            accessibilityRole="text"
            accessibilityState={{ disabled: true }}
            accessibilityLabel={opt.name}
            testID={testID ? `${testID}-${opt.listId}` : undefined}
          >
            <AppCheckbox label={opt.name} checked disabled />
          </View>
        ))}
      </View>
    )
  }

  if (options.length === 0) {
    return (
      <View style={styles.empty} testID={testID ? `${testID}-empty` : undefined}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('roles.no_supply_lists')}
        </AppText>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const checked = value.includes(opt.listId)
        return (
          <Pressable
            key={opt.listId}
            style={styles.row}
            onPress={() => toggle(opt.listId, !checked)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={opt.name}
            testID={testID ? `${testID}-${opt.listId}` : undefined}
          >
            {/* Visual indicator only — the Pressable row owns the toggle so the
                whole 44px row is the touch target and onChange never double-fires. */}
            <AppCheckbox label={opt.name} checked={checked} />
          </Pressable>
        )
      })}
    </View>
  )
}

export default SupplyListMultiSelect
