/**
 * VendorSettingsScreen (US-011, FEATURE_PLAN §2.1, S1)
 * Purpose: Owner configuration — automation, credit defaults, bulk operations nav,
 *          and notifications management entry.
 *
 * States:
 *  Loading  — AppLoader (first load, no cached data)
 *  Error    — inline banner + retry
 *  Offline  — AppAlert banner; Save disabled
 *  Populated — all sections + sticky Save button (disabled until dirty or offline)
 *
 * Defence-in-depth: useRequireOwner() redirects staff users.
 * OQ-5 resolution: settings store is the single writer of VendorSettingsDto.
 */

import React, { useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href, useFocusEffect } from 'expo-router'
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
import { useSettingsForm } from '../hooks/useSettingsForm'
import {
  AutomationSection,
  DefaultCreditSection,
  BulkOperationsSection,
} from '../components'
import type { CreditBreachAction } from '../../../types/settings'

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
  notifButton: { marginBottom: spacing[3] },
})

function VendorSettingsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    settings,
    isLoading,
    error,
    mutationError,
    fetchSettings,
    clearError,
  } = useSettingsStore(
    useShallow((s) => ({
      settings: s.settings,
      isLoading: s.isLoading,
      error: s.error,
      mutationError: s.mutationError,
      fetchSettings: s.fetchSettings,
      clearError: s.clearError,
    })),
  )

  const { form, isDirty, update, save, isSaving } = useSettingsForm(settings)

  useFocusEffect(
    useCallback(() => {
      void fetchSettings()
      return () => clearError()
    }, [fetchSettings, clearError]),
  )

  const handleSave = useCallback(async () => {
    try {
      await save()
    } catch {
      // error is set in the store; banner handles it
    }
  }, [save])

  // Loading (no cached data)
  if (isLoading && !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.vendor_settings_title')} showBack />
        <AppLoader />
      </SafeAreaView>
    )
  }

  // Error (no cached data)
  if (error && !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.vendor_settings_title')} showBack />
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('settings.vendor_settings_title')} showBack />

      {/* Offline banner */}
      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {/* Mutation error banner */}
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {form ? (
          <>
            <AutomationSection
              autoMarkEnabled={form.autoMarkEnabled}
              autoSendBillsEnabled={form.autoSendBillsEnabled}
              autoSendBillsTime={form.autoSendBillsTime}
              disabled={!isConnected || isSaving}
              onAutoMarkChange={(v) => update({ autoMarkEnabled: v })}
              onAutoSendChange={(v) => update({ autoSendBillsEnabled: v })}
              onSendTimeChange={(time) => update({ autoSendBillsTime: time })}
            />

            <DefaultCreditSection
              creditLimit={form.defaultCreditLimit}
              creditAction={form.defaultCreditAction}
              disabled={!isConnected || isSaving}
              onCreditLimitChange={(v) => update({ defaultCreditLimit: v })}
              onCreditActionChange={(v: CreditBreachAction) => update({ defaultCreditAction: v })}
            />

            <BulkOperationsSection />

            <AppButton
              label={t('settings.manage_notifications')}
              variant="secondary"
              style={styles.notifButton}
              onPress={() => router.push('/(app)/settings/notifications' as Href)}
              testID="manage-notifications-btn"
            />
          </>
        ) : null}
      </ScrollView>

      {/* Sticky footer Save button */}
      <View style={styles.footer}>
        <AppButton
          label={t('settings.save_settings')}
          variant="primary"
          disabled={!isDirty || !isConnected || isSaving}
          loading={isSaving}
          onPress={() => { void handleSave() }}
          testID="save-settings-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function VendorSettingsScreen() {
  return (
    <ScreenErrorBoundary>
      <VendorSettingsContent />
    </ScreenErrorBoundary>
  )
}

VendorSettingsScreen.displayName = 'VendorSettingsScreen'
