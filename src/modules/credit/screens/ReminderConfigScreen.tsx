/**
 * ReminderConfigScreen [S5] (US-012, T-16, wireframe 2.37)
 * Purpose: Toggle auto-reminders, schedules (≥1 if auto on), template, exclusions.
 *
 * Business rules:
 * - If autoRemindersEnabled=true, at least one schedule must be true (block save)
 * - Template placeholders must be from the known set (client-side pre-submit)
 *
 * Owner-only: useRequireOwner(). Fetches config on focus.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppToggle } from '@components/primitives/AppToggle'
import { AppText } from '@components/primitives/AppText'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import { ReminderTemplateEditor, ExcludedCustomersField } from '../components'
import { KNOWN_REMINDER_PLACEHOLDERS } from '../../../types/credit'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[16] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.background,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    marginBottom: spacing[3],
  },
  sectionTitle: { marginTop: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})

function extractUnknownPlaceholders(template: string): string[] {
  const regex = /\{[^}]+\}/g
  const found = template.match(regex) ?? []
  const known = new Set<string>(KNOWN_REMINDER_PLACEHOLDERS)
  return found.filter((ph) => !known.has(ph))
}

function ReminderConfigContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    reminderConfig,
    isReminderConfigLoading,
    reminderConfigError,
    isMutating,
    mutationError,
    fetchReminderConfig,
    updateReminderConfig,
    clearErrors,
  } = useCreditStore(
    useShallow((s) => ({
      reminderConfig: s.reminderConfig,
      isReminderConfigLoading: s.isReminderConfigLoading,
      reminderConfigError: s.reminderConfigError,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      fetchReminderConfig: s.fetchReminderConfig,
      updateReminderConfig: s.updateReminderConfig,
      clearErrors: s.clearErrors,
    })),
  )

  const [autoEnabled, setAutoEnabled] = useState(false)
  const [schedule3, setSchedule3] = useState(true)
  const [schedule15, setSchedule15] = useState(true)
  const [schedule30, setSchedule30] = useState(true)
  const [template, setTemplate] = useState('')
  const [excludedIds, setExcludedIds] = useState<string[]>([])
  const [scheduleError, setScheduleError] = useState<string | undefined>()
  const [templateError, setTemplateError] = useState<string | undefined>()

  const busy = useRef(false)

  // Populate form from fetched config
  useEffect(() => {
    if (reminderConfig) {
      setAutoEnabled(reminderConfig.autoRemindersEnabled)
      setSchedule3(reminderConfig.schedule3Days)
      setSchedule15(reminderConfig.schedule15Days)
      setSchedule30(reminderConfig.schedule30Days)
      setTemplate(reminderConfig.reminderTemplate ?? '')
      setExcludedIds(reminderConfig.excludedCustomerIds)
    }
  }, [reminderConfig])

  useFocusEffect(
    useCallback(() => {
      void fetchReminderConfig()
      return () => clearErrors()
    }, [fetchReminderConfig, clearErrors]),
  )

  const validate = useCallback((): boolean => {
    if (autoEnabled && !schedule3 && !schedule15 && !schedule30) {
      setScheduleError(t('credit.error_schedule_required'))
      return false
    }
    setScheduleError(undefined)
    if (template) {
      const unknown = extractUnknownPlaceholders(template)
      if (unknown.length > 0) {
        setTemplateError(t('credit.error_unknown_placeholders', { placeholders: unknown.join(', ') }))
        return false
      }
    }
    setTemplateError(undefined)
    return true
  }, [autoEnabled, schedule3, schedule15, schedule30, template, t])

  const handleSave = useCallback(async () => {
    if (busy.current || !isConnected) return
    if (!validate()) return
    busy.current = true
    clearErrors()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await updateReminderConfig({
        autoRemindersEnabled: autoEnabled,
        schedule3Days: schedule3,
        schedule15Days: schedule15,
        schedule30Days: schedule30,
        reminderTemplate: template || undefined,
        excludedCustomerIds: excludedIds,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      busy.current = false
    }
  }, [
    isConnected,
    validate,
    clearErrors,
    autoEnabled,
    schedule3,
    schedule15,
    schedule30,
    template,
    excludedIds,
    updateReminderConfig,
    router,
  ])

  const writesDisabled = !isConnected || isMutating

  if (isReminderConfigLoading && !reminderConfig) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.reminder_config_title')} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('credit.reminder_config_title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} onClose={clearErrors} />
        </View>
      ) : null}

      {reminderConfigError ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Auto-reminders toggle */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {t('credit.auto_reminders_label')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('credit.auto_reminders_desc')}
            </AppText>
          </View>
          <AppToggle
            value={autoEnabled}
            onChange={setAutoEnabled}
            disabled={writesDisabled}
          />
        </View>

        {/* Schedule checkboxes */}
        <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
          {t('credit.schedule_label')}
        </AppText>
        {scheduleError ? (
          <AppText variant="caption" color={colors.error} style={{ marginBottom: spacing[2] }}>
            {scheduleError}
          </AppText>
        ) : null}

        <AppCheckbox
          label={t('credit.schedule_3_days')}
          checked={schedule3}
          onChange={setSchedule3}
          disabled={writesDisabled || !autoEnabled}
        />
        <AppCheckbox
          label={t('credit.schedule_15_days')}
          checked={schedule15}
          onChange={setSchedule15}
          disabled={writesDisabled || !autoEnabled}
        />
        <AppCheckbox
          label={t('credit.schedule_30_days')}
          checked={schedule30}
          onChange={setSchedule30}
          disabled={writesDisabled || !autoEnabled}
        />

        {/* Template editor */}
        <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
          {t('credit.template_section_title')}
        </AppText>
        <ReminderTemplateEditor
          value={template}
          onChange={setTemplate}
          error={templateError}
          disabled={writesDisabled}
        />

        {/* Excluded customers */}
        <ExcludedCustomersField
          excludedIds={excludedIds}
          onChange={setExcludedIds}
          disabled={writesDisabled}
        />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('common.save')}
          variant="primary"
          disabled={writesDisabled}
          loading={isMutating}
          onPress={() => void handleSave()}
          testID="save-config-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function ReminderConfigScreen() {
  return (
    <ScreenErrorBoundary>
      <ReminderConfigContent />
    </ScreenErrorBoundary>
  )
}

ReminderConfigScreen.displayName = 'ReminderConfigScreen'
