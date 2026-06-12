/**
 * ActivitySummaryStat — a single labelled count tile (US-007 My Activity).
 * Renders a large count over a caption label. Pure + memoized.
 */

import React, { memo } from 'react'
import { StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { colors, spacing } from '@constants/tokens'

export interface ActivitySummaryStatProps {
  label: string
  value: number
  testID?: string
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', paddingVertical: spacing[3] },
  value: { marginBottom: spacing[1] },
})

function ActivitySummaryStatComponent({ label, value, testID }: ActivitySummaryStatProps) {
  return (
    <AppCard variant="flat" style={styles.card} testID={testID}>
      <AppText variant="h3" weight="bold" color={colors.primary} style={styles.value}>
        {String(value)}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </AppCard>
  )
}

export const ActivitySummaryStat = memo(ActivitySummaryStatComponent)
ActivitySummaryStat.displayName = 'ActivitySummaryStat'

export default ActivitySummaryStat
