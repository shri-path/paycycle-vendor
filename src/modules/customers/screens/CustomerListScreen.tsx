/**
 * CustomerListScreen — Owner + staff (US-008, FEATURE_PLAN §3.1, wireframe 2.8).
 * Purpose: List all customers for the active vendor with a server-side debounced
 * search, supply-list filter, status filter, alphabetical grouping, infinite-scroll
 * pagination, pull-to-refresh, and owner-only create entry points.
 *
 * 5 states: Loading skeleton / Error / Empty / Empty-filtered / Data.
 *
 * Role model:
 *   - Owner: full list view + header +Add + bottom +Create button.
 *   - Staff: read-only list (financial fields arrive as null from the server;
 *     the card hides them automatically via null-checks).
 *
 * Performance: FlatList with `initialNumToRender`/`maxToRenderPerBatch`/`windowSize`,
 * memoized cards, `removeClippedSubviews` on Android. Staggered fade-in capped to
 * the first ~10 rows, disabled under `useReducedMotion()`.
 *
 * Security: vendorId is JWT-derived in the store — never from route params.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  StyleSheet,
  RefreshControl,
  Platform,
  SectionList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppIconButton } from '@components/primitives/AppIconButton'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppSearchBar } from '@components/composite/AppSearchBar'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { RoleGate } from '@components/composite/RoleGate'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { CustomerListCard } from '../components'
import { useCustomersStore } from '../store/customers.store'
import { useSupplyListsStore } from '@modules/supply-lists/store/supplyLists.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { CustomerListItemDto, CustomerStatusFilter } from '../../../types/customer'

/** Rows past this index render without entry animation (low-end device budget). */
const ANIMATED_ROW_CAP = 10
const SEARCH_DEBOUNCE_MS = 300

const STATUS_FILTERS: CustomerStatusFilter[] = ['all', 'paid', 'pending', 'overdue']

/** Groups a flat list of customers into alphabetical sections by first letter. */
function groupAlphabetically(
  customers: CustomerListItemDto[],
): { title: string; data: CustomerListItemDto[] }[] {
  const map = new Map<string, CustomerListItemDto[]>()
  for (const customer of customers) {
    const letter = (customer.name[0] ?? '#').toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : '#'
    const existing = map.get(key)
    if (existing) {
      existing.push(customer)
    } else {
      map.set(key, [customer])
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    .map(([title, data]) => ({ title, data }))
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  filterRow: { flexDirection: 'row', gap: spacing[2] },
  filterItem: { flex: 1 },
  countRow: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
    backgroundColor: colors.background,
  },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[24] },
  skeletonCard: { height: 96, marginBottom: spacing[2], backgroundColor: colors.gray100 },
  bottomBar: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[6],
  },
})

function CustomerListSkeleton() {
  return (
    <View style={styles.listContent} testID="customer-list-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function CustomerListScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const reducedMotion = useReducedMotion()

  const {
    list,
    listTotal,
    listPage,
    listListId,
    listStatus,
    isListLoading,
    listError,
    setSearch,
    setListFilter,
    setStatusFilter,
    fetchCustomers,
    clearError,
  } = useCustomersStore(
    useShallow((s) => ({
      list: s.list,
      listTotal: s.listTotal,
      listPage: s.listPage,
      listListId: s.listListId,
      listStatus: s.listStatus,
      isListLoading: s.isListLoading,
      listError: s.listError,
      setSearch: s.setSearch,
      setListFilter: s.setListFilter,
      setStatusFilter: s.setStatusFilter,
      fetchCustomers: s.fetchCustomers,
      clearError: s.clearError,
    })),
  )

  // Pull the supply lists for the list-filter dropdown.
  const supplyLists = useSupplyListsStore(useShallow((s) => s.lists))

  // Server-side search: local input → debounce → store setSearch → fetchCustomers effect.
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, setSearch])

  // Refetch page 1 whenever filters change (search, listId, status).
  useEffect(() => {
    void fetchCustomers({ page: 1 })
  }, [fetchCustomers, listListId, listStatus])

  // Also refetch when search changes in the store.
  const listSearch = useCustomersStore((s) => s.listSearch)
  const prevSearch = useRef(listSearch)
  useEffect(() => {
    if (prevSearch.current !== listSearch) {
      prevSearch.current = listSearch
      void fetchCustomers({ page: 1 })
    }
  }, [fetchCustomers, listSearch])

  // ---- Status filter ----
  const statusIndex = STATUS_FILTERS.indexOf(listStatus)
  const onChangeStatus = useCallback(
    (index: number) => {
      const next = STATUS_FILTERS[index] ?? 'all'
      if (next === listStatus) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setStatusFilter(next)
    },
    [listStatus, setStatusFilter],
  )

  // ---- List filter (supply list) ----
  const listFilterOptions = useMemo(() => {
    const all = { label: t('customer.filter_all_lists'), value: '' }
    return [all, ...supplyLists.map((l) => ({ label: l.name, value: l.id }))]
  }, [supplyLists, t])

  const onChangeListFilter = useCallback(
    (value: string | number) => {
      setListFilter(value === '' ? null : String(value))
    },
    [setListFilter],
  )

  // ---- Navigation ----
  const goToDetail = useCallback(
    (customerId: string) => {
      router.push(`/(app)/customers/${customerId}` as Href)
    },
    [router],
  )

  const goToCreate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/customers/add' as Href)
  }, [router])

  // ---- Pagination (infinite scroll) ----
  const onEndReached = useCallback(() => {
    if (isListLoading) return
    // Determine if there are more pages. The store tracks listTotal.
    const currentCount = list.length
    if (currentCount >= listTotal) return
    void fetchCustomers({ page: listPage + 1 })
  }, [isListLoading, list.length, listTotal, listPage, fetchCustomers])

  // ---- Pull to refresh ----
  const onRefresh = useCallback(() => {
    clearError()
    void fetchCustomers({ page: 1 })
  }, [fetchCustomers, clearError])

  // ---- Alphabetical grouping ----
  const sections = useMemo(() => groupAlphabetically(list), [list])

  // ---- Render item (memoized) ----
  const renderItem = useCallback(
    ({ item, index }: { item: CustomerListItemDto; index: number }) => {
      const card = (
        <CustomerListCard
          customer={item}
          onPress={goToDetail}
          testID={`customer-card-${item.id}`}
        />
      )
      if (reducedMotion || index >= ANIMATED_ROW_CAP) return card
      return (
        <Animated.View entering={FadeInDown.delay(index * 30).duration(220)}>
          {card}
        </Animated.View>
      )
    },
    [goToDetail, reducedMotion],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
          {section.title}
        </AppText>
      </View>
    ),
    [],
  )

  const keyExtractor = useCallback((c: CustomerListItemDto) => c.id, [])

  const header = (
    <AppHeader
      title={t('customer.title')}
      rightAction={
        <RoleGate require="owner">
          <AppIconButton
            icon={<Ionicons name="add" size={componentSizes.icon.lg} color={colors.white} />}
            onPress={goToCreate}
            variant="ghost"
            testID="customer-add-header"
          />
        </RoleGate>
      }
    />
  )

  const offlineBanner = !isConnected ? (
    <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
  ) : null

  const controls = (
    <View style={styles.controls}>
      <AppSearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        onClear={() => {
          setSearchInput('')
          setSearch('')
        }}
        placeholder={t('customer.search_placeholder')}
        accessibilityLabel={t('customer.search_placeholder')}
        searchIcon={
          <Ionicons name="search" size={componentSizes.icon.md} color={colors.textSecondary} />
        }
        clearIcon={
          <Ionicons name="close" size={componentSizes.icon.md} color={colors.textSecondary} />
        }
        testID="customer-search"
      />
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <AppSelect
            options={listFilterOptions}
            value={listListId ?? ''}
            onChange={onChangeListFilter}
            placeholder={t('customer.filter_all_lists')}
          />
        </View>
        <View style={styles.filterItem}>
          <AppSegmentedControl
            segments={[
              t('customer.status_all'),
              t('customer.status_paid'),
              t('customer.status_pending'),
              t('customer.status_overdue'),
            ]}
            selectedIndex={statusIndex >= 0 ? statusIndex : 0}
            onChange={onChangeStatus}
          />
        </View>
      </View>
    </View>
  )

  // ---- Loading (first load, nothing cached yet) ----
  if (isListLoading && list.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <CustomerListSkeleton />
      </SafeAreaView>
    )
  }

  // ---- Error (no cached data to fall back on) ----
  if (listError && list.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <AppEmptyState
          icon={
            <Ionicons
              name="alert-circle-outline"
              size={componentSizes.icon.xxxl}
              color={colors.error}
            />
          }
          title={t('common.error')}
          description={t(listError)}
          actionLabel={t('common.retry')}
          onActionPress={onRefresh}
        />
      </SafeAreaView>
    )
  }

  const isEmpty = list.length === 0
  const isFiltered = searchInput.length > 0 || listListId !== null || listStatus !== 'all'

  // ---- Empty-filtered state ----
  if (isEmpty && isFiltered) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <View style={styles.countRow}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('customer.total_count', { count: 0 })}
          </AppText>
        </View>
        <AppEmptyState
          icon={
            <Ionicons name="search-outline" size={componentSizes.icon.xxxl} color={colors.primary} />
          }
          title={t('customer.no_customers')}
          description={t('customer.search_placeholder')}
        />
        <RoleGate require="owner">
          <View style={styles.bottomBar}>
            <AppButton
              label={t('customer.add_customer')}
              onPress={goToCreate}
              variant="primary"
              fullWidth
              disabled={!isConnected}
              accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
              leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.white} />}
              testID="customer-create-bottom"
            />
          </View>
        </RoleGate>
      </SafeAreaView>
    )
  }

  // ---- Empty (no customers at all) ----
  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <AppEmptyState
          icon={
            <Ionicons name="people-outline" size={componentSizes.icon.xxxl} color={colors.primary} />
          }
          title={t('customer.no_customers')}
          description={t('customer.no_customers_cta')}
          actionLabel={isConnected ? t('customer.add_customer') : undefined}
          onActionPress={isConnected ? goToCreate : undefined}
        />
        <RoleGate require="owner">
          <View style={styles.bottomBar}>
            <AppButton
              label={t('customer.add_customer')}
              onPress={goToCreate}
              variant="primary"
              fullWidth
              disabled={!isConnected}
              accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
              leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.white} />}
              testID="customer-create-bottom"
            />
          </View>
        </RoleGate>
      </SafeAreaView>
    )
  }

  // ---- Data state (grouped alphabetical sections) ----
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {offlineBanner}
      {controls}

      <View style={styles.countRow} testID="customer-total-count">
        <AppText variant="caption" color={colors.textSecondary}>
          {t('customer.total_count', { count: listTotal })}
        </AppText>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isListLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      <RoleGate require="owner">
        <View style={styles.bottomBar}>
          <AppButton
            label={t('customer.add_customer')}
            onPress={goToCreate}
            variant="primary"
            fullWidth
            disabled={!isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.white} />}
            testID="customer-create-bottom"
          />
        </View>
      </RoleGate>
    </SafeAreaView>
  )
}

export default function CustomerListScreen() {
  return (
    <ScreenErrorBoundary>
      <CustomerListScreenContent />
    </ScreenErrorBoundary>
  )
}

CustomerListScreen.displayName = 'CustomerListScreen'
