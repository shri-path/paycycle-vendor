/**
 * QuickMarkScreen — /(app)/deliveries/quick-mark (US-006, WS-2).
 * Fast swipe/tap marking across all of the staff's assigned lists for today. Top
 * progress + "Remaining: X", a centred QuickMarkCard (swipe or buttons), advancing
 * on each successful mark. All-done empty state. Writes are online-only: offline
 * blocks entry with a notice. Reduce-motion falls back to buttons. Aggregates
 * pending deliveries across assigned lists via the store queue.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { QuickMarkCard } from '../components/QuickMarkCard'
import { useDeliveryStore } from '../store/delivery.store'
import { useRolesStore } from '@modules/roles/store/roles.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { MarkableStatus } from '../../../types/delivery'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  banner: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing[4] },
})

function QuickMarkScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const reduceMotion = useReducedMotion()

  const assignedListIds = useRolesStore(useShallow((s) => s.assignedListIds))

  const {
    quickQueue,
    quickIndex,
    isQuickLoading,
    quickError,
    buildQuickQueue,
    advanceQuick,
    markDelivery,
  } = useDeliveryStore(
    useShallow((s) => ({
      quickQueue: s.quickQueue,
      quickIndex: s.quickIndex,
      isQuickLoading: s.isQuickLoading,
      quickError: s.quickError,
      buildQuickQueue: s.buildQuickQueue,
      advanceQuick: s.advanceQuick,
      markDelivery: s.markDelivery,
    })),
  )

  useEffect(() => {
    // Online-only entry — don't build the queue while offline.
    if (isConnected && assignedListIds.length > 0) {
      void buildQuickQueue(assignedListIds)
    }
  }, [isConnected, assignedListIds, buildQuickQueue])

  const current = quickQueue[quickIndex] ?? null
  const total = quickQueue.length
  const remaining = Math.max(0, total - quickIndex)

  // We need the owning list of the current delivery to mark it. The queue items
  // carry no listId, so resolve from the per-list cache by membership.
  const listDeliveries = useDeliveryStore(useShallow((s) => s.listDeliveries))
  const findListId = useCallback(
    (deliveryId: string): string | null => {
      for (const [lid, rows] of Object.entries(listDeliveries)) {
        if (rows.some((d) => d.id === deliveryId)) return lid
      }
      return assignedListIds[0] ?? null
    },
    [listDeliveries, assignedListIds],
  )

  const onMark = useCallback(
    async (status: MarkableStatus) => {
      if (!current || !isConnected) return
      const listId = findListId(current.id)
      if (!listId) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      try {
        await markDelivery(listId, current.id, status)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        advanceQuick()
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    },
    [current, isConnected, findListId, markDelivery, advanceQuick],
  )

  const onDelivered = useCallback(() => void onMark('DELIVERED'), [onMark])
  const onLeave = useCallback(() => void onMark('LEAVE'), [onMark])

  const progressLabel = useMemo(
    () => t('delivery.remaining', { count: remaining }),
    [t, remaining],
  )

  const header = (
    <AppHeader title={t('delivery.title_quick_mark')} showBack onBackPress={() => router.back()} />
  )

  // Offline — block entry (writes are online-only).
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <View style={styles.banner}>
          <AppAlert type="warning" title={t('common.offline')} message={t('delivery.quick_offline_blocked')} />
        </View>
        <AppEmptyState
          icon={<Ionicons name="cloud-offline-outline" size={componentSizes.icon.xxxl} color={colors.warning} />}
          title={t('common.offline')}
          description={t('delivery.quick_offline_blocked')}
        />
      </SafeAreaView>
    )
  }

  // Loading
  if (isQuickLoading && total === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="hourglass-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('common.loading')}
        />
      </SafeAreaView>
    )
  }

  // Error
  if (quickError && total === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t(quickError)}
          actionLabel={t('common.retry')}
          onActionPress={() => void buildQuickQueue(assignedListIds)}
        />
      </SafeAreaView>
    )
  }

  // All done / empty
  if (!current) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="checkmark-done-circle-outline" size={componentSizes.icon.xxxl} color={colors.success} />}
          title={t('delivery.all_done')}
          actionLabel={t('common.back')}
          onActionPress={() => router.back()}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      <View style={styles.top}>
        <AppProgressBar value={quickIndex} max={total > 0 ? total : 1} variant="success" label={progressLabel} />
      </View>
      <View style={styles.cardArea}>
        <QuickMarkCard
          delivery={current}
          position={quickIndex + 1}
          total={total}
          onSwipeDelivered={onDelivered}
          onSwipeLeave={onLeave}
          reduceMotion={reduceMotion}
          testID="quick-mark-card"
        />
      </View>
    </SafeAreaView>
  )
}

export default function QuickMarkScreen() {
  return (
    <ScreenErrorBoundary>
      <QuickMarkScreenContent />
    </ScreenErrorBoundary>
  )
}

QuickMarkScreen.displayName = 'QuickMarkScreen'
