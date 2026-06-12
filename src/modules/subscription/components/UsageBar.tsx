/**
 * UsageBar — subscription module primitive (US-009).
 * Purpose: Shows resource usage as "X / Y" with a coloured progress bar.
 * When `max === 0` (unlimited): renders "X / Unlimited", NO bar (R3/R4).
 * Colour: green < 80%, orange 80–94%, red >= 95% (R5).
 * Presentational — receives all data via props; no store access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { isUnlimited, usageColor } from '../utils/usage'

export interface UsageBarProps {
  /** Localized resource label (e.g. "Customers"). */
  resourceLabel: string
  /** Current usage count. */
  used: number
  /** Max allowed (0 = unlimited). */
  max: number
  /** Utilization percentage (0–100). Server-computed; 0 for unlimited limits. */
  percent: number
}

const BAR_HEIGHT = 8

const styles = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  barBg: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.gray200,
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
})

export const UsageBar: React.FC<UsageBarProps> = ({ resourceLabel, used, max, percent }) => {
  const { t } = useTranslation()
  const unlimited = isUnlimited(max)
  const barColor = usageColor(percent)

  const usageLabel = unlimited
    ? `${used} / ${t('subscription.unlimited')}`
    : `${used} / ${max}`

  const clampedPercent = Math.min(100, Math.max(0, percent))

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${resourceLabel}: ${usageLabel}`}
    >
      <View style={styles.row}>
        <AppText variant="body" color={colors.textPrimary}>
          {resourceLabel}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {usageLabel}
        </AppText>
      </View>
      {!unlimited ? (
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              { width: `${clampedPercent}%`, backgroundColor: barColor },
            ]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: clampedPercent }}
            testID="usage-bar-fill"
          />
        </View>
      ) : null}
    </View>
  )
}

UsageBar.displayName = 'UsageBar'

export default UsageBar
