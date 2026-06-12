/**
 * AutoMarkToggleRow (US-010)
 * Purpose: Row with AppToggle for the auto-mark feature toggle.
 * Disabled when offline (writes are online-only) or when another update is in flight.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppToggle } from '@components/primitives/AppToggle'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface AutoMarkToggleRowProps {
  enabled: boolean
  conflictsCount: number
  disabled?: boolean
  onToggle: (next: boolean) => void
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1, gap: spacing[1] },
  conflictsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
})

export const AutoMarkToggleRow: React.FC<AutoMarkToggleRowProps> = ({
  enabled,
  conflictsCount,
  disabled = false,
  onToggle,
}) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID="auto-mark-toggle-row">
      <View style={styles.left}>
        <AppText variant="body" weight="medium" color={colors.textPrimary}>
          {t('dashboard.auto_mark')}
        </AppText>
        {conflictsCount > 0 ? (
          <View style={styles.conflictsRow}>
            <AppText variant="caption" color={colors.error}>
              {t('dashboard.conflicts_today', { count: conflictsCount })}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppToggle
        value={enabled}
        onChange={onToggle}
        disabled={disabled}
      />
    </AppCard>
  )
}

export default AutoMarkToggleRow
