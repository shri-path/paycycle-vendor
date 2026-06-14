/**
 * ReminderHistoryScreen [S6] (US-012, T-17, wireframe 2.38)
 * Purpose: Summary + paginated FlatList of reminder history + Send Another.
 *
 * Skip-aware soft outcome: skipped=true → info haptic, info toast, no refetch-as-sent.
 * Owner-only: useRequireOwner().
 */

import React, { useCallback, useState } from 'react'
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import { ReminderTimelineItem } from '../components'
import type { ReminderHistoryItem } from '../../../types/credit'

const ITEM_HEIGHT = 80

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  summaryCard: { margin: spacing[4], padding: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  sendRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  skippedInfo: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
})

function ReminderHistoryContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { customerId } = useLocalSearchParams<{ customerId: string }>()

  const {
    history,
    isHistoryLoading,
    historyError,
    remindingCustomerIds,
    fetchReminderHistory,
    sendReminder,
    clearErrors,
  } = useCreditStore(
    useShallow((s) => ({
      history: s.history,
      isHistoryLoading: s.isHistoryLoading,
      historyError: s.historyError,
      remindingCustomerIds: s.remindingCustomerIds,
      fetchReminderHistory: s.fetchReminderHistory,
      sendReminder: s.sendReminder,
      clearErrors: s.clearErrors,
    })),
  )

  const [skippedInfo, setSkippedInfo] = useState<string | null>(null)
  const isSending = customerId ? remindingCustomerIds.includes(customerId) : false

  useFocusEffect(
    useCallback(() => {
      if (customerId) void fetchReminderHistory(customerId)
      return () => clearErrors()
    }, [customerId, fetchReminderHistory, clearErrors]),
  )

  const handleSendAnother = useCallback(async () => {
    if (!customerId || isSending || !isConnected) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const result = await sendReminder(customerId)
      if (result.skipped) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        setSkippedInfo(t(`credit.skip_reason_${result.skipReason ?? 'unknown'}`))
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        // Refresh history to show the new reminder
        void fetchReminderHistory(customerId)
      }
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [customerId, isSending, isConnected, sendReminder, t, fetchReminderHistory])

  const historyData = customerId ? (history[customerId] ?? null) : null

  if (isHistoryLoading && !historyData) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.reminder_history_title')} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (historyError && !historyData) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.reminder_history_title')} showBack />
        <View style={styles.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('credit.error_load_history')}
            actionLabel={t('common.retry')}
            onActionPress={() => customerId && void fetchReminderHistory(customerId)}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('credit.reminder_history_title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {skippedInfo ? (
        <View style={styles.skippedInfo}>
          <AppAlert
            type="info"
            title={t('credit.reminder_skipped_title')}
            message={skippedInfo}
            onClose={() => setSkippedInfo(null)}
          />
        </View>
      ) : null}

      {historyError && historyData ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      {/* Summary card */}
      {historyData ? (
        <AppCard style={styles.summaryCard} testID="reminder-summary-card">
          <View style={styles.summaryRow}>
            <View>
              <AppText variant="caption" color={colors.textSecondary}>{t('credit.total_reminders')}</AppText>
              <AppText variant="h3" weight="bold" color={colors.textPrimary}>{historyData.totalReminders}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color={colors.textSecondary}>{t('credit.success_rate')}</AppText>
              <AppText variant="h3" weight="bold" color={colors.success}>{historyData.successRate}%</AppText>
            </View>
          </View>
        </AppCard>
      ) : null}

      {/* Send Another button */}
      <View style={styles.sendRow}>
        <AppButton
          label={isSending ? t('credit.reminding') : t('credit.send_another_reminder')}
          variant="secondary"
          disabled={!isConnected || isSending}
          loading={isSending}
          onPress={() => void handleSendAnother()}
          testID="send-another-btn"
        />
      </View>

      <FlatList
        data={historyData?.reminders ?? []}
        keyExtractor={(item: ReminderHistoryItem) => item.id}
        contentContainerStyle={styles.content}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        renderItem={({ item }) => <ReminderTimelineItem item={item} />}
        ListEmptyComponent={
          <AppEmptyState
            title={t('credit.history_empty_title')}
            description={t('credit.history_empty_desc')}
          />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (customerId && historyData && !isHistoryLoading) {
            // Load next page (simple pagination)
            void fetchReminderHistory(customerId, 2)
          }
        }}
      />
    </SafeAreaView>
  )
}

export default function ReminderHistoryScreen() {
  return (
    <ScreenErrorBoundary>
      <ReminderHistoryContent />
    </ScreenErrorBoundary>
  )
}

ReminderHistoryScreen.displayName = 'ReminderHistoryScreen'
