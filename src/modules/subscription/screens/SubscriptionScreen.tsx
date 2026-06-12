/**
 * SubscriptionScreen — Owner-only (US-009, FEATURE_PLAN §4.1).
 * Purpose: Current plan overview with usage bars, action buttons, and billing history.
 *
 * Sections top-to-bottom:
 * 1. CurrentPlanCard — plan name, limits, valid-till, status badge
 * 2. Usage — one UsageBar per resource (customers / supplyLists / staff)
 * 3. Actions — Upgrade (hidden on PRO), Renew, Auto-renewal toggle, Cancel
 * 4. Billing History — InvoiceRow FlatList with load-more
 *
 * States: loading / error / data (404 → error_no_subscription with Renew CTA)
 * All commands disabled offline. Cancel requires confirmation dialog.
 */

import React, { useCallback } from 'react'
import { View, FlatList, Alert, StyleSheet, Switch, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href, useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useSubscriptionStore } from '../store/subscription.store'
import {
  CurrentPlanCard,
  UsageBar,
  InvoiceRow,
} from '../components'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  section: { marginBottom: spacing[4] },
  sectionTitle: { marginBottom: spacing[2] },
  actionsSection: { marginBottom: spacing[4], gap: spacing[2] },
  autoRenewalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: spacing[2],
    marginBottom: spacing[2],
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing[2],
    overflow: 'hidden',
  },
  loadMoreContainer: { padding: spacing[3], alignItems: 'center' },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function SubscriptionScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    currentSubscription,
    isSubLoading,
    subError,
    invoices,
    invoicesMeta,
    isInvoicesLoading,
    isMutating,
    mutationError,
    fetchSubscription,
    fetchInvoices,
    renew,
    cancel,
    toggleAutoRenewal,
    clearError,
  } = useSubscriptionStore(
    useShallow((s) => ({
      currentSubscription: s.currentSubscription,
      isSubLoading: s.isSubLoading,
      subError: s.subError,
      invoices: s.invoices,
      invoicesMeta: s.invoicesMeta,
      isInvoicesLoading: s.isInvoicesLoading,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      fetchSubscription: s.fetchSubscription,
      fetchInvoices: s.fetchInvoices,
      renew: s.renew,
      cancel: s.cancel,
      toggleAutoRenewal: s.toggleAutoRenewal,
      clearError: s.clearError,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchSubscription()
      void fetchInvoices({ page: 1 })
      return () => clearError()
    }, [fetchSubscription, fetchInvoices, clearError]),
  )

  const handleRenew = useCallback(async () => {
    if (!currentSubscription || !isConnected) return
    try {
      await renew(currentSubscription.currentPlan.billingCycle)
    } catch {
      // Error shown via mutationError
    }
  }, [currentSubscription, renew, isConnected])

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('subscription.confirm_cancel_title'),
      t('subscription.confirm_cancel_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel()
            } catch {
              // Error shown via mutationError
            }
          },
        },
      ],
    )
  }, [t, cancel])

  const handleToggleAutoRenewal = useCallback(async (value: boolean) => {
    if (!isConnected) return
    try {
      await toggleAutoRenewal(value)
    } catch {
      // Rollback handled in store; error shown via mutationError
    }
  }, [toggleAutoRenewal, isConnected])

  const handleLoadMore = useCallback(() => {
    if (!invoicesMeta) return
    if (invoicesMeta.page >= invoicesMeta.totalPages) return
    void fetchInvoices({ page: invoicesMeta.page + 1 })
  }, [invoicesMeta, fetchInvoices])

  if (isSubLoading && !currentSubscription) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title={t('subscription.title')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (subError && !currentSubscription) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title={t('subscription.title')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(subError)}
            onClose={clearError}
          />
          {subError === 'subscription.error_no_subscription' ? (
            <AppButton
              label={t('subscription.renew')}
              onPress={() => void handleRenew()}
              variant="primary"
              fullWidth
              disabled={!isConnected}
            />
          ) : (
            <AppButton
              label={t('common.retry')}
              onPress={() => void fetchSubscription()}
              variant="secondary"
              fullWidth
            />
          )}
        </View>
      </SafeAreaView>
    )
  }

  if (!currentSubscription) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title={t('subscription.title')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const { currentPlan, usage, utilizationPercentage } = currentSubscription
  const isPro = currentPlan.planCode === 'PRO'
  const isExpired = currentPlan.status === 'EXPIRED'

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title={t('subscription.title')} showBack onBackPress={() => router.back()} />

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

      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {/* 1. Current Plan Card */}
            <CurrentPlanCard currentPlan={currentPlan} />

            {/* 2. Usage Bars */}
            <View style={styles.section}>
              <AppText variant="body" weight="medium" color={colors.textPrimary} style={styles.sectionTitle}>
                {t('subscription.usage')}
              </AppText>
              <UsageBar
                resourceLabel={t('subscription.customers')}
                used={usage.customers}
                max={currentPlan.limits.maxCustomers}
                percent={utilizationPercentage.customers}
              />
              <UsageBar
                resourceLabel={t('subscription.staff')}
                used={usage.staff}
                max={currentPlan.limits.maxStaff}
                percent={utilizationPercentage.staff}
              />
              <UsageBar
                resourceLabel={t('subscription.supply_lists')}
                used={usage.supplyLists}
                max={currentPlan.limits.maxSupplyLists}
                percent={utilizationPercentage.supplyLists}
              />
            </View>

            {/* 3. Actions */}
            <View style={styles.actionsSection}>
              {!isPro ? (
                <AppButton
                  label={t('subscription.upgrade_plan')}
                  onPress={() => router.push('/(app)/subscription/upgrade' as Href)}
                  variant="primary"
                  fullWidth
                  testID="upgrade-btn"
                />
              ) : null}

              <AppButton
                label={t('subscription.renew')}
                onPress={() => void handleRenew()}
                variant="secondary"
                fullWidth
                disabled={isMutating || !isConnected}
                loading={isMutating}
                testID="renew-btn"
              />

              {!isExpired ? (
                <View style={styles.autoRenewalRow}>
                  <AppText variant="body" color={colors.textPrimary}>
                    {t('subscription.manage_auto_renewal')}
                  </AppText>
                  <Switch
                    value={currentPlan.autoRenewal}
                    onValueChange={(value) => void handleToggleAutoRenewal(value)}
                    disabled={!isConnected || isMutating}
                    thumbColor={currentPlan.autoRenewal ? colors.primary : colors.gray400}
                    trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                    testID="auto-renewal-switch"
                  />
                </View>
              ) : null}

              {currentPlan.status !== 'CANCELLED' && currentPlan.status !== 'EXPIRED' ? (
                <AppButton
                  label={t('subscription.confirm_cancel_title')}
                  onPress={handleCancel}
                  variant="ghost"
                  fullWidth
                  disabled={isMutating || !isConnected}
                  testID="cancel-btn"
                />
              ) : null}
            </View>

            {/* 4. Billing History header */}
            <AppText variant="body" weight="medium" color={colors.textPrimary} style={styles.sectionTitle}>
              {t('subscription.billing_history')}
            </AppText>
          </>
        }
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <InvoiceRow
              invoice={item}
              onPress={(id) => router.push(`/(app)/subscription/invoices/${id}` as Href)}
            />
          </View>
        )}
        ListFooterComponent={
          invoicesMeta && invoicesMeta.page < invoicesMeta.totalPages ? (
            <View style={styles.loadMoreContainer}>
              <AppButton
                label={isInvoicesLoading ? t('common.loading') : t('common.retry')}
                onPress={handleLoadMore}
                variant="secondary"
                disabled={isInvoicesLoading}
                testID="load-more-btn"
              />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

export default function SubscriptionScreen() {
  return (
    <ScreenErrorBoundary>
      <SubscriptionScreenContent />
    </ScreenErrorBoundary>
  )
}

SubscriptionScreen.displayName = 'SubscriptionScreen'
