/**
 * StaffMultiSelect — supply-lists module composite (US-005, WS-3 / OQ-2).
 * Purpose: LOCAL assign-staff picker for the Supply-List detail bottom sheet. Lists the
 * vendor's staff with a checkbox to assign/unassign each one to the current list, plus a
 * "Primary" toggle on assigned rows. This is the LIST-SIDE source of truth for staff↔list
 * assignment (OQ-2): it drives `POST/DELETE /supply-lists/:listId/staff[/:staffId]`.
 *
 * Presentational: the screen owns fetching staff + current assignments and the store
 * mutations. This component receives options + the assigned set + the primary id and emits
 * `onToggleAssign(staffId, nextAssigned)` and `onSetPrimary(staffId)`. It handles its own
 * loading skeleton and empty state. Tokens only; every string via t(); color is never the
 * only signal (primary pairs a labelled badge with the checkbox); ≥44×44 row targets.
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { AppButton } from '@components/primitives/AppButton'
import { AppLoader } from '@components/primitives/AppLoader'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, interaction } from '@constants/tokens'

/** A staff candidate the owner can assign to the list. */
export interface StaffOption {
  staffId: string
  name: string | null
}

export interface StaffMultiSelectProps {
  /** Vendor staff that can be assigned. */
  options: StaffOption[]
  /** Currently-assigned staff ids. */
  assignedIds: string[]
  /** The current primary staff id (if any). */
  primaryStaffId?: string | null
  /** Called when a row is toggled: (staffId, nextAssigned). */
  onToggleAssign: (staffId: string, nextAssigned: boolean) => void
  /** Called to mark an assigned staff member as primary. */
  onSetPrimary: (staffId: string) => void
  /** Disable all actions (offline / in-flight). */
  disabled?: boolean
  /** Show a loading skeleton while options load. */
  isLoading?: boolean
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  empty: {
    paddingVertical: spacing[3],
  },
})

const StaffMultiSelectComponent: React.FC<StaffMultiSelectProps> = ({
  options,
  assignedIds,
  primaryStaffId,
  onToggleAssign,
  onSetPrimary,
  disabled = false,
  isLoading = false,
  testID,
}) => {
  const { t } = useTranslation()

  const toggle = useCallback(
    (staffId: string, nextAssigned: boolean) => {
      if (disabled) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onToggleAssign(staffId, nextAssigned)
    },
    [disabled, onToggleAssign],
  )

  const setPrimary = useCallback(
    (staffId: string) => {
      if (disabled) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onSetPrimary(staffId)
    },
    [disabled, onSetPrimary],
  )

  if (isLoading) {
    return (
      <View style={styles.container} testID={testID ? `${testID}-loading` : undefined}>
        <AppLoader />
      </View>
    )
  }

  if (options.length === 0) {
    return (
      <View style={styles.empty} testID={testID ? `${testID}-empty` : undefined}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('supply.unassigned')}
        </AppText>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const checked = assignedIds.includes(opt.staffId)
        const isPrimary = primaryStaffId === opt.staffId
        const name = opt.name ?? t('supply.unnamed_customer')
        return (
          <View key={opt.staffId} style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => toggle(opt.staffId, !checked)}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled }}
              accessibilityLabel={name}
              testID={testID ? `${testID}-${opt.staffId}` : undefined}
            >
              {/* Visual indicator only — the Pressable row owns the toggle so the whole
                  44px row is the touch target and onChange never double-fires. */}
              <AppCheckbox label={name} checked={checked} />
            </Pressable>
            {checked ? (
              isPrimary ? (
                <AppBadge label={t('supply.primary_staff')} variant="primary" size="sm" />
              ) : (
                <AppButton
                  label={t('supply.primary_staff')}
                  variant="link"
                  onPress={() => setPrimary(opt.staffId)}
                  disabled={disabled}
                  testID={testID ? `${testID}-primary-${opt.staffId}` : undefined}
                />
              )
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

StaffMultiSelectComponent.displayName = 'StaffMultiSelect'

export const StaffMultiSelect = React.memo(StaffMultiSelectComponent)

export default StaffMultiSelect
