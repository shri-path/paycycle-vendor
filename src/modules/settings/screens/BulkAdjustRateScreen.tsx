/**
 * BulkAdjustRateScreen (US-011, FEATURE_PLAN §2.4, S4)
 * Purpose: Bulk adjust subscription rate across lists.
 *
 * Rate=0 triggers an extra warning in the confirm dialog.
 * Defence-in-depth: useRequireOwner() redirects staff users.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
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
import { useBulkRateForm } from '../hooks/useBulkRateForm'
import { ImpactSummaryCard } from '../components'
import type { BulkRateResultDto } from '../../../types/settings'
import type { SupplyListOption } from '../components'

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

function BulkAdjustRateContent() {
  const { t } = useTranslation()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const vendorId = useAuthStore(useShallow((s) => s.vendorContext?.vendorId ?? null))

  const {
    form,
    impact,
    isImpactLoading,
    isValid,
    isZeroRate,
    isMutating,
    mutationError,
    update,
    submit,
    reset,
  } = useBulkRateForm()

  const [supplyLists, setSupplyLists] = useState<SupplyListOption[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<BulkRateResultDto | null>(null)

  useEffect(() => {
    if (!vendorId) return
    supplyListsService
      .list(vendorId, { status: 'active' })
      .then(({ data }) => {
        setSupplyLists(data.map((l) => ({ label: l.name, value: l.id })))
      })
      .catch(() => {/* non-fatal */})
  }, [vendorId])

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false)
    try {
      const res = await submit()
      setResult(res)
    } catch {
      // handled in store
    }
  }, [submit])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parseDateStr = (s: string) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? today : d
  }

  const scopeOptions = [
    { label: t('settings.rate_scope_single_list'), value: 'single_list' },
    { label: t('settings.rate_scope_all_lists'), value: 'all_lists_same_supply' },
  ]

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('settings.bulk_adjust_rate')} showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.resultCard} testID="rate-result-card">
            <AppText variant="label" weight="semibold" style={styles.resultTitle}>
              {t('settings.bulk_operation_complete')}
            </AppText>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.impact_lists_affected')}</AppText>
              <AppText variant="body" weight="semibold">{result.summary.listsAffected}</AppText>
            </View>
            <View style={styles.resultRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('settings.impact_customers_affected')}</AppText>
              <AppText variant="body" weight="semibold">{result.summary.customersAffected}</AppText>
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
      <AppHeader title={t('settings.bulk_adjust_rate')} showBack />

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
        <AppRadioGroup
          label={t('settings.rate_scope_label')}
          options={scopeOptions}
          value={form.scope}
          onChange={(v) =>
            update({
              scope: v as 'single_list' | 'all_lists_same_supply',
              supplyListId: undefined,
              supplyType: undefined,
            })
          }
          disabled={!isConnected || isMutating}
        />

        {form.scope === 'single_list' ? (
          <AppSelect
            label={t('settings.rate_select_list')}
            options={supplyLists}
            value={form.supplyListId ?? ''}
            onChange={(v) => update({ supplyListId: String(v) })}
            disabled={!isConnected || isMutating}
          />
        ) : (
          <AppInput
            label={t('settings.rate_supply_type')}
            placeholder={t('settings.rate_supply_type_placeholder')}
            value={form.supplyType ?? ''}
            onChangeText={(v) => update({ supplyType: v })}
            editable={!isMutating}
          />
        )}

        <AppInput
          label={t('settings.new_rate_label')}
          prefix="₹"
          suffix={t('settings.per_unit')}
          keyboardType="numeric"
          value={form.newRate}
          onChangeText={(v) => update({ newRate: v })}
          editable={!isMutating}
          testID="new-rate-input"
        />

        <AppDatePicker
          label={t('settings.effective_from_label')}
          mode="date"
          value={parseDateStr(form.effectiveFrom)}
          minimumDate={today}
          onChange={(d) => update({ effectiveFrom: d.toISOString().slice(0, 10) })}
        />

        {(impact || isImpactLoading) ? (
          <ImpactSummaryCard
            variant="rate"
            rateImpact={impact ?? undefined}
            isLoading={isImpactLoading}
          />
        ) : null}

        <AppCheckbox
          label={t('settings.notify_customers_label')}
          checked={form.notifyCustomers}
          onChange={(v) => update({ notifyCustomers: v })}
          disabled={!isConnected || isMutating}
        />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('settings.apply_new_rate')}
          variant="primary"
          disabled={!isValid || !impact || !isConnected || isMutating}
          loading={isMutating}
          onPress={() => setShowConfirm(true)}
          testID="apply-rate-btn"
        />
      </View>

      <AppConfirmDialog
        visible={showConfirm}
        title={t('settings.confirm_rate_title')}
        description={
          isZeroRate
            ? t('settings.confirm_rate_zero_desc', { count: impact?.customersAffected ?? 0 })
            : t('settings.confirm_rate_desc', { count: impact?.customersAffected ?? 0 })
        }
        confirmLabel={t('settings.apply_new_rate')}
        confirmVariant={isZeroRate ? 'danger' : 'primary'}
        onConfirm={() => { void handleConfirm() }}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  )
}

export default function BulkAdjustRateScreen() {
  return (
    <ScreenErrorBoundary>
      <BulkAdjustRateContent />
    </ScreenErrorBoundary>
  )
}

BulkAdjustRateScreen.displayName = 'BulkAdjustRateScreen'
