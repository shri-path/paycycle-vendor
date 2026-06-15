/**
 * CreditRedemptionScreen (US-014)
 * Owner-only. Redeem vendor credits toward:
 *   1. Pay Subscription (live)
 *   2. Upgrade Plan (live)
 *   3. Cash Withdrawal (DISABLED in v1 — rendered as coming-soon card)
 *
 * Blocks with a retry message if subscription nextBillingDate is unavailable.
 * Amount sent from the subscription store (nextDue amount or plan upgrade delta).
 */

import React, { useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { Ionicons } from '@expo/vector-icons'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useReferralStore } from '../store/referral.store'
import { useSubscriptionStore } from '@modules/subscription/store/subscription.store'
import { RedemptionOptionCard, WithdrawalThresholdNotice } from '../components'

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  balanceRow: { marginBottom: spacing[4], alignItems: 'center' },
  section: { marginBottom: spacing[2] },
})

function CreditRedemptionContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { creditBalance, isBalanceLoading, balanceError, isMutating, mutationError, fetchCreditBalance, redeemCredits, clearErrors } =
    useReferralStore(
      useShallow((s) => ({
        creditBalance: s.creditBalance,
        isBalanceLoading: s.isBalanceLoading,
        balanceError: s.balanceError,
        isMutating: s.isMutating,
        mutationError: s.mutationError,
        fetchCreditBalance: s.fetchCreditBalance,
        redeemCredits: s.redeemCredits,
        clearErrors: s.clearErrors,
      })),
    )

  // Read subscription data for amount derivation (lazy — may not be loaded)
  const currentSubscription = useSubscriptionStore((s) => s.currentSubscription)
  const plans = useSubscriptionStore((s) => s.plans)

  useEffect(() => {
    void fetchCreditBalance()
    return () => clearErrors()
  }, [fetchCreditBalance, clearErrors])

  // Derive amounts from subscription store
  const nextDueAmount = currentSubscription?.currentPlan?.nextBillingDate
    ? (() => {
        const plan = plans.find((p) => p.id === currentSubscription.currentPlan.planId)
        return plan ? (currentSubscription.currentPlan.billingCycle === 'MONTHLY' ? plan.priceMonthly : (plan.priceYearly ?? plan.priceMonthly * 12)) : null
      })()
    : null

  const handleRedeemSubscription = useCallback(async () => {
    if (!nextDueAmount) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    try {
      await redeemCredits({ redemptionType: 'subscription', amount: nextDueAmount })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [nextDueAmount, redeemCredits, router])

  const handleRedeemUpgrade = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/subscription' as Href)
  }, [router])

  if (isBalanceLoading && !creditBalance) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.redeem.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (balanceError && !creditBalance) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.redeem.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('referral.redeem.error_load')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchCreditBalance()}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <AppHeader title={t('referral.redeem.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_writes_disabled')} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={s.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} onClose={clearErrors} />
        </View>
      ) : null}

      {!nextDueAmount ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('referral.redeem.subscription_unavailable_title')} message={t('referral.redeem.subscription_unavailable_desc')} />
        </View>
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {creditBalance ? (
          <>
            <View style={s.balanceRow}>
              <AppText variant="caption" color={colors.textSecondary}>{t('referral.redeem.available_balance')}</AppText>
              <AppText variant="h2" weight="bold" color={colors.success} testID="redeem-balance-value">
                {formatCurrency(creditBalance.availableCredits)}
              </AppText>
            </View>

            <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.section}>
              {t('referral.redeem.options_title')}
            </AppText>

            {/* Pay Subscription (LIVE) */}
            <RedemptionOptionCard
              titleKey="referral.redeem.subscription_title"
              descriptionKey="referral.redeem.subscription_desc"
              amountLabel={nextDueAmount ? formatCurrency(nextDueAmount) : t('referral.redeem.amount_unavailable')}
              iconName="card-outline"
              disabled={!isConnected || isMutating || !nextDueAmount}
              onPress={() => void handleRedeemSubscription()}
              testID="redeem-subscription-card"
            />

            {/* Upgrade Plan (LIVE — navigates to subscription screen) */}
            <RedemptionOptionCard
              titleKey="referral.redeem.upgrade_title"
              descriptionKey="referral.redeem.upgrade_desc"
              amountLabel={t('referral.redeem.upgrade_amount_label')}
              iconName="rocket-outline"
              disabled={!isConnected || isMutating}
              onPress={handleRedeemUpgrade}
              testID="redeem-upgrade-card"
            />

            {/* Cash Withdrawal — DISABLED in v1 */}
            <RedemptionOptionCard
              titleKey="referral.redeem.withdrawal_title"
              descriptionKey="referral.redeem.withdrawal_desc"
              amountLabel={t('referral.redeem.withdrawal_coming_soon_label')}
              iconName="cash-outline"
              disabled
              comingSoon
              testID="redeem-withdrawal-card"
            />

            <WithdrawalThresholdNotice minimumAmount={creditBalance.withdrawalMinimum} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function CreditRedemptionScreen() {
  return (
    <ScreenErrorBoundary>
      <CreditRedemptionContent />
    </ScreenErrorBoundary>
  )
}

CreditRedemptionScreen.displayName = 'CreditRedemptionScreen'
