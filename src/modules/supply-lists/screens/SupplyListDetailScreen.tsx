/**
 * SupplyListDetailScreen — Owner + read-only assigned Staff (US-005, WS-3).
 * Purpose: One supply list's detail — header card, month/today stat cards (zeroed by the
 * US-006 backend stub → muted "no data yet"), and a paginated, server-searched, status-
 * filtered customer (subscription) list. Owner-only affordances: Edit (nav), an overflow
 * sheet (Assign staff via StaffMultiSelect, Archive with confirm), a "+ Add Customers"
 * button, and a per-customer edit-subscription sheet (qty/rate/pause/remove with confirm).
 *
 * Reads `listId` from the route params (the WS-4 route file is a thin wrapper). Role is
 * JWT-derived (useRole); owner affordances are gated by RoleGate require="owner". A 404 /
 * missing detail (staff not assigned, or archived for staff) is MASKED as an empty
 * "not found" state. All writes are online-only (OQ-3) — disabled + banner offline.
 *
 * 5 states: Loading (skeleton), Empty (no customers), Error (inline banner), Content,
 * Offline (cached detail shown, writes disabled).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, FlatList, StyleSheet, Platform, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppBadge } from '@components/primitives/AppBadge'
import { AppIconButton } from '@components/primitives/AppIconButton'
import { AppSearchBar } from '@components/composite/AppSearchBar'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { AppBottomSheet } from '@components/composite/AppBottomSheet'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { RoleGate } from '@components/composite/RoleGate'
import { CustomerCard, SupplyTypeIcon } from '../components'
import { StaffMultiSelect, type StaffOption } from '../components/StaffMultiSelect'
import { useSupplyListsStore } from '../store/supplyLists.store'
import { useRolesStore } from '@modules/roles/store/roles.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type {
  SubscriptionDto,
  SubscriptionStatus,
} from '../../../types/supplyLists'

const STATUS_SEGMENTS: SubscriptionStatus[] = ['active', 'paused', 'ended']

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[24] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  headerCard: { marginTop: spacing[3], marginBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  headerBody: { flex: 1, gap: spacing[1] },
  statsCard: { marginBottom: spacing[3] },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  filterRow: { marginBottom: spacing[2] },
  segment: { marginTop: spacing[2], marginBottom: spacing[2] },
  addBtn: { marginTop: spacing[3] },
  sheetField: { marginBottom: spacing[3] },
  sheetActions: { gap: spacing[2], marginTop: spacing[2] },
  skeletonCard: { height: 96, marginBottom: spacing[2], backgroundColor: colors.gray100 },
  muted: { marginTop: spacing[1] },
})

function DetailSkeleton() {
  return (
    <View style={styles.listContent} testID="supply-detail-skeleton">
      <AppCard variant="flat" style={[styles.headerCard, { height: 120 }]}>
        <View />
      </AppCard>
      {[0, 1, 2].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function SupplyListDetailScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const { isOwner } = useRole()

  const params = useLocalSearchParams<{ listId: string }>()
  const listId = params.listId

  const {
    detail,
    isDetailLoading,
    detailError,
    customers,
    customersMeta,
    isCustomersLoading,
    fetchDetail,
    fetchCustomers,
    assignStaff,
    unassignStaff,
    archiveList,
    updateSubscription,
    endSubscription,
    clearError,
  } = useSupplyListsStore(
    useShallow((s) => ({
      detail: s.detail,
      isDetailLoading: s.isDetailLoading,
      detailError: s.detailError,
      customers: s.customers,
      customersMeta: s.customersMeta,
      isCustomersLoading: s.isCustomersLoading,
      fetchDetail: s.fetchDetail,
      fetchCustomers: s.fetchCustomers,
      assignStaff: s.assignStaff,
      unassignStaff: s.unassignStaff,
      archiveList: s.archiveList,
      updateSubscription: s.updateSubscription,
      endSubscription: s.endSubscription,
      clearError: s.clearError,
    })),
  )

  const { staffList, fetchStaffList, isStaffLoading } = useRolesStore(
    useShallow((s) => ({
      staffList: s.staffList,
      fetchStaffList: s.fetchStaffList,
      isStaffLoading: s.isStaffLoading,
    })),
  )

  const list = listId ? detail[listId] : undefined
  const rows: SubscriptionDto[] = (listId ? customers[listId] : undefined) ?? []
  const meta = listId ? customersMeta[listId] : undefined

  const [statusIndex, setStatusIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const status = STATUS_SEGMENTS[statusIndex]!

  // Local 300ms debounce of the server search (no shared hook — WS-0 owns those).
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(handle)
  }, [search])

  const [overflowOpen, setOverflowOpen] = useState(false)
  const [assignSheetOpen, setAssignSheetOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [editSub, setEditSub] = useState<SubscriptionDto | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editRate, setEditRate] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const busy = useRef(false)

  // Initial load: detail + first customer page.
  useEffect(() => {
    if (listId) {
      void fetchDetail(listId)
    }
  }, [listId, fetchDetail])

  // Re-fetch the first customer page whenever the server query changes.
  useEffect(() => {
    if (listId) {
      void fetchCustomers(listId, { search: debouncedSearch || undefined, status, page: 1 })
    }
  }, [listId, debouncedSearch, status, fetchCustomers])

  const mutate = useCallback(
    async (fn: () => Promise<void>, onDone?: () => void) => {
      if (busy.current || !isConnected) return
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
    [isConnected, clearError],
  )

  const writesDisabled = !isConnected

  const onRefresh = useCallback(() => {
    if (!listId) return
    void fetchDetail(listId)
    void fetchCustomers(listId, { search: debouncedSearch || undefined, status, page: 1 })
  }, [listId, fetchDetail, fetchCustomers, debouncedSearch, status])

  // Infinite scroll: load the next customer page when more remain.
  const onEndReached = useCallback(() => {
    if (!listId || isCustomersLoading || !meta) return
    if (meta.page >= meta.totalPages) return
    void fetchCustomers(listId, {
      search: debouncedSearch || undefined,
      status,
      page: meta.page + 1,
    })
  }, [listId, isCustomersLoading, meta, fetchCustomers, debouncedSearch, status])

  // ---- Overflow sheet (Assign staff / Archive) ----
  const openOverflow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setOverflowOpen(true)
  }, [])

  // ---- Assign-staff sheet ----
  const openAssignSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setOverflowOpen(false)
    setAssignSheetOpen(true)
    void fetchStaffList(1)
  }, [fetchStaffList])

  const openArchive = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    setOverflowOpen(false)
    setConfirmArchive(true)
  }, [])

  const staffOptions: StaffOption[] = useMemo(
    () =>
      staffList
        .filter((s) => s.role !== 'owner' && s.status !== 'REMOVED')
        .map((s) => ({ staffId: s.staffId, name: s.name })),
    [staffList],
  )
  const assignedIds = useMemo(
    () => (list?.assignedStaff ?? []).map((s) => s.staffId),
    [list],
  )
  const primaryStaffId = useMemo(
    () => list?.assignedStaff.find((s) => s.isPrimary)?.staffId ?? null,
    [list],
  )

  const handleToggleAssign = useCallback(
    (staffId: string, nextAssigned: boolean) => {
      if (!listId) return
      if (nextAssigned) {
        void mutate(() => assignStaff(listId, staffId, assignedIds.length === 0))
      } else {
        void mutate(() => unassignStaff(listId, staffId))
      }
    },
    [listId, mutate, assignStaff, unassignStaff, assignedIds.length],
  )

  const handleSetPrimary = useCallback(
    (staffId: string) => {
      if (!listId) return
      void mutate(() => assignStaff(listId, staffId, true))
    },
    [listId, mutate, assignStaff],
  )

  // ---- Archive ----
  const confirmArchiveNow = useCallback(() => {
    setConfirmArchive(false)
    if (!listId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    void mutate(
      () => archiveList(listId),
      () => router.back(),
    )
  }, [listId, mutate, archiveList, router])

  // ---- Edit subscription sheet ----
  const openEditSub = useCallback((sub: SubscriptionDto) => {
    setEditSub(sub)
    setEditQty(String(sub.quantity))
    setEditRate(String(sub.ratePerUnit))
  }, [])

  const closeEditSub = useCallback(() => {
    setEditSub(null)
    setConfirmRemove(false)
  }, [])

  const handleSaveSub = useCallback(() => {
    if (!listId || !editSub) return
    const quantity = Number(editQty)
    const ratePerUnit = Number(editRate)
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(ratePerUnit) || ratePerUnit < 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    void mutate(
      () => updateSubscription(listId, editSub.subscriptionId, { quantity, ratePerUnit }),
      closeEditSub,
    )
  }, [listId, editSub, editQty, editRate, mutate, updateSubscription, closeEditSub])

  const handleTogglePause = useCallback(() => {
    if (!listId || !editSub) return
    const next = editSub.status === 'paused' ? 'active' : 'paused'
    void mutate(
      () => updateSubscription(listId, editSub.subscriptionId, { status: next }),
      closeEditSub,
    )
  }, [listId, editSub, mutate, updateSubscription, closeEditSub])

  const handleRemoveSub = useCallback(() => {
    setConfirmRemove(false)
    if (!listId || !editSub) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    void mutate(
      () => endSubscription(listId, editSub.subscriptionId),
      closeEditSub,
    )
  }, [listId, editSub, mutate, endSubscription, closeEditSub])

  const goToEdit = useCallback(() => {
    if (!listId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/(app)/supply-lists/${listId}/edit` as Href)
  }, [listId, router])

  const goToAddCustomers = useCallback(() => {
    if (!listId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/(app)/supply-lists/${listId}/add-customers` as Href)
  }, [listId, router])

  const renderItem = useCallback(
    ({ item }: { item: SubscriptionDto }) => (
      <CustomerCard
        subscription={item}
        unit={list?.unit ?? ''}
        onPress={isOwner ? () => openEditSub(item) : undefined}
        testID={`customer-card-${item.subscriptionId}`}
      />
    ),
    [list?.unit, isOwner, openEditSub],
  )
  const keyExtractor = useCallback((s: SubscriptionDto) => s.subscriptionId, [])

  const header = (
    <AppHeader
      title={list?.name ?? t('supply.title')}
      showBack
      onBackPress={() => router.back()}
      rightAction={
        isOwner && list ? (
          <AppIconButton
            icon={
              <Ionicons
                name="create-outline"
                size={componentSizes.icon.md}
                color={colors.white}
                accessibilityLabel={t('supply.edit')}
              />
            }
            onPress={goToEdit}
            testID="detail-edit"
          />
        ) : undefined
      }
    />
  )

  // Loading (no cached detail yet)
  if (isDetailLoading && !list) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <DetailSkeleton />
      </SafeAreaView>
    )
  }

  // 404 / not found (masked) — staff not assigned, archived, or load failed with no cache.
  if (!list) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <View style={styles.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.textSecondary} />}
            title={t('supply.error_not_found')}
            actionLabel={t('common.retry')}
            onActionPress={() => listId && void fetchDetail(listId)}
          />
        </View>
      </SafeAreaView>
    )
  }

  // Stub-zero detection: the US-006 stub zeroes every today/month field.
  const today = list.todayStats
  const month = list.monthStats
  const hasTodayData = today.delivered > 0 || today.pending > 0 || today.onLeave > 0
  const hasMonthData = month.daysCompleted > 0 || month.totalQuantity > 0 || month.revenue > 0

  const listHeader = (
    <View>
      {!isConnected ? (
        <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
      ) : null}
      {detailError ? (
        <AppAlert type="error" title={t('common.error')} message={t(detailError)} />
      ) : null}

      {/* Header card */}
      <AppCard variant="elevated" style={styles.headerCard}>
        <View style={styles.headerRow}>
          <SupplyTypeIcon supplyType={list.supplyType} />
          <View style={styles.headerBody}>
            <AppText variant="h3" weight="bold" numberOfLines={2}>
              {list.name}
            </AppText>
            {list.startTime ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {list.startTime}
              </AppText>
            ) : null}
            {list.defaultQuantity != null && list.defaultRatePerUnit != null ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {t('supply.default_label', {
                  qty: String(list.defaultQuantity),
                  unit: list.unit,
                  rate: String(list.defaultRatePerUnit),
                })}
              </AppText>
            ) : null}
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {list.assignedStaff.length > 0
                ? t('supply.staff_label', {
                    names: list.assignedStaff
                      .map((s) => s.staffName)
                      .filter((n): n is string => !!n)
                      .join(', '),
                  })
                : t('supply.unassigned')}
            </AppText>
          </View>
          <RoleGate require="owner">
            <AppIconButton
              icon={
                <Ionicons
                  name="ellipsis-vertical"
                  size={componentSizes.icon.md}
                  color={colors.textSecondary}
                  accessibilityLabel={t('supply.assign_staff')}
                />
              }
              onPress={openOverflow}
              testID="detail-overflow"
            />
          </RoleGate>
        </View>
      </AppCard>

      {/* Month stats */}
      <AppSection title={t('supply.title')}>
        <AppCard variant="default" style={styles.statsCard}>
          <View style={styles.statRow}>
            <AppText variant="body" color={colors.textSecondary}>{t('supply.customers_count', { count: String(list.customerCount) })}</AppText>
          </View>
          {hasMonthData ? (
            <View style={styles.statRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('supply.field_quantity')}</AppText>
              <AppText variant="body" weight="semibold">{`${String(month.totalQuantity)} ${list.unit}`}</AppText>
            </View>
          ) : (
            <AppText variant="caption" color={colors.textSecondary} style={styles.muted} testID="month-no-data">
              {t('supply.no_delivery_data_yet')}
            </AppText>
          )}
        </AppCard>
      </AppSection>

      {/* Today summary */}
      <AppCard variant="default" style={styles.statsCard}>
        {hasTodayData ? (
          <View style={styles.statRow}>
            <AppText variant="body" color={colors.textSecondary}>
              {t('supply.today_progress', { done: String(today.delivered), total: String(list.customerCount) })}
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" color={colors.textSecondary} testID="today-no-data">
            {t('supply.no_delivery_data_yet')}
          </AppText>
        )}
        <AppButton
          label={t('supply.view_today_deliveries')}
          variant="link"
          onPress={() => {}}
          disabled
          accessibilityHint={t('supply.coming_in_us006')}
          testID="view-today-deliveries"
        />
        <AppBadge label={t('supply.coming_in_us006')} variant="gray" size="sm" />
      </AppCard>

      {/* Customers filter */}
      <View style={styles.filterRow}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder={t('supply.search_customers')}
          testID="customer-search"
        />
        <View style={styles.segment}>
          <AppSegmentedControl
            segments={[
              { label: t('supply.status_active'), value: 'active' },
              { label: t('supply.status_paused'), value: 'paused' },
              { label: t('supply.status_ended'), value: 'ended' },
            ]}
            selectedIndex={statusIndex}
            onChange={(i) => setStatusIndex(i)}
          />
        </View>
      </View>
    </View>
  )

  const listFooter = (
    <RoleGate require="owner">
      <AppButton
        label={t('supply.empty_customers_cta')}
        variant="primary"
        onPress={goToAddCustomers}
        disabled={writesDisabled}
        accessibilityHint={writesDisabled ? t('common.needs_connection') : undefined}
        style={styles.addBtn}
        testID="add-customers"
        leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.white} />}
      />
    </RoleGate>
  )

  const emptyCustomers =
    isCustomersLoading && rows.length === 0 ? (
      <View testID="customers-loading">
        {[0, 1, 2].map((i) => (
          <AppCard key={i} variant="flat" style={styles.skeletonCard}>
            <View />
          </AppCard>
        ))}
      </View>
    ) : (
      <AppEmptyState
        icon={<Ionicons name="people-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
        title={t('supply.empty_customers')}
        description={isOwner ? t('supply.empty_customers_cta') : undefined}
      />
    )

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={emptyCustomers}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isDetailLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />

      {/* Overflow sheet (owner): Assign staff / Archive */}
      <AppBottomSheet
        visible={overflowOpen}
        onDismiss={() => setOverflowOpen(false)}
        title={list.name}
      >
        <View style={styles.sheetActions}>
          <AppButton
            label={t('supply.assign_staff')}
            variant="secondary"
            onPress={openAssignSheet}
            testID="overflow-assign-staff"
            leftIcon={<Ionicons name="people-outline" size={componentSizes.icon.md} color={colors.primary} />}
          />
          <AppButton
            label={t('supply.archive_list')}
            variant="danger"
            onPress={openArchive}
            disabled={writesDisabled}
            accessibilityHint={writesDisabled ? t('common.needs_connection') : undefined}
            testID="overflow-archive"
            leftIcon={<Ionicons name="archive-outline" size={componentSizes.icon.md} color={colors.white} />}
          />
        </View>
      </AppBottomSheet>

      {/* Assign-staff sheet (owner) */}
      <AppBottomSheet
        visible={assignSheetOpen}
        onDismiss={() => setAssignSheetOpen(false)}
        title={t('supply.assign_staff')}
      >
        <StaffMultiSelect
          options={staffOptions}
          assignedIds={assignedIds}
          primaryStaffId={primaryStaffId}
          onToggleAssign={handleToggleAssign}
          onSetPrimary={handleSetPrimary}
          disabled={writesDisabled}
          isLoading={isStaffLoading}
          testID="assign-staff-sheet"
        />
      </AppBottomSheet>

      {/* Edit-subscription sheet (owner) */}
      <AppBottomSheet
        visible={editSub !== null}
        onDismiss={closeEditSub}
        title={t('supply.edit_subscription')}
      >
        <AppInput
          label={t('supply.field_quantity')}
          value={editQty}
          onChangeText={setEditQty}
          keyboardType="numeric"
          containerStyle={styles.sheetField}
          testID="edit-sub-qty"
        />
        <AppInput
          label={t('supply.field_rate')}
          value={editRate}
          onChangeText={setEditRate}
          keyboardType="numeric"
          containerStyle={styles.sheetField}
          testID="edit-sub-rate"
        />
        <View style={styles.sheetActions}>
          <AppButton
            label={t('supply.save_changes')}
            variant="primary"
            onPress={handleSaveSub}
            disabled={writesDisabled}
            accessibilityHint={writesDisabled ? t('common.needs_connection') : undefined}
            testID="edit-sub-save"
          />
          <AppButton
            label={editSub?.status === 'paused' ? t('supply.resume') : t('supply.pause')}
            variant="secondary"
            onPress={handleTogglePause}
            disabled={writesDisabled || editSub?.status === 'ended'}
            testID="edit-sub-pause"
          />
          <AppButton
            label={t('supply.remove_customer')}
            variant="danger"
            onPress={() => setConfirmRemove(true)}
            disabled={writesDisabled}
            testID="edit-sub-remove"
          />
        </View>
      </AppBottomSheet>

      <AppConfirmDialog
        visible={confirmArchive}
        title={t('supply.archive_confirm_title')}
        description={t('supply.archive_confirm_body')}
        confirmLabel={t('supply.archive_list')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={confirmArchiveNow}
        onCancel={() => setConfirmArchive(false)}
      />

      <AppConfirmDialog
        visible={confirmRemove}
        title={t('supply.remove_confirm_title')}
        description={t('supply.remove_confirm_body')}
        confirmLabel={t('supply.remove_customer')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={handleRemoveSub}
        onCancel={() => setConfirmRemove(false)}
      />
    </SafeAreaView>
  )
}

export default function SupplyListDetailScreen() {
  return (
    <ScreenErrorBoundary>
      <SupplyListDetailScreenContent />
    </ScreenErrorBoundary>
  )
}

SupplyListDetailScreen.displayName = 'SupplyListDetailScreen'
