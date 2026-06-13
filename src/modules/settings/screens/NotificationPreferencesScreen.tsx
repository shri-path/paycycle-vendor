/**
 * NotificationPreferencesScreen (US-011, FEATURE_PLAN §2.2, S2)
 * Purpose: Manage notification preferences across 4 categories.
 *
 * States:
 *  Loading — AppLoader (if settings not cached)
 *  Error   — inline banner + retry
 *  Offline — AppAlert; Save disabled
 *  Populated — 4 NotificationCategorySection groups + Save button
 *
 * Defence-in-depth: useRequireOwner() redirects staff users.
 */

import React, { useCallback, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppLoader } from '@components/primitives/AppLoader'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useSettingsStore } from '../store/settings.store'
import { NotificationCategorySection } from '../components'
import type { NotificationPreferencesDto } from '../../../types/settings'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[10] },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.background,
  },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function NotificationPreferencesContent() {
  const { t } = useTranslation()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    settings,
    isLoading,
    error,
    isMutating,
    mutationError,
    fetchSettings,
    updateNotificationPreferences,
    clearError,
  } = useSettingsStore(
    useShallow((s) => ({
      settings: s.settings,
      isLoading: s.isLoading,
      error: s.error,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      fetchSettings: s.fetchSettings,
      updateNotificationPreferences: s.updateNotificationPreferences,
      clearError: s.clearError,
    })),
  )

  // Local form copy of notif prefs for dirty tracking.
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferencesDto | null>(
    settings?.notificationPreferences ?? null,
  )

  useFocusEffect(
    useCallback(() => {
      void fetchSettings()
      return () => clearError()
    }, [fetchSettings, clearError]),
  )

  // Sync local prefs when settings load/change.
  React.useEffect(() => {
    if (settings?.notificationPreferences && !localPrefs) {
      setLocalPrefs({ ...settings.notificationPreferences })
    }
  }, [settings, localPrefs])

  const isDirty =
    localPrefs !== null &&
    settings !== null &&
    JSON.stringify(localPrefs) !== JSON.stringify(settings.notificationPreferences)

  const handleToggle = useCallback(
    (category: keyof NotificationPreferencesDto, key: string, value: boolean) => {
      setLocalPrefs((prev) =>
        prev
          ? {
              ...prev,
              [category]: {
                ...(prev[category] as Record<string, boolean>),
                [key]: value,
              },
            }
          : null,
      )
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!localPrefs) return
    try {
      await updateNotificationPreferences(localPrefs)
    } catch {
      // error is set in the store; banner handles it
    }
  }, [localPrefs, updateNotificationPreferences])

  // Loading (no cached data)
  if (isLoading && !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.notifications_title')} showBack />
        <AppLoader />
      </SafeAreaView>
    )
  }

  if (error && !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.notifications_title')} showBack />
        <View style={styles.centeredState}>
          <AppEmptyState
            title={t('common.error')}
            description={t('settings.error_load_settings')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchSettings()}
          />
        </View>
      </SafeAreaView>
    )
  }

  const prefs = localPrefs ?? settings?.notificationPreferences

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('settings.notifications_title')} showBack />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={styles.alertRow}>
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(mutationError)}
            onClose={clearError}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {prefs ? (
          <>
            {/* Channels */}
            <NotificationCategorySection
              title={t('settings.notif_channels_title')}
              items={[
                { key: 'push', label: t('settings.notif_push'), value: prefs.channels.push },
                { key: 'whatsapp', label: t('settings.notif_whatsapp'), value: prefs.channels.whatsapp },
                { key: 'sms', label: t('settings.notif_sms'), value: prefs.channels.sms },
              ]}
              disabled={!isConnected || isMutating}
              onToggle={(key, value) =>
                handleToggle('channels', key, value)
              }
            />

            {/* Payment */}
            <NotificationCategorySection
              title={t('settings.notif_payment_title')}
              items={[
                {
                  key: 'paymentReceived',
                  label: t('settings.notif_payment_received'),
                  value: prefs.payment.paymentReceived,
                },
                {
                  key: 'outstandingAlert',
                  label: t('settings.notif_outstanding_alert'),
                  value: prefs.payment.outstandingAlert,
                },
                {
                  key: 'creditLimitBreach',
                  label: t('settings.notif_credit_breach'),
                  value: prefs.payment.creditLimitBreach,
                },
              ]}
              disabled={!isConnected || isMutating}
              onToggle={(key, value) =>
                handleToggle('payment', key, value)
              }
            />

            {/* Customer */}
            <NotificationCategorySection
              title={t('settings.notif_customer_title')}
              items={[
                {
                  key: 'customerMarkedLeave',
                  label: t('settings.notif_customer_leave'),
                  value: prefs.customer.customerMarkedLeave,
                },
                {
                  key: 'customerAdjustedQty',
                  label: t('settings.notif_customer_qty'),
                  value: prefs.customer.customerAdjustedQty,
                },
                {
                  key: 'newCustomerJoined',
                  label: t('settings.notif_new_customer'),
                  value: prefs.customer.newCustomerJoined,
                },
                {
                  key: 'customerOverride',
                  label: t('settings.notif_customer_override'),
                  value: prefs.customer.customerOverride,
                },
              ]}
              disabled={!isConnected || isMutating}
              onToggle={(key, value) =>
                handleToggle('customer', key, value)
              }
            />

            {/* Operations */}
            <NotificationCategorySection
              title={t('settings.notif_operations_title')}
              items={[
                {
                  key: 'lowStockAlert',
                  label: t('settings.notif_low_stock'),
                  value: prefs.operations.lowStockAlert,
                },
                {
                  key: 'staffActivitySummary',
                  label: t('settings.notif_staff_summary'),
                  value: prefs.operations.staffActivitySummary,
                },
                {
                  key: 'dailyDigest',
                  label: t('settings.notif_daily_digest'),
                  value: prefs.operations.dailyDigest,
                },
              ]}
              disabled={!isConnected || isMutating}
              onToggle={(key, value) =>
                handleToggle('operations', key, value)
              }
            />
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('settings.save_settings')}
          variant="primary"
          disabled={!isDirty || !isConnected || isMutating}
          loading={isMutating}
          onPress={() => { void handleSave() }}
          testID="save-notif-prefs-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function NotificationPreferencesScreen() {
  return (
    <ScreenErrorBoundary>
      <NotificationPreferencesContent />
    </ScreenErrorBoundary>
  )
}

NotificationPreferencesScreen.displayName = 'NotificationPreferencesScreen'
