/**
 * PriorityListScreen [S2] (US-012, T-13, wireframe 2.34)
 * Purpose: Grouped FlatList of customers by priority, with inline Remind/Call/Block.
 *
 * 5 states: Loading / Empty / Error / Populated / Offline
 * Owner-only. Refetches on focus.
 */

import React, { useCallback, useMemo } from 'react'
import { View, FlatList, SectionList, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import { CreditPriorityCard, AdvanceCreditRow, SortDropdown } from '../components'
import type { CreditPriorityCustomer, AdvanceCreditEntry, PrioritySort } from '../../../types/credit'
import type { CreditPriority } from '../components'

interface PrioritySection {
  title: string
  priority: CreditPriority
  data: CreditPriorityCustomer[]
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.background,
  },
  cardWrap: { paddingHorizontal: spacing[4] },
  advanceSection: { paddingHorizontal: spacing[4], marginTop: spacing[2] },
  sortRow: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  footer: { paddingBottom: spacing[10] },
})

function PriorityListContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    priorityList,
    isPriorityLoading,
    priorityError,
    prioritySort,
    remindingCustomerIds,
    fetchPriorityList,
    sendReminder,
    clearErrors,
  } = useCreditStore(
    useShallow((s) => ({
      priorityList: s.priorityList,
      isPriorityLoading: s.isPriorityLoading,
      priorityError: s.priorityError,
      prioritySort: s.prioritySort,
      remindingCustomerIds: s.remindingCustomerIds,
      fetchPriorityList: s.fetchPriorityList,
      sendReminder: s.sendReminder,
      clearErrors: s.clearErrors,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchPriorityList()
      return () => clearErrors()
    }, [fetchPriorityList, clearErrors]),
  )

  const handleSortChange = useCallback(
    (sort: PrioritySort) => {
      void fetchPriorityList(sort)
    },
    [fetchPriorityList],
  )

  const handleRemind = useCallback(
    async (customerId: string) => {
      try {
        const result = await sendReminder(customerId)
        if (result.skipped) {
          // Soft outcome — info haptic, not success
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    },
    [sendReminder],
  )

  const handleBlock = useCallback(
    (customerId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      router.push(`/(app)/customers/${customerId}/enable-prepaid` as Href)
    },
    [router],
  )

  const sections: PrioritySection[] = useMemo(() => {
    if (!priorityList) return []
    const result: PrioritySection[] = []
    if (priorityList.highPriority.length > 0)
      result.push({ title: t('credit.priority_high'), priority: 'high', data: priorityList.highPriority })
    if (priorityList.mediumPriority.length > 0)
      result.push({ title: t('credit.priority_medium'), priority: 'medium', data: priorityList.mediumPriority })
    if (priorityList.lowPriority.length > 0)
      result.push({ title: t('credit.priority_low'), priority: 'low', data: priorityList.lowPriority })
    return result
  }, [priorityList, t])

  if (isPriorityLoading && !priorityList) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.priority_list_title')} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (priorityError && !priorityList) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.priority_list_title')} showBack />
        <View style={styles.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('credit.error_load_priority')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchPriorityList()}
          />
        </View>
      </SafeAreaView>
    )
  }

  const advanceEntries = priorityList?.advanceCredit ?? []
  const totalPriority =
    (priorityList?.highPriority.length ?? 0) +
    (priorityList?.mediumPriority.length ?? 0) +
    (priorityList?.lowPriority.length ?? 0)

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('credit.priority_list_title')} showBack />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {priorityError && priorityList ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <View style={styles.sortRow}>
        <SortDropdown
          value={prioritySort}
          onChange={handleSortChange}
          disabled={isPriorityLoading}
        />
      </View>

      {totalPriority === 0 && advanceEntries.length === 0 ? (
        <View style={styles.center}>
          <AppEmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={componentSizes.icon.xxxl} color={colors.success} />}
            title={t('credit.priority_empty_title')}
            description={t('credit.priority_empty_desc')}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.customerId}
          contentContainerStyle={styles.footer}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <AppText variant="body" weight="semibold" color={colors.textPrimary}>
                {section.title} ({section.data.length})
              </AppText>
            </View>
          )}
          renderItem={({ item, section }) => (
            <View style={styles.cardWrap}>
              <CreditPriorityCard
                customer={item}
                priority={section.priority}
                isReminding={remindingCustomerIds.includes(item.customerId)}
                isConnected={isConnected ?? true}
                onRemind={(id) => void handleRemind(id)}
                onBlock={handleBlock}
              />
            </View>
          )}
          ListFooterComponent={
            advanceEntries.length > 0 ? (
              <View style={styles.advanceSection}>
                <AppText variant="body" weight="semibold" color={colors.textPrimary} style={{ marginBottom: spacing[2] }}>
                  {t('credit.advance_credit_section', { count: advanceEntries.length })}
                </AppText>
                <FlatList
                  data={advanceEntries}
                  keyExtractor={(e: AdvanceCreditEntry) => e.customerId}
                  renderItem={({ item }) => <AdvanceCreditRow entry={item} />}
                  scrollEnabled={false}
                />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

export default function PriorityListScreen() {
  return (
    <ScreenErrorBoundary>
      <PriorityListContent />
    </ScreenErrorBoundary>
  )
}

PriorityListScreen.displayName = 'PriorityListScreen'
