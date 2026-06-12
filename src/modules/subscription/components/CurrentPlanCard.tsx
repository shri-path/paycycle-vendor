/**
 * CurrentPlanCard — subscription module component (US-009).
 * Purpose: Displays the active plan name, resource limits, valid-till date,
 * and subscription status badge. When `status === CANCELLED`, shows
 * "Active until {date}" via the badge's sublabel.
 * Uses `nextBillingDate` as the "Valid till" date; falls back to `endDate` if set.
 * Presentational — receives `currentPlan` via props; no store access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { formatLocaleDate } from '@utils/formatDate'
import { colors, spacing } from '@constants/tokens'
import { isUnlimited } from '../utils/usage'
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge'
import type { CurrentPlanDto } from '../../../types/subscription'
import type { TranslationParams } from '@locales/index'

type TFunc = (key: string, params?: TranslationParams | string, defaultValue?: string) => string

export interface CurrentPlanCardProps {
  currentPlan: CurrentPlanDto
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing[3],
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  planName: { flex: 1 },
  limitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  limitChip: {
    backgroundColor: colors.gray100,
    borderRadius: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  validTill: { marginTop: spacing[2] },
})

function limitLabel(t: TFunc, value: number): string {
  return isUnlimited(value)
    ? t('subscription.unlimited')
    : t('subscription.up_to', { n: value })
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({ currentPlan }) => {
  const { t } = useTranslation()
  const { planName, status, limits, nextBillingDate, endDate } = currentPlan

  const validTillDate = endDate ?? nextBillingDate

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText
          variant="h2"
          weight="bold"
          color={colors.primary}
          style={styles.planName}
          numberOfLines={1}
        >
          {planName}
        </AppText>
        <SubscriptionStatusBadge
          status={status}
          activeUntil={status === 'CANCELLED' ? nextBillingDate : null}
        />
      </View>

      <View style={styles.limitsRow}>
        <View style={styles.limitChip}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('subscription.customers')}: {limitLabel(t, limits.maxCustomers)}
          </AppText>
        </View>
        <View style={styles.limitChip}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('subscription.staff')}: {limitLabel(t, limits.maxStaff)}
          </AppText>
        </View>
        <View style={styles.limitChip}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('subscription.supply_lists')}: {limitLabel(t, limits.maxSupplyLists)}
          </AppText>
        </View>
      </View>

      <AppText variant="caption" color={colors.textSecondary} style={styles.validTill}>
        {t('subscription.valid_till', { date: formatLocaleDate(validTillDate) })}
      </AppText>
    </View>
  )
}

CurrentPlanCard.displayName = 'CurrentPlanCard'

export default CurrentPlanCard
