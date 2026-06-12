/**
 * ConflictsScreen — Owner (US-007).
 * Lists deliveries where an owner/customer override contradicts the staff mark.
 * 5 states: Loading / Error / Empty / Data (no filtered-empty — conflicts are unfiltered).
 * Owner-only: guarded by `useRequireOwner` + the owner route group.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { ConflictCard } from '../components'
import { useAuditStore } from '../store/audit.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import type { ConflictDto } from '../../../types/audit'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  skeletonCard: { height: 120, marginBottom: spacing[2], backgroundColor: colors.gray100 },
})

function ConflictsSkeleton() {
  return (
    <View style={styles.listContent} testID="conflicts-skeleton">
      {[0, 1].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function ConflictsScreenContent() {
  useRequireOwner()
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()

  const {
    conflicts,
    isConflictsLoading,
    conflictsError,
    fetchConflicts,
    clearError,
  } = useAuditStore(
    useShallow((s) => ({
      conflicts: s.conflicts,
      isConflictsLoading: s.isConflictsLoading,
      conflictsError: s.conflictsError,
      fetchConflicts: s.fetchConflicts,
      clearError: s.clearError,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchConflicts()
    }, [fetchConflicts]),
  )

  const onRefresh = useCallback(() => {
    clearError()
    void fetchConflicts()
  }, [fetchConflicts, clearError])

  const renderItem = useCallback(
    ({ item }: { item: ConflictDto }) => (
      <ConflictCard conflict={item} testID={`conflict-card-${item.id}`} />
    ),
    [],
  )
  const keyExtractor = useCallback((c: ConflictDto) => c.id, [])

  const header = (
    <AppHeader title={t('audit.title_conflicts')} showBack onBackPress={() => router.back()} />
  )
  const offlineBanner = !isConnected ? (
    <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
  ) : null

  if (isConflictsLoading && conflicts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <ConflictsSkeleton />
      </SafeAreaView>
    )
  }

  if (conflictsError && conflicts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <AppEmptyState
          title={t('common.error')}
          description={t(conflictsError)}
          actionLabel={t('common.retry')}
          onActionPress={onRefresh}
        />
      </SafeAreaView>
    )
  }

  if (conflicts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <AppEmptyState title={t('audit.no_conflicts')} description={t('audit.no_conflicts_desc')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {offlineBanner}
      <FlatList
        data={conflicts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isConflictsLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  )
}

export default function ConflictsScreen() {
  return (
    <ScreenErrorBoundary>
      <ConflictsScreenContent />
    </ScreenErrorBoundary>
  )
}

ConflictsScreen.displayName = 'ConflictsScreen'
