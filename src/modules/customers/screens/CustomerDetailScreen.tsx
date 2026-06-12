/**
 * CustomerDetailScreen — Owner + staff (US-008, FEATURE_PLAN §3.4, wireframe 2.10).
 * Purpose: Full customer detail view. Both owner and staff reach this screen;
 * the server withholds financial fields for staff (they arrive as null).
 *
 * Owner-only sections / actions:
 *   - CreditPaymentCard (rendered only when currentBalance !== null)
 *   - MonthlyBillCard   (rendered only when currentMonthBill !== null)
 *   - [+ Add to Another List] button
 *   - Record Payment, Set Credit Limit action buttons
 *   - [:] overflow menu: Edit, Deactivate (with AppConfirmDialog)
 *
 * Both roles see:
 *   - CustomerProfileHeader
 *   - SubscriptionRow list
 *   - View Calendar action
 *
 * OQ-5: The full bill breakdown is lazily fetched via fetchBill(id, month) on mount
 *       for owners (currentMonthBill in the detail payload provides the summary).
 * OQ-6: "Share on WhatsApp" is rendered disabled (deferred this iteration).
 *
 * 5 states: Loading skeleton / Error / Not-found / Content / Offline (cached shown).
 *
 * Security: vendorId JWT-derived in the store. Owner actions use RoleGate + double-check.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppIconButton } from '@components/primitives/AppIconButton'
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { AppBottomSheet } from '@components/composite/AppBottomSheet'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { AppMenuItem } from '@components/composite/AppMenuItem'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { RoleGate } from '@components/composite/RoleGate'
import {
  CustomerProfileHeader,
  CreditPaymentCard,
  MonthlyBillCard,
  SubscriptionRow,
} from '../components'
import { useCustomersStore } from '../store/customers.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'

/** Format YYYY-MM from a JS Date (current month). */
function currentMonth(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing[24] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  skeletonHeader: { height: 160, marginHorizontal: spacing[4], marginTop: spacing[3], backgroundColor: colors.gray100 },
  skeletonCard: { height: 96, marginHorizontal: spacing[4], marginTop: spacing[3], backgroundColor: colors.gray100 },
  section: { paddingHorizontal: spacing[4] },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
  },
  overflowActions: {
    gap: spacing[2],
  },
})

function DetailSkeleton() {
  return (
    <View testID="customer-detail-skeleton">
      <AppCard variant="flat" style={styles.skeletonHeader}><View /></AppCard>
      <AppCard variant="flat" style={styles.skeletonCard}><View /></AppCard>
      <AppCard variant="flat" style={styles.skeletonCard}><View /></AppCard>
    </View>
  )
}

function CustomerDetailScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const { isOwner } = useRole()

  const params = useLocalSearchParams<{ customerId: string }>()
  const customerId = params.customerId

  const {
    detail,
    bill,
    isDetailLoading,
    detailError,
    isMutating,
    mutationError,
    fetchCustomer,
    fetchBill,
    removeSubscription,
    deactivateCustomer,
    clearError,
  } = useCustomersStore(
    useShallow((s) => ({
      detail: s.detail,
      bill: s.bill,
      isDetailLoading: s.isDetailLoading,
      detailError: s.detailError,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      fetchCustomer: s.fetchCustomer,
      fetchBill: s.fetchBill,
      removeSubscription: s.removeSubscription,
      deactivateCustomer: s.deactivateCustomer,
      clearError: s.clearError,
    })),
  )

  const customer = customerId ? detail[customerId] : undefined
  const month = currentMonth()
  const billData = customerId ? (bill[`${customerId}:${month}`] ?? null) : null

  const [overflowOpen, setOverflowOpen] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const busy = useRef(false)

  // Initial load.
  useEffect(() => {
    if (customerId) {
      void fetchCustomer(customerId)
    }
  }, [customerId, fetchCustomer])

  // OQ-5: Lazily fetch the full monthly bill for the current month (owner-only).
  // We rely on `isOwner` from the role hook; the server would also return 403 for staff.
  useEffect(() => {
    if (customerId && isOwner && customer) {
      void fetchBill(customerId, month)
    }
  }, [customerId, isOwner, customer, fetchBill, month])

  const writesDisabled = !isConnected

  const mutate = useCallback(
    async (fn: () => Promise<void>, onDone?: () => void) => {
      if (busy.current || writesDisabled) return
      busy.current = true
      clearError()
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      try {
        await fn()
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        onDone?.()
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } finally {
        busy.current = false
      }
    },
    [writesDisabled, clearError],
  )

  const handleRemoveSubscription = useCallback(
    (subscriptionId: string) => {
      if (!customerId) return
      void mutate(() => removeSubscription(customerId, subscriptionId))
    },
    [customerId, mutate, removeSubscription],
  )

  const handleDeactivate = useCallback(() => {
    setConfirmDeactivate(false)
    if (!customerId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    void mutate(
      () => deactivateCustomer(customerId),
      () => router.back(),
    )
  }, [customerId, mutate, deactivateCustomer, router])

  const goToEdit = useCallback(() => {
    if (!customerId) return
    setOverflowOpen(false)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/(app)/customers/${customerId}/edit` as Href)
  }, [customerId, router])

  const goToAddSubscription = useCallback(() => {
    if (!customerId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/(app)/customers/${customerId}/add-subscription` as Href)
  }, [customerId, router])

  const goToRecordPayment = useCallback(() => {
    if (!customerId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/(app)/customers/${customerId}/record-payment` as Href)
  }, [customerId, router])

  const goToSetCreditLimit = useCallback(() => {
    if (!customerId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/(app)/customers/${customerId}/credit-limit` as Href)
  }, [customerId, router])

  const goToCalendar = useCallback(() => {
    if (!customerId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Delivery calendar route — passes customerId as a param.
    router.push(`/(app)/delivery/calendar?customerId=${customerId}` as Href)
  }, [customerId, router])

  const header = (
    <AppHeader
      title={customer?.name ?? t('customer.customer_detail')}
      showBack
      onBackPress={() => router.back()}
      rightAction={
        isOwner ? (
          <AppIconButton
            icon={
              <Ionicons
                name="ellipsis-vertical"
                size={componentSizes.icon.md}
                color={colors.white}
              />
            }
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setOverflowOpen(true)
            }}
            testID="customer-detail-overflow"
          />
        ) : undefined
      }
    />
  )

  // ---- Loading ----
  if (isDetailLoading && !customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <DetailSkeleton />
      </SafeAreaView>
    )
  }

  // ---- Not found / Error ----
  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <View style={styles.center}>
          <AppEmptyState
            icon={
              <Ionicons
                name="alert-circle-outline"
                size={componentSizes.icon.xxxl}
                color={colors.textSecondary}
              />
            }
            title={detailError ? t(detailError) : t('customer.error_not_found')}
            actionLabel={t('common.retry')}
            onActionPress={() => customerId && void fetchCustomer(customerId)}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Offline banner */}
        {!isConnected ? (
          <AppAlert
            type="warning"
            title={t('common.offline')}
            message={t('common.offline_message')}
          />
        ) : null}

        {/* Mutation error banner */}
        {mutationError ? (
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(mutationError)}
          />
        ) : null}

        {/* Detail fetch error (non-fatal, data cached) */}
        {detailError ? (
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(detailError)}
          />
        ) : null}

        {/* Profile header — both roles */}
        <CustomerProfileHeader customer={customer} testID="customer-profile-header" />

        {/* Credit & Payment card — owner-only (self-guards on null currentBalance) */}
        <View style={styles.section}>
          <CreditPaymentCard
            customer={customer}
            onSetCreditLimit={goToSetCreditLimit}
            testID="customer-credit-card"
          />
        </View>

        {/* Monthly Bill card — owner-only (self-guards on null summary) */}
        <View style={styles.section}>
          <MonthlyBillCard
            bill={billData}
            summary={customer.currentMonthBill}
            testID="customer-monthly-bill"
          />
        </View>

        {/* Supply Lists section — both roles */}
        <AppSection
          title={t('customer.section_supply_lists', { count: customer.subscriptions.length })}
          containerStyle={styles.section}
        >
          {customer.subscriptions.map((sub) => (
            <SubscriptionRow
              key={sub.subscriptionId}
              sub={sub}
              onRemove={handleRemoveSubscription}
              canManage={isOwner}
              testID={`subscription-row-${sub.subscriptionId}`}
            />
          ))}
          {customer.subscriptions.length === 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {t('customer.no_subscriptions')}
            </AppText>
          ) : null}

          {/* Owner-only: add to another list */}
          <RoleGate require="owner">
            <AppButton
              label={t('customer.add_to_another_list')}
              variant="secondary"
              onPress={goToAddSubscription}
              disabled={writesDisabled}
              accessibilityHint={writesDisabled ? t('common.needs_connection') : undefined}
              leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.primary} />}
              testID="add-subscription-btn"
            />
          </RoleGate>
        </AppSection>

        {/* Action grid */}
        <View style={styles.actionGrid}>
          {/* View Calendar — both roles */}
          <AppButton
            label={t('customer.view_calendar')}
            variant="secondary"
            onPress={goToCalendar}
            style={styles.actionBtn}
            leftIcon={
              <Ionicons name="calendar-outline" size={componentSizes.icon.md} color={colors.primary} />
            }
            testID="action-view-calendar"
          />

          {/* Record Payment — owner only */}
          <RoleGate require="owner">
            <AppButton
              label={t('customer.record_payment')}
              variant="secondary"
              onPress={goToRecordPayment}
              disabled={writesDisabled}
              accessibilityHint={writesDisabled ? t('common.needs_connection') : undefined}
              style={styles.actionBtn}
              leftIcon={
                <Ionicons name="cash-outline" size={componentSizes.icon.md} color={colors.primary} />
              }
              testID="action-record-payment"
            />
          </RoleGate>

          {/* Share on WhatsApp — deferred per OQ-6; rendered disabled */}
          <RoleGate require="owner">
            <AppButton
              label={t('customer.share_whatsapp')}
              variant="ghost"
              onPress={() => { /* OQ-6 deferred */ }}
              disabled
              accessibilityHint={t('common.needs_connection')}
              style={styles.actionBtn}
              leftIcon={
                <Ionicons name="logo-whatsapp" size={componentSizes.icon.md} color={colors.textSecondary} />
              }
              testID="action-share-whatsapp"
            />
          </RoleGate>

          {/* Set Credit Limit — owner only */}
          <RoleGate require="owner">
            <AppButton
              label={t('customer.set_credit_limit')}
              variant="secondary"
              onPress={goToSetCreditLimit}
              disabled={writesDisabled}
              accessibilityHint={writesDisabled ? t('common.needs_connection') : undefined}
              style={styles.actionBtn}
              leftIcon={
                <Ionicons name="trending-up-outline" size={componentSizes.icon.md} color={colors.primary} />
              }
              testID="action-set-credit-limit"
            />
          </RoleGate>
        </View>
      </ScrollView>

      {/* Overflow menu (owner) */}
      <AppBottomSheet
        visible={overflowOpen}
        onDismiss={() => setOverflowOpen(false)}
        title={customer.name}
      >
        <View style={styles.overflowActions}>
          <AppMenuItem
            label={t('customer.edit_customer')}
            icon={
              <Ionicons name="create-outline" size={componentSizes.icon.md} color={colors.primary} />
            }
            onPress={goToEdit}
          />
          <AppMenuItem
            label={t('customer.deactivate_customer')}
            icon={
              <Ionicons name="close-circle-outline" size={componentSizes.icon.md} color={colors.error} />
            }
            onPress={() => {
              setOverflowOpen(false)
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
              setConfirmDeactivate(true)
            }}
            disabled={writesDisabled || isMutating}
          />
        </View>
      </AppBottomSheet>

      {/* Deactivate confirm */}
      <AppConfirmDialog
        visible={confirmDeactivate}
        title={t('customer.confirm_deactivate_title')}
        description={t('customer.confirm_deactivate_message')}
        confirmLabel={t('customer.deactivate_customer')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </SafeAreaView>
  )
}

export default function CustomerDetailScreen() {
  return (
    <ScreenErrorBoundary>
      <CustomerDetailScreenContent />
    </ScreenErrorBoundary>
  )
}

CustomerDetailScreen.displayName = 'CustomerDetailScreen'
