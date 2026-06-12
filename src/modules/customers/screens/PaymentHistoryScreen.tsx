/**
 * PaymentHistoryScreen — Owner-only (US-008, FEATURE_PLAN §3.7).
 * Purpose: Paginated list of a customer's payment history in reverse chronological
 * order. Standard meta envelope. Pull-to-refresh resets to page 1. Load-more
 * appends additional pages. Empty state when no payments exist.
 *
 * 5 states: Loading skeleton | Empty state | Error inline retry |
 * Content (FlatList) | Offline banner (reads cached data when available).
 */

import React, { useCallback, useEffect } from 'react'
import {
  FlatList,
  View,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppButton } from '@components/primitives/AppButton'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { PaymentHistoryRow } from '../components'
import { useCustomersStore } from '../store/customers.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { PaymentDto } from '../../../types/customer'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  skeletonRow: {
    height: 72,
    marginBottom: spacing[2],
    backgroundColor: colors.gray100,
    borderRadius: spacing[2],
  },
  skeletonWrap: { padding: spacing[4] },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  errorWrap: { padding: spacing[4] },
})

function SkeletonRows() {
  return (
    <View style={styles.skeletonWrap} testID="payments-loading">
      {[0, 1, 2, 3].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonRow}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function PaymentHistoryScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ customerId: string }>()
  const customerId = params.customerId

  const {
    payments,
    paymentsMeta,
    isPaymentsLoading,
    paymentsError,
    fetchPayments,
    clearError,
  } = useCustomersStore(
    useShallow((s) => ({
      payments: s.payments,
      paymentsMeta: s.paymentsMeta,
      isPaymentsLoading: s.isPaymentsLoading,
      paymentsError: s.paymentsError,
      fetchPayments: s.fetchPayments,
      clearError: s.clearError,
    })),
  )

  const rows: PaymentDto[] = customerId ? (payments[customerId] ?? []) : []
  const meta = customerId ? paymentsMeta[customerId] : undefined

  useEffect(() => {
    if (customerId) void fetchPayments(customerId, { page: 1 })
    return () => clearError()
  }, [customerId, fetchPayments, clearError])

  const handleRefresh = useCallback(() => {
    if (!customerId || isPaymentsLoading) return
    void fetchPayments(customerId, { page: 1 })
  }, [customerId, isPaymentsLoading, fetchPayments])

  const handleLoadMore = useCallback(() => {
    if (!customerId || isPaymentsLoading || !meta) return
    if (meta.page >= meta.totalPages) return
    void fetchPayments(customerId, { page: meta.page + 1 })
  }, [customerId, isPaymentsLoading, meta, fetchPayments])

  const renderItem = useCallback(
    ({ item }: { item: PaymentDto }) => (
      <PaymentHistoryRow payment={item} testID={`payment-row-${item.id}`} />
    ),
    [],
  )

  const keyExtractor = useCallback((item: PaymentDto) => item.id, [])

  if (isPaymentsLoading && rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader
          title={t('customer.payment_history')}
          showBack
          onBackPress={() => router.back()}
        />
        <SkeletonRows />
      </SafeAreaView>
    )
  }

  if (paymentsError && rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader
          title={t('customer.payment_history')}
          showBack
          onBackPress={() => router.back()}
        />
        <View style={styles.errorWrap}>
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(paymentsError)}
          />
          <AppButton
            label={t('common.retry')}
            onPress={handleRefresh}
            variant="secondary"
            testID="payments-retry"
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('customer.payment_history')}
        showBack
        onBackPress={() => router.back()}
      />

      {!isConnected ? (
        <AppAlert
          type="warning"
          title={t('common.offline')}
          message={t('common.offline_message')}
        />
      ) : null}

      {rows.length === 0 ? (
        <AppEmptyState
          icon={
            <Ionicons
              name="wallet-outline"
              size={componentSizes.icon.xxxl}
              color={colors.primary}
            />
          }
          title={t('customer.no_payments')}
        />
      ) : (
        <FlatList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isPaymentsLoading && rows.length > 0}
              onRefresh={handleRefresh}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          testID="payments-list"
          ListFooterComponent={
            isPaymentsLoading && rows.length > 0 ? (
              <View style={styles.footer}>
                <AppCard variant="flat" style={styles.skeletonRow}>
                  <View />
                </AppCard>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

export default function PaymentHistoryScreen() {
  return (
    <ScreenErrorBoundary>
      <PaymentHistoryScreenContent />
    </ScreenErrorBoundary>
  )
}

PaymentHistoryScreen.displayName = 'PaymentHistoryScreen'
