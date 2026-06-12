/**
 * DeliveryListScreen — /(app)/deliveries/[listId] (US-006, WS-2).
 * Per-list deliveries for owner + assigned staff. Progress header, debounced
 * search, All/Pending/Completed filter, sectioned FlatList (pending →
 * DeliveryCustomerCard with Delivered/Leave; completed → CompletedDeliveryRow),
 * and a footer "MARK ALL AS DELIVERED" (confirm dialog; hidden at 0 pending).
 * Optimistic marking with rollback + haptics. Money only for owner. Conflicts show
 * a warning. Staff without `mark_deliveries` → read-only. 5 states; writes disabled
 * offline.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSearchBar } from '@components/composite/AppSearchBar'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { DeliveryProgressHeader } from '../components/DeliveryProgressHeader'
import { DeliveryCustomerCard } from '../components/DeliveryCustomerCard'
import { CompletedDeliveryRow } from '../components/CompletedDeliveryRow'
import { useDeliveryStore } from '../store/delivery.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { DeliveryDto, MarkableStatus } from '../../../types/delivery'

type FilterValue = 'all' | 'pending' | 'completed'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[2] },
  banner: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  listContent: { paddingBottom: spacing[24] },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  footer: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    padding: spacing[4],
    backgroundColor: colors.surface,
  },
  skeletonRow: { height: 88, marginHorizontal: spacing[4], marginBottom: spacing[2], backgroundColor: colors.gray100, borderRadius: spacing[2] },
})

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'pending'; key: string; delivery: DeliveryDto }
  | { kind: 'completed'; key: string; delivery: DeliveryDto }

function DeliveryListScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ listId: string }>()
  const listId = params.listId
  const { isConnected } = useNetworkStatus()
  const { isOwner, hasPermission } = useRole()
  const canMark = isOwner || hasPermission('mark_deliveries')

  const {
    deliveries,
    progress,
    isLoading,
    error,
    isMutating,
    mutationError,
    fetchListDeliveries,
    markDelivery,
    markBulk,
    clearError,
  } = useDeliveryStore(
    useShallow((s) => ({
      deliveries: s.listDeliveries[listId] ?? [],
      progress: s.listProgress[listId] ?? { total: 0, delivered: 0, onLeave: 0, pending: 0 },
      isLoading: s.isListLoading,
      error: s.listError,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      fetchListDeliveries: s.fetchListDeliveries,
      markDelivery: s.markDelivery,
      markBulk: s.markBulk,
      clearError: s.clearError,
    })),
  )

  const [search, setSearch] = useState('')
  const [filterIndex, setFilterIndex] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filterValue: FilterValue = (['all', 'pending', 'completed'] as const)[filterIndex] ?? 'all'

  const load = useCallback(() => {
    // "Completed" spans all non-PENDING statuses (DELIVERED | LEAVE | AUTO_MARKED |
    // CANCELLED). The API's `status` accepts a single enum, so we omit it for the
    // completed tab and filter client-side (rows useMemo keeps only status !==
    // 'PENDING'); only "pending" sends an explicit status filter.
    void fetchListDeliveries(listId, {
      search: search.trim() || undefined,
      status: filterValue === 'pending' ? 'PENDING' : undefined,
    })
  }, [fetchListDeliveries, listId, search, filterValue])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(load, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [load])

  const segments = useMemo(
    () => [t('delivery.filter_all'), t('delivery.filter_pending'), t('delivery.filter_completed')],
    [t],
  )

  // Build sectioned rows: pending first (markable), then completed.
  const rows = useMemo<Row[]>(() => {
    const pending = deliveries.filter((d) => d.status === 'PENDING')
    const completed = deliveries.filter((d) => d.status !== 'PENDING')
    const result: Row[] = []
    if (filterValue !== 'completed' && pending.length > 0) {
      result.push({ kind: 'header', key: 'h-pending', label: t('delivery.section_pending') })
      pending.forEach((d) => result.push({ kind: 'pending', key: d.id, delivery: d }))
    }
    if (filterValue !== 'pending' && completed.length > 0) {
      result.push({ kind: 'header', key: 'h-completed', label: t('delivery.section_completed') })
      completed.forEach((d) => result.push({ kind: 'completed', key: d.id, delivery: d }))
    }
    return result
  }, [deliveries, filterValue, t])

  const onMark = useCallback(
    async (deliveryId: string, status: MarkableStatus) => {
      if (!isConnected) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      try {
        await markDelivery(listId, deliveryId, status)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    },
    [isConnected, markDelivery, listId],
  )

  const onMarkDelivered = useCallback((id: string) => void onMark(id, 'DELIVERED'), [onMark])
  const onMarkLeave = useCallback((id: string) => void onMark(id, 'LEAVE'), [onMark])

  const onConfirmMarkAll = useCallback(async () => {
    setShowConfirm(false)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await markBulk(listId)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [markBulk, listId])

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
              {item.label}
            </AppText>
          </View>
        )
      }
      if (item.kind === 'pending') {
        return (
          <DeliveryCustomerCard
            delivery={item.delivery}
            showMoney={isOwner}
            disabled={!canMark || !isConnected || isMutating}
            onMarkDelivered={onMarkDelivered}
            onMarkLeave={onMarkLeave}
            testID={`delivery-card-${item.delivery.id}`}
          />
        )
      }
      return (
        <CompletedDeliveryRow
          delivery={item.delivery}
          showMoney={isOwner}
          testID={`delivery-row-${item.delivery.id}`}
        />
      )
    },
    [isOwner, canMark, isConnected, isMutating, onMarkDelivered, onMarkLeave],
  )

  const keyExtractor = useCallback((item: Row) => item.key, [])

  const header = (
    <AppHeader title={t('delivery.title_list')} showBack onBackPress={() => router.back()} />
  )

  // Loading (no cached rows yet)
  if (isLoading && deliveries.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <View testID="delivery-list-skeleton">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow} />
          ))}
        </View>
      </SafeAreaView>
    )
  }

  // Error (no cached rows)
  if (error && deliveries.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t(error)}
          actionLabel={t('common.retry')}
          onActionPress={load}
        />
      </SafeAreaView>
    )
  }

  const pendingCount = deliveries.filter((d) => d.status === 'PENDING').length

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      <DeliveryProgressHeader
        total={progress.total}
        delivered={progress.delivered}
        onLeave={progress.onLeave}
        pending={progress.pending}
      />
      {!isConnected ? (
        <View style={styles.banner}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.needs_connection')} />
        </View>
      ) : null}
      {!canMark ? (
        <View style={styles.banner}>
          <AppAlert type="info" title={t('delivery.view_only')} />
        </View>
      ) : null}
      {mutationError ? (
        <View style={styles.banner}>
          <AppAlert type="error" title={t(mutationError)} onClose={clearError} />
        </View>
      ) : null}

      <View style={styles.controls}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('delivery.search_customers')}
          onClear={() => setSearch('')}
        />
        <AppSegmentedControl
          segments={segments}
          selectedIndex={filterIndex}
          onChange={(index) => setFilterIndex(index)}
        />
      </View>

      {rows.length === 0 ? (
        <AppEmptyState
          icon={<Ionicons name="cube-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('delivery.empty_list')}
        />
      ) : (
        <FlatList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        />
      )}

      {canMark && pendingCount > 0 ? (
        <View style={styles.footer}>
          <AppButton
            label={t('delivery.mark_all_delivered')}
            variant="primary"
            fullWidth
            disabled={!isConnected || isMutating}
            loading={isMutating}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            onPress={() => setShowConfirm(true)}
            testID="mark-all-btn"
          />
        </View>
      ) : null}

      <AppConfirmDialog
        visible={showConfirm}
        title={t('delivery.mark_all_confirm_title')}
        description={t('delivery.mark_all_confirm_body', { count: pendingCount })}
        confirmLabel={t('delivery.mark_all_delivered')}
        onConfirm={onConfirmMarkAll}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  )
}

export default function DeliveryListScreen() {
  return (
    <ScreenErrorBoundary>
      <DeliveryListScreenContent />
    </ScreenErrorBoundary>
  )
}

DeliveryListScreen.displayName = 'DeliveryListScreen'
