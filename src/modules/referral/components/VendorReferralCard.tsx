/**
 * VendorReferralCard (US-014)
 * List item for a single vendor referral — name, status badge, customer count,
 * earnings, and next milestone (or "All milestones done!" when null).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { DashboardVendorReferral, ReferralStatus } from '../../../types/referral'
import type { BadgeVariant } from '@components/primitives/AppBadge'

export interface VendorReferralCardProps {
  referral: DashboardVendorReferral
  testID?: string
}


const STATUS_VARIANT: Record<ReferralStatus, BadgeVariant> = {
  PENDING: 'warning',
  SIGNED_UP: 'primary',
  QUALIFIED: 'primary',
  REWARDED: 'success',
}

const s = StyleSheet.create({
  card: { padding: spacing[3], marginBottom: spacing[2] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  stat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  milestone: { marginTop: spacing[2], padding: spacing[2], backgroundColor: colors.gray50, borderRadius: 6 },
})

function VendorReferralCardInner({ referral, testID }: VendorReferralCardProps) {
  const { t } = useTranslation()
  return (
    <AppCard style={s.card} testID={testID ?? `vendor-referral-card-${referral.id}`}>
      <View style={s.header}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary}>{referral.referredVendorName}</AppText>
        <AppBadge
          label={t(`referral.dashboard.status_${referral.status.toLowerCase()}`)}
          variant={STATUS_VARIANT[referral.status]}
        />
      </View>
      <View style={s.stat}>
        <AppText variant="caption" color={colors.textSecondary}>{t('referral.dashboard.customers')}</AppText>
        <AppText variant="caption" weight="semibold" color={colors.textPrimary}>{referral.customerCount}</AppText>
      </View>
      <View style={s.stat}>
        <AppText variant="caption" color={colors.textSecondary}>{t('referral.dashboard.earned')}</AppText>
        <AppText variant="caption" weight="semibold" color={colors.primary}>{formatCurrency(referral.earned.total)}</AppText>
      </View>
      {referral.nextMilestone ? (
        <View style={s.milestone}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('referral.dashboard.next_milestone', {
              target: referral.nextMilestone.target,
              reward: formatCurrency(referral.nextMilestone.reward),
            })}
          </AppText>
        </View>
      ) : (
        <View style={s.milestone}>
          <AppText variant="caption" color={colors.success}>{t('referral.dashboard.all_milestones_done')}</AppText>
        </View>
      )}
    </AppCard>
  )
}

export const VendorReferralCard = React.memo(VendorReferralCardInner)
VendorReferralCard.displayName = 'VendorReferralCard'
export default VendorReferralCard
