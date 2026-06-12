/**
 * PlanCard — subscription module component (US-009).
 * Purpose: Displays a single plan in the upgrade screen.
 * Shows plan name, price for the selected billing cycle, feature list,
 * and a "Select Plan" / "Current Plan" button.
 * Yearly price is hidden if `priceYearly` is null.
 * Presentational — receives all data via props; no store access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing } from '@constants/tokens'
import type { PlanDto, BillingCycle } from '../../../types/subscription'

export interface PlanCardProps {
  plan: PlanDto
  billingCycle: BillingCycle
  isCurrent: boolean
  onSelect: (planId: string) => void
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing[3],
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  currentCard: {
    borderColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  priceRow: { marginBottom: spacing[3] },
  featuresSection: { marginBottom: spacing[3] },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: spacing[2],
  },
})

export const PlanCard: React.FC<PlanCardProps> = ({ plan, billingCycle, isCurrent, onSelect }) => {
  const { t } = useTranslation()

  const price =
    billingCycle === 'YEARLY' && plan.priceYearly != null
      ? plan.priceYearly
      : plan.priceMonthly

  const priceSuffix =
    billingCycle === 'YEARLY' && plan.priceYearly != null
      ? t('subscription.per_year')
      : t('subscription.per_month')

  const enabledFeatures = Object.entries(plan.features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)

  return (
    <View style={[styles.card, isCurrent && styles.currentCard]}>
      <View style={styles.header}>
        <AppText variant="h3" weight="bold" color={colors.textPrimary}>
          {plan.planName}
        </AppText>
        {isCurrent ? (
          <AppText variant="caption" color={colors.primary} weight="medium">
            {t('subscription.current_plan_label')}
          </AppText>
        ) : null}
      </View>

      <View style={styles.priceRow}>
        <AppText variant="h2" weight="bold" color={colors.primary}>
          {price === 0 ? t('common.free', { defaultValue: 'Free' }) : formatCurrency(price)}
          <AppText variant="body" color={colors.textSecondary}>
            {price > 0 ? priceSuffix : ''}
          </AppText>
        </AppText>
        {billingCycle === 'MONTHLY' && plan.priceYearly != null ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {formatCurrency(plan.priceYearly)}{t('subscription.per_year')}
          </AppText>
        ) : null}
      </View>

      <View style={styles.featuresSection}>
        {enabledFeatures.map((key) => (
          <View key={key} style={styles.featureRow}>
            <View style={styles.featureDot} />
            <AppText variant="caption" color={colors.textSecondary}>
              {t(`subscription.feature_${key}` as string)}
            </AppText>
          </View>
        ))}
      </View>

      <AppButton
        label={isCurrent ? t('subscription.current_plan_label') : t('subscription.select_plan')}
        onPress={() => !isCurrent && onSelect(plan.id)}
        variant={isCurrent ? 'secondary' : 'primary'}
        fullWidth
        disabled={isCurrent}
        testID={`plan-select-${plan.planCode}`}
      />
    </View>
  )
}

PlanCard.displayName = 'PlanCard'

export default PlanCard
