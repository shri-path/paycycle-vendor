/**
 * EditSupplyListScreen — Owner-only (US-005, FEATURE_PLAN §4, wireframe 2.4).
 * Purpose: Edit an existing supply list. Uses the same useSupplyListForm as Create,
 * PRE-POPULATED from the cached/fetched detail, and sends ONLY changed fields
 * (toUpdatePatch — minimal PATCH). Shows the price-override notice. A frequency
 * change re-validates the day selector. Staff assignment is NOT edited here (it is
 * owned by the detail screen, OQ-2).
 *
 * 5 states: Loading (skeleton while the detail is fetched), Submitting (button
 * spinner), Error (field inline + top banner; 409 duplicate-name handled inline),
 * Content, Offline (submit disabled — writes are online-only, OQ-3).
 * Success → Success haptic + back to detail.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native'
import { ScrollView } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppLoader } from '@components/primitives/AppLoader'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import {
  useSupplyListForm,
  type SupplyListFormValues,
} from '../hooks/useSupplyListForm'
import { useSupplyListsStore } from '../store/supplyLists.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import {
  DayChips,
  FrequencyOptions,
  ScheduleFields,
  SupplyTypeOptions,
  UnitOptions,
  type TFunc,
} from './supplyListFormConfig'
import type {
  SupplyFrequency,
  SupplyListDto,
  SupplyUnit,
} from '../../../types/supplyLists'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  amountBox: {
    backgroundColor: colors.gray50,
    borderRadius: spacing[2],
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
})

/** Maps a fetched detail DTO into the form's string-based field values. */
function detailToFormValues(d: SupplyListDto): Partial<SupplyListFormValues> {
  return {
    name: d.name,
    supplyType: d.supplyType ?? '',
    unit: (d.unit as SupplyUnit) ?? '',
    defaultQuantity: d.defaultQuantity != null ? String(d.defaultQuantity) : '',
    defaultRatePerUnit: d.defaultRatePerUnit != null ? String(d.defaultRatePerUnit) : '',
    startTime: d.startTime ?? '',
    frequency: d.frequency,
    frequencyDays: d.frequencyDays ?? [],
  }
}

interface EditFormProps {
  listId: string
  detail: SupplyListDto
}

/**
 * Inner form — only mounted once the detail is present, so useSupplyListForm
 * snapshots the pristine values exactly once (its initial is captured on mount).
 */
function EditForm({ listId, detail }: EditFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const tf = t as TFunc

  const initialValues = useMemo(() => detailToFormValues(detail), [detail])
  const { values, errors, setField, validate, toUpdatePatch } = useSupplyListForm(initialValues)

  const { updateList, isDetailLoading, detailError, clearError } = useSupplyListsStore(
    useShallow((s) => ({
      updateList: s.updateList,
      isDetailLoading: s.isDetailLoading,
      detailError: s.detailError,
      clearError: s.clearError,
    })),
  )

  useEffect(() => () => clearError(), [clearError])

  const submitting = useRef(false)

  const amountPreview = useMemo(() => {
    const qty = Number(values.defaultQuantity)
    const rate = Number(values.defaultRatePerUnit)
    if (!values.defaultQuantity || !values.defaultRatePerUnit || !Number.isFinite(qty * rate)) {
      return null
    }
    return (qty * rate).toFixed(2)
  }, [values.defaultQuantity, values.defaultRatePerUnit])

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isDetailLoading) return
    submitting.current = true
    clearError()

    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    const patch = toUpdatePatch()
    // Nothing changed — just go back without an API call.
    if (Object.keys(patch).length === 0) {
      router.back()
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await updateList(listId, patch)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }, [isDetailLoading, clearError, validate, toUpdatePatch, updateList, listId, router])

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('supply.save_changes')} showBack onBackPress={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isConnected ? (
            <AppAlert
              type="warning"
              title={t('common.offline')}
              message={t('common.offline_message')}
            />
          ) : null}

          {detailError ? (
            <AppAlert type="error" title={t('common.error')} message={t(detailError)} />
          ) : null}

          <AppAlert type="info" title={t('supply.edit_price_notice')} />

          <AppInput
            label={t('supply.field_name')}
            value={values.name}
            onChangeText={(v) => setField('name', v)}
            maxLength={100}
            testID="edit-name"
            error={errors.name ? t(errors.name) : undefined}
          />

          <AppSelect
            label={t('supply.field_supply_type')}
            options={SupplyTypeOptions(tf)}
            value={values.supplyType}
            onChange={(v) => setField('supplyType', String(v))}
            placeholder={t('supply.field_supply_type')}
          />

          <AppSelect
            label={t('supply.field_unit')}
            options={UnitOptions(tf)}
            value={values.unit}
            onChange={(v) => setField('unit', v as SupplyUnit)}
            placeholder={t('supply.field_unit')}
            error={errors.unit ? t(errors.unit) : undefined}
          />

          <AppInput
            label={t('supply.field_quantity')}
            value={values.defaultQuantity}
            onChangeText={(v) => setField('defaultQuantity', v)}
            keyboardType="numeric"
            testID="edit-quantity"
            error={errors.defaultQuantity ? t(errors.defaultQuantity) : undefined}
          />

          <AppInput
            label={t('supply.field_rate')}
            value={values.defaultRatePerUnit}
            onChangeText={(v) => setField('defaultRatePerUnit', v)}
            keyboardType="numeric"
            prefix="₹"
            testID="edit-rate"
            error={errors.defaultRatePerUnit ? t(errors.defaultRatePerUnit) : undefined}
          />

          {amountPreview ? (
            <View style={styles.amountBox} accessibilityRole="text" testID="edit-amount">
              <AppText variant="caption" color={colors.textSecondary}>
                {t('supply.amount_label', {
                  qty: values.defaultQuantity,
                  unit: values.unit || '',
                  rate: amountPreview,
                })}
              </AppText>
            </View>
          ) : null}

          <ScheduleFields
            startTime={values.startTime}
            onStartTimeChange={(v) => setField('startTime', v)}
            startTimeError={errors.startTime ? t(errors.startTime) : undefined}
            tf={tf}
          />

          <AppRadioGroup
            label={t('supply.field_frequency')}
            options={FrequencyOptions(tf)}
            value={values.frequency}
            onChange={(v) => setField('frequency', v as SupplyFrequency)}
            layout="horizontal"
          />

          {values.frequency !== 'DAILY' ? (
            <DayChips
              frequency={values.frequency}
              value={values.frequencyDays}
              onChange={(days) => setField('frequencyDays', days)}
              error={errors.frequencyDays ? t(errors.frequencyDays) : undefined}
              tf={tf}
            />
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('supply.save_changes')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isDetailLoading}
            disabled={isDetailLoading || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="edit-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function EditSupplyListScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ listId?: string }>()
  const listId = typeof params.listId === 'string' ? params.listId : ''
  useRequireOwner()

  const { detail, isDetailLoading, detailError, fetchDetail } = useSupplyListsStore(
    useShallow((s) => ({
      detail: s.detail,
      isDetailLoading: s.isDetailLoading,
      detailError: s.detailError,
      fetchDetail: s.fetchDetail,
    })),
  )

  const current = listId ? detail[listId] : undefined

  useEffect(() => {
    // Fetch fresh detail if it isn't already in the in-memory cache.
    if (listId && !current) void fetchDetail(listId)
  }, [listId, current, fetchDetail])

  // Loading (no cached detail yet)
  if (!current && isDetailLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('supply.save_changes')} showBack onBackPress={() => router.back()} />
        <View style={styles.loader} testID="edit-loading">
          <AppLoader />
        </View>
      </SafeAreaView>
    )
  }

  // Error / not found (no cached detail to edit)
  if (!current) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('supply.save_changes')} showBack onBackPress={() => router.back()} />
        <AppEmptyState
          icon={
            <Ionicons
              name="alert-circle-outline"
              size={componentSizes.icon.xxxl}
              color={colors.error}
            />
          }
          title={t('common.error')}
          description={t(detailError ?? 'supply.error_not_found')}
          actionLabel={t('common.retry')}
          onActionPress={() => void fetchDetail(listId)}
        />
      </SafeAreaView>
    )
  }

  return <EditForm listId={listId} detail={current} />
}

export default function EditSupplyListScreen() {
  return (
    <ScreenErrorBoundary>
      <EditSupplyListScreenContent />
    </ScreenErrorBoundary>
  )
}

EditSupplyListScreen.displayName = 'EditSupplyListScreen'
