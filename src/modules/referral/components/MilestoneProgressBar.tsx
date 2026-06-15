/**
 * MilestoneProgressBar (US-014)
 * Visual progress bar toward the next milestone.
 * When nextMilestone is null (all done), shows "All milestones achieved!" state.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { NextMilestoneDto } from '../../../types/referral'

export interface MilestoneProgressBarProps {
  nextMilestone: NextMilestoneDto | null
  currentCustomers: number
  testID?: string
}

const s = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  track: { height: 8, backgroundColor: colors.gray100, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  done: { alignItems: 'center', paddingVertical: spacing[2] },
})

function MilestoneProgressBarInner({ nextMilestone, currentCustomers, testID }: MilestoneProgressBarProps) {
  const { t } = useTranslation()

  if (!nextMilestone) {
    return (
      <View style={s.done} testID={testID ?? 'milestone-progress-bar'}>
        <AppText variant="body" weight="semibold" color={colors.success}>
          {t('referral.dashboard.all_milestones_achieved')}
        </AppText>
      </View>
    )
  }

  const progress = Math.min(1, nextMilestone.progress / nextMilestone.target)

  return (
    <View style={s.container} testID={testID ?? 'milestone-progress-bar'}>
      <View style={s.row}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('referral.dashboard.milestone_progress', {
            current: currentCustomers,
            target: nextMilestone.target,
          })}
        </AppText>
        <AppText variant="caption" weight="semibold" color={colors.primary}>
          {t('referral.dashboard.milestone_reward', { reward: formatCurrency(nextMilestone.reward) })}
        </AppText>
      </View>
      <View style={s.track} testID="milestone-track">
        <View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} testID="milestone-fill" />
      </View>
    </View>
  )
}

export const MilestoneProgressBar = React.memo(MilestoneProgressBarInner)
MilestoneProgressBar.displayName = 'MilestoneProgressBar'
export default MilestoneProgressBar
