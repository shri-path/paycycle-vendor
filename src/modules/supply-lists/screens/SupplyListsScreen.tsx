/**
 * SupplyListsScreen — Owner-only (US-005, FEATURE_PLAN §1, wireframe 2.2).
 * Purpose: List the vendor's supply lists with a client-side debounced search,
 * an Active/Archived status filter, pull-to-refresh, and two ≤2-tap entry points
 * to create a list (header +Add and a bottom "+ Create List" button).
 *
 * 5 states: Loading (skeleton cards), Empty, Error (inline retry), Content, Offline
 * (banner; persisted lean lists still render from cache).
 *
 * Performance: FlatList + memoized SupplyListCard; staggered fade-in capped to the
 * first ~10 rows and disabled under reduced-motion (2 GB-device budget).
 * Security: owner-gated via useRequireOwner + RoleGate; vendorId is JWT-derived in
 * the store (never from params).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, FlatList, StyleSheet, RefreshControl, Platform } from 'react-native'
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
import { AppSearchBar } from '@components/composite/AppSearchBar'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { RoleGate } from '@components/composite/RoleGate'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { SupplyListCard } from '../components'
import { useSupplyListsStore } from '../store/supplyLists.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { SupplyListListDto, SupplyListStatus } from '../../../types/supplyLists'

/** Rows past this index render without entry animation (low-end device budget). */
const ANIMATED_ROW_CAP = 10
const SEARCH_DEBOUNCE_MS = 300

const STATUS_BY_INDEX: SupplyListStatus[] = ['active', 'archived']

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  sectionRow: { paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[24] },
  skeletonCard: { height: 120, marginBottom: spacing[2], backgroundColor: colors.gray100 },
  bottomBar: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[6],
  },
})

function SupplyListsSkeleton() {
  return (
    <View style={styles.listContent} testID="supply-lists-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function SupplyListsScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const reducedMotion = useReducedMotion()
  useRequireOwner()

  const {
    lists,
    listStatusFilter,
    isListsLoading,
    listsError,
    setListStatusFilter,
    fetchLists,
  } = useSupplyListsStore(
    useShallow((s) => ({
      lists: s.lists,
      listStatusFilter: s.listStatusFilter,
      isListsLoading: s.isListsLoading,
      listsError: s.listsError,
      setListStatusFilter: s.setListStatusFilter,
      fetchLists: s.fetchLists,
    })),
  )

  // Client-side debounced search (FEATURE_PLAN §1 — 300 ms).
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  useEffect(() => {
    void fetchLists(listStatusFilter, 1)
  }, [fetchLists, listStatusFilter])

  const selectedIndex = listStatusFilter === 'archived' ? 1 : 0

  const onChangeStatus = useCallback(
    (index: number) => {
      const next = STATUS_BY_INDEX[index] ?? 'active'
      if (next === listStatusFilter) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setListStatusFilter(next)
    },
    [listStatusFilter, setListStatusFilter],
  )

  // Client-side filter over the cached lists (case-insensitive name match).
  const filteredLists = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return lists
    return lists.filter((l) => l.name.toLowerCase().includes(q))
  }, [lists, debouncedSearch])

  const goToDetail = useCallback(
    (listId: string) => {
      // SupplyListCard fires the Light haptic; this just navigates.
      // Cast: the typed-route table is generated by WS-4's route files.
      router.push(`/(app)/supply-lists/${listId}` as Href)
    },
    [router],
  )

  const goToCreate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/supply-lists/create' as Href)
  }, [router])

  const renderItem = useCallback(
    ({ item, index }: { item: SupplyListListDto; index: number }) => {
      const card = (
        <SupplyListCard list={item} onPress={goToDetail} testID={`supply-list-card-${item.id}`} />
      )
      if (reducedMotion || index >= ANIMATED_ROW_CAP) return card
      return <Animated.View entering={FadeInDown.delay(index * 30).duration(220)}>{card}</Animated.View>
    },
    [goToDetail, reducedMotion],
  )

  const keyExtractor = useCallback((l: SupplyListListDto) => l.id, [])

  const sectionTitle =
    listStatusFilter === 'archived'
      ? t('supply.archived_lists', { count: filteredLists.length })
      : t('supply.active_lists', { count: filteredLists.length })

  const header = (
    <AppHeader
      title={t('supply.title')}
      showBack
      onBackPress={() => router.back()}
      rightAction={
        <RoleGate require="owner">
          <AppIconButton
            icon={<Ionicons name="add" size={componentSizes.icon.lg} color={colors.white} />}
            onPress={goToCreate}
            variant="ghost"
            testID="supply-add-header"
          />
        </RoleGate>
      }
    />
  )

  const offlineBanner = !isConnected ? (
    <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
  ) : null

  // Loading (first load, nothing cached yet)
  if (isListsLoading && lists.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <SupplyListsSkeleton />
      </SafeAreaView>
    )
  }

  // Error (no cached data to fall back on)
  if (listsError && lists.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <AppEmptyState
          icon={
            <Ionicons
              name="alert-circle-outline"
              size={componentSizes.icon.xxxl}
              color={colors.error}
            />
          }
          title={t('common.error')}
          description={t(listsError)}
          actionLabel={t('common.retry')}
          onActionPress={() => void fetchLists(listStatusFilter, 1)}
        />
      </SafeAreaView>
    )
  }

  const isEmpty = filteredLists.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {offlineBanner}

      <View style={styles.controls}>
        <AppSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          onClear={() => setSearchInput('')}
          placeholder={t('supply.search_lists')}
          accessibilityLabel={t('supply.search_lists')}
          searchIcon={
            <Ionicons name="search" size={componentSizes.icon.md} color={colors.textSecondary} />
          }
          clearIcon={
            <Ionicons name="close" size={componentSizes.icon.md} color={colors.textSecondary} />
          }
          testID="supply-search"
        />
        <AppSegmentedControl
          segments={[t('supply.status_active'), t('supply.status_ended')]}
          selectedIndex={selectedIndex}
          onChange={onChangeStatus}
        />
      </View>

      {isEmpty ? (
        <AppEmptyState
          icon={
            <Ionicons name="list-outline" size={componentSizes.icon.xxxl} color={colors.primary} />
          }
          title={t('supply.empty_lists')}
          description={t('supply.empty_lists_cta')}
          actionLabel={isConnected ? t('supply.create_list') : undefined}
          onActionPress={isConnected ? goToCreate : undefined}
        />
      ) : (
        <FlatList
          data={filteredLists}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <View style={styles.sectionRow}>
              <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
                {sectionTitle}
              </AppText>
            </View>
          }
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isListsLoading}
              onRefresh={() => void fetchLists(listStatusFilter, 1)}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <RoleGate require="owner">
        <View style={styles.bottomBar}>
          <AppButton
            label={t('supply.create_list')}
            onPress={goToCreate}
            variant="primary"
            fullWidth
            disabled={!isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.white} />}
            testID="supply-create-bottom"
          />
        </View>
      </RoleGate>
    </SafeAreaView>
  )
}

export default function SupplyListsScreen() {
  return (
    <ScreenErrorBoundary>
      <SupplyListsScreenContent />
    </ScreenErrorBoundary>
  )
}

SupplyListsScreen.displayName = 'SupplyListsScreen'
