/**
 * BulkSendRemindersScreen (US-011, FEATURE_PLAN §2.5, S5)
 * Purpose: Bulk send payment reminders to customers.
 *
 * States:
 *  Loading  — customer fetch for specific scope
 *  Error    — mutation error banner
 *  Offline  — AppAlert + disabled Send button
 *  Result   — sent/delivered/failed summary
 *
 * Defence-in-depth: useRequireOwner() redirects staff users.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppTextArea } from '@components/primitives/AppTextArea'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useSettingsStore } from '../store/settings.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { CustomerScopeSelector } from '../components'
import type { BulkReminderInput, BulkReminderResultDto, ReminderTarget, ReminderChannel } from '../../../types/settings'
import type { CustomerOption } from '../components'

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
  resultCard: { padding: spacing[4], marginBottom: spacing[3] },
  resultTitle: { marginBottom: spacing[3] },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
})

function BulkSendRemindersContent() {
  const { t } = useTranslation()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const vendorId = useAuthStore(useShallow((s) => s.vendorContext?.vendorId ?? null))

  const { isMutating, mutationError, bulkSendReminders, clearError } = useSettingsStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      bulkSendReminders: s.bulkSendReminders,
      clearError: s.clearError,
    })),
  )

  const [targetType, setTargetType] = useState<ReminderTarget>('overdue')
  const [channel, setChannel] = useState<ReminderChannel>('whatsapp')
  const [customMessage, setCustomMessage] = useState('')
  const [allCustomers, setAllCustomers] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<BulkReminderResultDto | null>(null)

  // For specific_customers scope, load a flat list from the first supply list
  useEffect(() => {
    if (targetType !== 'specific_customers' || !vendorId) {
      setCustomers([])
      return
    }
    // Import lazily to avoid circular dep; use the store's vendor context
    const { supplyListsService } = require('@modules/supply-lists/service/supplyLists.service') as {
      supplyListsService: typeof import('@modules/supply-lists/service/supplyLists.service').supplyListsService
    }
    supplyListsService
      .list(vendorId, { status: 'active', limit: 1 })
      .then(({ data }) => {
        if (data.length === 0) return
        return supplyListsService.listCustomers(vendorId, data[0]!.id, { limit: 200 })
      })
      .then((result) => {
        if (!result) return
        setCustomers(result.data.map((s) => ({ id: s.customerId, name: s.customerName ?? s.customerId })))
      })
      .catch(() => {/* non-fatal */})
  }, [targetType, vendorId])

  const isValid =
    targetType !== 'specific_customers' || selectedIds.length > 0

  const buildInput = useCallback((): BulkReminderInput => {
    const base: BulkReminderInput = {
      targetType,
      sendVia: channel,
      customMessage: customMessage.trim() || undefined,
    }
    // When targeting specific customers, always supply the selected ids.
    // The `allCustomers` sub-toggle only controls the CustomerScopeSelector UI;
    // the API discriminant is `targetType` alone.
    if (targetType === 'specific_customers' && selectedIds.length > 0) {
      base.customerIds = selectedIds
    }
    return base
  }, [targetType, channel, customMessage, selectedIds])

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false)
    try {
      const res = await bulkSendReminders(buildInput())
      setResult(res)
    } catch {
      // handled in store
    }
  }, [bulkSendReminders, buildInput])

  const targetOptions = [
    { label: t('settings.reminder_target_overdue'), value: 'overdue' },
    { label: t('settings.reminder_target_all_pending'), value: 'all_pending' },
    { label: t('settings.reminder_target_specific'), value: 'specific_customers' },
  ]

  const channelOptions = [
    { label: t('settings.reminder_channel_whatsapp'), value: 'whatsapp' },
    { label: t('settings.reminder_channel_sms'), value: 'sms' },
  ]

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.bulk_send_reminders')} showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.resultCard} testID="reminder-result-card">
            <AppText variant="label" weight="semibold" style={styles.resultTitle}>
              {t('settings.bulk_operation_complete')}
            </AppText>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.reminder_total_sent')}</AppText>
              <AppText variant="body" weight="semibold">{result.summary.totalSent}</AppText>
            </View>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.reminder_delivered')}</AppText>
              <AppText variant="body" weight="semibold" color={colors.success}>{result.summary.delivered}</AppText>
            </View>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.reminder_failed')}</AppText>
              <AppText variant="body" weight="semibold" color={result.summary.failed > 0 ? colors.error : colors.textPrimary}>
                {result.summary.failed}
              </AppText>
            </View>
          </AppCard>
          <AppButton
            label={t('settings.bulk_new_operation')}
            variant="secondary"
            onPress={() => {
              setResult(null)
              setTargetType('overdue')
              setChannel('whatsapp')
              setCustomMessage('')
              setSelectedIds([])
            }}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('settings.bulk_send_reminders')} showBack />

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
        <AppRadioGroup
          label={t('settings.reminder_target_label')}
          options={targetOptions}
          value={targetType}
          onChange={(v) => {
            setTargetType(v as ReminderTarget)
            setSelectedIds([])
          }}
          disabled={!isConnected || isMutating}
        />

        {targetType === 'specific_customers' ? (
          <CustomerScopeSelector
            allCustomers={allCustomers}
            selectedIds={selectedIds}
            customers={customers}
            disabled={!isConnected || isMutating}
            onScopeChange={(all) => { setAllCustomers(all); setSelectedIds([]) }}
            onSelectionsChange={setSelectedIds}
          />
        ) : null}

        <AppRadioGroup
          label={t('settings.reminder_channel_label')}
          options={channelOptions}
          value={channel}
          onChange={(v) => setChannel(v as ReminderChannel)}
          disabled={!isConnected || isMutating}
          layout="horizontal"
        />

        <AppTextArea
          label={t('settings.reminder_custom_message_label')}
          placeholder={t('settings.reminder_custom_message_placeholder')}
          value={customMessage}
          onChangeText={setCustomMessage}
          editable={!isMutating}
        />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('settings.send_reminders')}
          variant="primary"
          disabled={!isValid || !isConnected || isMutating}
          loading={isMutating}
          onPress={() => setShowConfirm(true)}
          testID="send-reminders-btn"
        />
      </View>

      <AppConfirmDialog
        visible={showConfirm}
        title={t('settings.confirm_reminders_title')}
        description={t('settings.confirm_reminders_desc')}
        confirmLabel={t('settings.send_reminders')}
        onConfirm={() => { void handleConfirm() }}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  )
}

export default function BulkSendRemindersScreen() {
  return (
    <ScreenErrorBoundary>
      <BulkSendRemindersContent />
    </ScreenErrorBoundary>
  )
}

BulkSendRemindersScreen.displayName = 'BulkSendRemindersScreen'
