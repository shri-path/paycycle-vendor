/**
 * PermissionToggleList — roles module composite (US-002).
 * Purpose: Edit/display the three staff permission grants. Built on AppCheckbox.
 * Usage: <PermissionToggleList value={perms} onChange={setPerms} editable />
 *
 * Presentational: receives value + onChange; the screen owns the store call.
 * Each row is a switch for a screen reader (accessibilityRole="switch").
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { useTranslation } from '@hooks/useTranslation'
import { spacing, interaction } from '@constants/tokens'
import type { PermissionKey } from '../../../types/roles'

export interface PermissionToggleListProps {
  /** Currently granted permissions. */
  value: PermissionKey[]
  /** Called with the next permission set when a row is toggled. */
  onChange: (next: PermissionKey[]) => void
  /** When false, rows render disabled (read-only). */
  editable: boolean
  /** Test ID prefix for the rows. */
  testID?: string
}

const ALL_PERMISSIONS: PermissionKey[] = [
  'mark_deliveries',
  'mark_leaves',
  'add_extra_charges',
]

const LABEL_KEYS: Record<PermissionKey, string> = {
  mark_deliveries: 'roles.perm_mark_deliveries',
  mark_leaves: 'roles.perm_mark_leaves',
  add_extra_charges: 'roles.perm_add_extra_charges',
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  row: {
    minHeight: interaction.minTouchTarget,
    justifyContent: 'center',
  },
})

export const PermissionToggleList: React.FC<PermissionToggleListProps> = ({
  value,
  onChange,
  editable,
  testID,
}) => {
  const { t } = useTranslation()

  const toggle = useCallback(
    (key: PermissionKey, checked: boolean) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const next = checked
        ? Array.from(new Set([...value, key]))
        : value.filter((k) => k !== key)
      onChange(next)
    },
    [value, onChange],
  )

  return (
    <View style={styles.container}>
      {ALL_PERMISSIONS.map((key) => {
        const checked = value.includes(key)
        const label = t(LABEL_KEYS[key])
        return (
          <Pressable
            key={key}
            style={styles.row}
            onPress={editable ? () => toggle(key, !checked) : undefined}
            disabled={!editable}
            accessibilityRole="switch"
            accessibilityState={{ checked, disabled: !editable }}
            accessibilityLabel={label}
            testID={testID ? `${testID}-${key}` : undefined}
          >
            {/* Visual indicator only — the Pressable row owns the toggle so the
                whole 44px row is the touch target (a11y) and onChange never
                double-fires. */}
            <AppCheckbox label={label} checked={checked} disabled={!editable} />
          </Pressable>
        )
      })}
    </View>
  )
}

export default PermissionToggleList
