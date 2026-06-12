/**
 * CollectionsScreen (US-010, FEATURE_PLAN §2.4)
 * Purpose: Outstanding aging drill-down for owners.
 * Summary card + priority-filtered FlatList of customers + advance-credit section.
 *
 * OQ-5: "Send Reminder" is omitted for MVP (no backend endpoint yet).
 *       Cards are read-only metrics + "Record Payment" → US-008 screen.
 *
 * Owner-only: `useRequireOwner()` guard.
 * FlatList for large customer lists (edge case #10: 500+ customers).
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useDashboardStore } from '../store/dashboard.store'
import { OutstandingAgingCard, PriorityCustomerCard, AdvanceCreditCard } from '../components'
import type { Priority } from '../components/PriorityCustomerCard'
import type { PriorityCustomer } from '../../../types/dashboard'

type PriorityFilter = 'all' | 'high' | 'medium' | 'low'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  alertRow: { paddingHorizontal: spacing[4] },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  filter: { paddingHorizontal: spacing[4], marginBottom: spacing[3] },
  summaryCard: { padding: spacing[4], marginHorizontal: spacing[4], marginBottom: spacing[3] },
  advanceSection: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  advanceHeader: { marginBottom: spacing[2] },
  emptyPad: { paddingTop: spacing[6] },
  loadingRow: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function CollectionsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const [priorityFilterIndex, setPriorityFilterIndex] = useState(0)
  const priorityFilters: PriorityFilter[] = ['all', 'high', 'medium', 'low']
  const activeFilter = priorityFilters[priorityFilterIndex] ?? 'all'

  const {
    collections,
    isCollectionsLoading,
    collectionsError,
    fetchCollections,
    clearErrors,
  } = useDashboardStore(
    useShallow((s) => ({
      collections: s.collections,
      isCollectionsLoading: s.isCollectionsLoading,
      collectionsError: s.collectionsError,
      fetchCollections: s.fetchCollections,
      clearErrors: s.clearErrors,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchCollections()
      return () => clearErrors()
    }, [fetchCollections, clearErrors]),
  )

  const handleRecordPayment = useCallback((customerId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/(app)/customers/${customerId}/record-payment` as Href)
  }, [router])

  const filteredCustomers = useMemo((): Array<{ customer: PriorityCustomer; priority: Priority }> => {
    if (!collections) return []
    const all: Array<{ customer: PriorityCustomer; priority: Priority }> = [
      ...collections.priorityCustomers.high.map((c) => ({ customer: c, priority: 'high' as Priority })),
      ...collections.priorityCustomers.medium.map((c) => ({ customer: c, priority: 'medium' as Priority })),
      ...collections.priorityCustomers.low.map((c) => ({ customer: c, priority: 'low' as Priority })),
    ]
    if (activeFilter === 'all') return all
    return all.filter((x) => x.priority === activeFilter)
  }, [collections, activeFilter])

  if (isCollectionsLoading && !collections) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('dashboard.collections_title')} showBack onBackPress={() => router.back()} />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (collectionsError && !collections) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('dashboard.collections_title')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('dashboard.error_load_collections')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchCollections()}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('dashboard.collections_title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {collectionsError && collections ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        data={filteredCustomers}
        keyExtractor={(item) => item.customer.customerId}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            {collections ? (
              <AppCard style={styles.summaryCard} testID="collections-summary-card">
                <AppText variant="body" weight="semibold" color={colors.textPrimary}>
                  {t('dashboard.total_outstanding')}
                </AppText>
                <AppText variant="h2" weight="bold" color={colors.error}>
                  {formatCurrency(collections.summary.totalOutstanding)}
                </AppText>
                <OutstandingAgingCard aging={collections.summary} />
              </AppCard>
            ) : null}

            {/* Priority filter */}
            <View style={styles.filter}>
              <AppSegmentedControl
                segments={[
                  t('dashboard.priority_filter_all'),
                  t('dashboard.priority_filter_high'),
                  t('dashboard.priority_filter_medium'),
                  t('dashboard.priority_filter_low'),
                ]}
                selectedIndex={priorityFilterIndex}
                onChange={(idx) => setPriorityFilterIndex(idx)}
              />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing[4] }}>
            <PriorityCustomerCard
              customer={item.customer}
              priority={item.priority}
              onRecordPayment={() => handleRecordPayment(item.customer.customerId)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyPad}>
            <AppEmptyState
              title={t('dashboard.no_lists_today')}
              description=""
            />
          </View>
        }
        ListFooterComponent={
          collections && collections.advanceCredit.customers.length > 0 ? (
            <View style={styles.advanceSection} testID="advance-credit-section">
              <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.advanceHeader}>
                {t('dashboard.advance_credit_section', { count: collections.advanceCredit.customerCount })}
              </AppText>
              {collections.advanceCredit.customers.map((c) => (
                <AdvanceCreditCard key={c.customerId} customer={c} />
              ))}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

export default function CollectionsScreen() {
  return (
    <ScreenErrorBoundary>
      <CollectionsContent />
    </ScreenErrorBoundary>
  )
}

CollectionsScreen.displayName = 'CollectionsScreen'
