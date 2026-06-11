/**
 * StaffSupplyListsScreen — Staff read-only "My Lists" (US-005, WS-3 / OQ-5).
 * Purpose: The staff delivery entry point. Lists ONLY the lists the staff is assigned to
 * (the server scopes `GET .../supply-lists` by the JWT-derived staff role — we pass no
 * filter). Tapping a card opens the read-only SupplyListDetailScreen (no owner affordances,
 * gated in that screen via RoleGate/useRole). There are NO owner controls here: no +Add, no
 * create FAB. "View Today's Deliveries" lights up in US-006 (a disabled stub lives on detail).
 *
 * 5 states: Loading (skeleton), Empty ("No lists assigned yet"), Error (inline retry),
 * Content, Offline (cached lean lists shown; reads are offline-friendly).
 */

import React, { useCallback, useEffect } from 'react'
import { View, FlatList, StyleSheet, Platform, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { SupplyListCard } from '../components'
import { useSupplyListsStore } from '../store/supplyLists.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { SupplyListListDto } from '../../../types/supplyLists'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[10] },
  skeletonCard: { height: 120, marginBottom: spacing[2], backgroundColor: colors.gray100 },
})

function StaffListsSkeleton() {
  // Static placeholder cards (no FlatList) — the skeleton renders a fixed set of
  // shimmer rows, so a virtualized list adds no value and complicates testing.
  return (
    <View style={styles.listContent} testID="my-lists-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function StaffSupplyListsScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()

  const { lists, isListsLoading, listsError, fetchLists } = useSupplyListsStore(
    useShallow((s) => ({
      lists: s.lists,
      isListsLoading: s.isListsLoading,
      listsError: s.listsError,
      fetchLists: s.fetchLists,
    })),
  )

  useEffect(() => {
    void fetchLists('active', 1)
  }, [fetchLists])

  const goToDetail = useCallback(
    (listId: string) => {
      router.push(`/(app)/supply-lists/${listId}` as Href)
    },
    [router],
  )

  const renderItem = useCallback(
    ({ item }: { item: SupplyListListDto }) => (
      <SupplyListCard list={item} onPress={goToDetail} testID={`my-list-${item.id}`} />
    ),
    [goToDetail],
  )
  const keyExtractor = useCallback((l: SupplyListListDto) => l.id, [])

  const header = <AppHeader title={t('supply.my_lists_title')} />

  // Loading (first load, no cached data yet)
  if (isListsLoading && lists.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <StaffListsSkeleton />
      </SafeAreaView>
    )
  }

  // Error (no cached data to show)
  if (listsError && lists.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t(listsError)}
          actionLabel={t('common.retry')}
          onActionPress={() => void fetchLists('active', 1)}
        />
      </SafeAreaView>
    )
  }

  // Empty
  if (lists.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {!isConnected ? (
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        ) : null}
        <AppEmptyState
          icon={<Ionicons name="list-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('supply.empty_my_lists')}
        />
      </SafeAreaView>
    )
  }

  // Content (+ Offline banner)
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {!isConnected ? (
        <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
      ) : null}
      <FlatList
        data={lists}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isListsLoading}
            onRefresh={() => void fetchLists('active', 1)}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  )
}

export default function StaffSupplyListsScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffSupplyListsScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffSupplyListsScreen.displayName = 'StaffSupplyListsScreen'
