/**
 * UpgradePlanScreen — Owner-only (US-009, FEATURE_PLAN §4.2).
 * Purpose: Lists higher-tier plans for the owner to upgrade to.
 * Billing-cycle toggle (Monthly/Yearly). Confirm upgrade → toast + navigate back.
 *
 * Higher-tier-only filter: shows plans with priceMonthly > current plan's priceMonthly.
 * Plans are sorted ascending (Starter → Growth → Pro) per the catalog order.
 * Payment is stubbed: success → toast "Payment integration coming soon" + back.
 * 422 → inline error_not_higher_tier. Online-only.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useSubscriptionStore } from '../store/subscription.store'
import { PlanCard } from '../components'
import type { BillingCycle } from '../../../types/subscription'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  currentPlanRow: { marginBottom: spacing[3] },
  toggleContainer: { marginBottom: spacing[4] },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function UpgradePlanScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const [billingCycleIndex, setBillingCycleIndex] = useState(0)
  const billingCycle: BillingCycle = billingCycleIndex === 1 ? 'YEARLY' : 'MONTHLY'

  const {
    plans,
    isPlansLoading,
    plansError,
    currentSubscription,
    isSubLoading,
    mutationError,
    fetchPlans,
    fetchSubscription,
    upgrade,
    clearError,
  } = useSubscriptionStore(
    useShallow((s) => ({
      plans: s.plans,
      isPlansLoading: s.isPlansLoading,
      plansError: s.plansError,
      currentSubscription: s.currentSubscription,
      isSubLoading: s.isSubLoading,
      mutationError: s.mutationError,
      fetchPlans: s.fetchPlans,
      fetchSubscription: s.fetchSubscription,
      upgrade: s.upgrade,
      clearError: s.clearError,
    })),
  )

  useEffect(() => {
    void fetchPlans()
    if (!currentSubscription) void fetchSubscription()
    return () => clearError()
  }, [fetchPlans, fetchSubscription, currentSubscription, clearError])

  // Filter to plans with higher priceMonthly than current (strictly higher tier).
  const eligiblePlans = useMemo(() => {
    if (!currentSubscription || plans.length === 0) return []
    const currentPrice = currentSubscription.currentPlan.limits.maxCustomers === 0
      ? Infinity // already PRO — no upgrades
      : plans.find((p) => p.planCode === currentSubscription.currentPlan.planCode)?.priceMonthly ?? 0
    return plans.filter((p) => p.priceMonthly > currentPrice)
  }, [plans, currentSubscription])

  const handleSelect = useCallback(async (planId: string) => {
    if (!isConnected) return
    try {
      await upgrade(planId, billingCycle)
      Alert.alert(t('subscription.payment_coming_soon'))
      router.back()
    } catch {
      // Error shown via mutationError
    }
  }, [upgrade, billingCycle, isConnected, t, router])

  const isLoading = isPlansLoading || isSubLoading

  if (isLoading && plans.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title={t('subscription.upgrade_plan')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const cycleLabels = [t('subscription.monthly'), t('subscription.yearly')]

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title={t('subscription.upgrade_plan')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
      ) : null}

      {mutationError ? (
        <AppAlert
          type="error"
          title={t('common.error')}
          message={t(mutationError)}
          onClose={clearError}
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {currentSubscription ? (
          <View style={styles.currentPlanRow}>
            <AppText variant="body" color={colors.textSecondary}>
              {t('subscription.current_plan_label')}: {currentSubscription.currentPlan.planName}
            </AppText>
          </View>
        ) : null}

        <View style={styles.toggleContainer}>
          <AppSegmentedControl
            segments={cycleLabels}
            selectedIndex={billingCycleIndex}
            onChange={setBillingCycleIndex}
          />
        </View>

        {plansError ? (
          <AppAlert type="error" title={t('common.error')} message={t(plansError)} onClose={clearError} />
        ) : null}

        {eligiblePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrent={false}
            onSelect={(id) => void handleSelect(id)}
          />
        ))}

        {!isLoading && eligiblePlans.length === 0 && !plansError ? (
          <AppText variant="body" color={colors.textSecondary}>
            {t('subscription.current_plan_label')} — {t('subscription.plan_pro')}
          </AppText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function UpgradePlanScreen() {
  return (
    <ScreenErrorBoundary>
      <UpgradePlanScreenContent />
    </ScreenErrorBoundary>
  )
}

UpgradePlanScreen.displayName = 'UpgradePlanScreen'
