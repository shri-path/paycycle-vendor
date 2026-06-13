/**
 * BulkMarkLeaveScreen (US-011, FEATURE_PLAN §2.3, S3)
 * Purpose: Bulk mark leave for subscriptions.
 *
 * States:
 *  Loading  — supply lists fetch
 *  Error    — mutation error banner
 *  Offline  — AppAlert + disabled Confirm button
 *  Result   — summary card after successful POST
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
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppTextArea } from '@components/primitives/AppTextArea'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { supplyListsService } from '@modules/supply-lists/service/supplyLists.service'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useBulkLeaveForm } from '../hooks/useBulkLeaveForm'
import { ListScopeSelector, CustomerScopeSelector, ImpactSummaryCard } from '../components'
import type { BulkLeaveResultDto } from '../../../types/settings'
import type { SupplyListOption, CustomerOption } from '../components'

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

function BulkMarkLeaveContent() {
  const { t } = useTranslation()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const vendorId = useAuthStore(useShallow((s) => s.vendorContext?.vendorId ?? null))

  const {
    form,
    impact,
    isImpactLoading,
    isValid,
    isMutating,
    mutationError,
    update,
    submit,
    reset,
  } = useBulkLeaveForm()

  const [supplyLists, setSupplyLists] = useState<SupplyListOption[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [isCustomersLoading, setIsCustomersLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<BulkLeaveResultDto | null>(null)

  // Load supply lists on mount
  useEffect(() => {
    if (!vendorId) return
    supplyListsService
      .list(vendorId, { status: 'active' })
      .then(({ data }) => {
        setSupplyLists(data.map((l) => ({ label: l.name, value: l.id })))
      })
      .catch(() => {/* non-fatal */})
  }, [vendorId])

  // Load customers when switching to specific scope + list selected
  useEffect(() => {
    if (form.allCustomers || !form.supplyListId || !vendorId) {
      setCustomers([])
      return
    }
    setIsCustomersLoading(true)
    supplyListsService
      .listCustomers(vendorId, form.supplyListId, { limit: 200 })
      .then(({ data }) => {
        setCustomers(data.map((s) => ({ id: s.customerId, name: s.customerName ?? s.customerId })))
        setIsCustomersLoading(false)
      })
      .catch(() => setIsCustomersLoading(false))
  }, [form.allCustomers, form.supplyListId, vendorId])

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false)
    try {
      const res = await submit()
      setResult(res)
    } catch {
      // mutation error handled in store
    }
  }, [submit])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parseDateStr = (s: string) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? today : d
  }

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.bulk_mark_leave')} showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.resultCard} testID="leave-result-card">
            <AppText variant="label" weight="semibold" style={styles.resultTitle}>
              {t('settings.bulk_operation_complete')}
            </AppText>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.impact_customers_affected')}</AppText>
              <AppText variant="body" weight="semibold">{result.summary.customersAffected}</AppText>
            </View>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.impact_days')}</AppText>
              <AppText variant="body" weight="semibold">{result.summary.days}</AppText>
            </View>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.impact_total_leaves')}</AppText>
              <AppText variant="body" weight="semibold">{result.summary.totalLeaves}</AppText>
            </View>
          </AppCard>
          <AppButton
            label={t('settings.bulk_new_operation')}
            variant="secondary"
            onPress={() => { setResult(null); reset() }}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('settings.bulk_mark_leave')} showBack />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ListScopeSelector
          allLists={form.allLists}
          supplyListId={form.supplyListId}
          supplyLists={supplyLists}
          disabled={!isConnected || isMutating}
          onScopeChange={(allLists) => update({ allLists, supplyListId: undefined })}
          onListChange={(id) => update({ supplyListId: id })}
        />

        <CustomerScopeSelector
          allCustomers={form.allCustomers}
          selectedIds={form.customerIds}
          customers={customers}
          isCustomersLoading={isCustomersLoading}
          disabled={!isConnected || isMutating}
          onScopeChange={(allCustomers) => update({ allCustomers, customerIds: [] })}
          onSelectionsChange={(ids) => update({ customerIds: ids })}
        />

        <AppDatePicker
          label={t('settings.leave_start_date')}
          mode="date"
          value={parseDateStr(form.startDate)}
          minimumDate={today}
          onChange={(d) =>
            update({
              startDate: d.toISOString().slice(0, 10),
              endDate: d.toISOString().slice(0, 10),
            })
          }
        />

        <AppDatePicker
          label={t('settings.leave_end_date')}
          mode="date"
          value={parseDateStr(form.endDate)}
          minimumDate={parseDateStr(form.startDate)}
          onChange={(d) => update({ endDate: d.toISOString().slice(0, 10) })}
        />

        {(impact || isImpactLoading) ? (
          <ImpactSummaryCard
            variant="leave"
            leaveImpact={impact ?? undefined}
            isLoading={isImpactLoading}
          />
        ) : null}

        <AppTextArea
          label={t('settings.leave_reason_label')}
          placeholder={t('settings.leave_reason_placeholder')}
          value={form.reason}
          onChangeText={(v) => update({ reason: v })}
          editable={!isMutating}
        />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('settings.confirm_bulk_leave')}
          variant="primary"
          disabled={!isValid || !impact || !isConnected || isMutating}
          loading={isMutating}
          onPress={() => setShowConfirm(true)}
          testID="confirm-bulk-leave-btn"
        />
      </View>

      <AppConfirmDialog
        visible={showConfirm}
        title={t('settings.confirm_bulk_leave_title')}
        description={t('settings.confirm_bulk_leave_desc', {
          count: impact?.customersAffected ?? 0,
          days: impact?.days ?? 0,
        })}
        confirmLabel={t('settings.confirm_bulk_leave')}
        onConfirm={() => { void handleConfirm() }}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  )
}

export default function BulkMarkLeaveScreen() {
  return (
    <ScreenErrorBoundary>
      <BulkMarkLeaveContent />
    </ScreenErrorBoundary>
  )
}

BulkMarkLeaveScreen.displayName = 'BulkMarkLeaveScreen'
