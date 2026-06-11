/**
 * CreateSupplyListScreen — Owner-only (US-005, FEATURE_PLAN §2, wireframe 2.3).
 * Purpose: Create a supply list — name, supply type, unit, default qty/rate (live
 * auto-amount), start time, frequency + conditional day selector, and staff
 * assignment (with primary staff revealed only after ≥1 staff is chosen).
 *
 * Progressive disclosure: the day selector appears only for WEEKLY/MONTHLY; the
 * primary-staff select appears only once staff are selected. Numeric keypads for
 * qty/rate. Submit is disabled offline (writes are online-only, OQ-3). 409 duplicate
 * name + 422 staff errors arrive as i18n keys from the store and render in a top
 * AppAlert. Success → Success haptic + navigate to the new detail.
 *
 * 5 states: Loading n/a (staff options load inline), Submitting (button spinner +
 * disabled form), Error (field inline + top banner), Content, Offline (submit off).
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native'
import { ScrollView } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSection } from '@components/composite/AppSection'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useSupplyListForm } from '../hooks/useSupplyListForm'
import { useSupplyListsStore } from '../store/supplyLists.store'
import { useRolesStore } from '@modules/roles/store/roles.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import {
  DayChips,
  FrequencyOptions,
  ScheduleFields,
  SupplyTypeOptions,
  UnitOptions,
  type TFunc,
} from './supplyListFormConfig'
import type { SupplyFrequency, SupplyUnit } from '../../../types/supplyLists'

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
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
})

function CreateSupplyListScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { values, errors, setField, validate, toCreateInput } = useSupplyListForm()

  const { createList, isListsLoading, listsError, clearError } = useSupplyListsStore(
    useShallow((s) => ({
      createList: s.createList,
      isListsLoading: s.isListsLoading,
      listsError: s.listsError,
      clearError: s.clearError,
    })),
  )

  const { staffList, fetchStaffList } = useRolesStore(
    useShallow((s) => ({ staffList: s.staffList, fetchStaffList: s.fetchStaffList })),
  )

  useEffect(() => {
    void fetchStaffList(1)
    return () => clearError()
  }, [fetchStaffList, clearError])

  const submitting = useRef(false)

  // Live auto-calculated amount (qty × rate) — recomputed on every keystroke.
  const amountPreview = useMemo(() => {
    const qty = Number(values.defaultQuantity)
    const rate = Number(values.defaultRatePerUnit)
    if (!values.defaultQuantity || !values.defaultRatePerUnit || !Number.isFinite(qty * rate)) {
      return null
    }
    return (qty * rate).toFixed(2)
  }, [values.defaultQuantity, values.defaultRatePerUnit])

  const eligibleStaff = useMemo(
    () => staffList.filter((s) => s.status === 'ACTIVE'),
    [staffList],
  )

  const toggleStaff = useCallback(
    (staffId: string, checked: boolean) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const next = checked
        ? [...values.staffIds, staffId]
        : values.staffIds.filter((id) => id !== staffId)
      setField('staffIds', next)
      // Clear a now-invalid primary selection.
      if (!checked && values.primaryStaffId === staffId) setField('primaryStaffId', '')
    },
    [values.staffIds, values.primaryStaffId, setField],
  )

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isListsLoading) return
    submitting.current = true
    clearError()

    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const created = await createList(toCreateInput())
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // Cast: the typed-route table is generated by WS-4's route files.
      router.replace(`/(app)/supply-lists/${created.id}` as Href)
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }, [isListsLoading, clearError, validate, createList, toCreateInput, router])

  const tf = t as TFunc
  const primaryStaffOptions = eligibleStaff
    .filter((s) => values.staffIds.includes(s.staffId))
    .map((s) => ({ label: s.name ?? s.staffId, value: s.staffId }))

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('supply.create_list')} showBack onBackPress={() => router.back()} />
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

          {listsError ? (
            <AppAlert type="error" title={t('common.error')} message={t(listsError)} />
          ) : null}

          <AppInput
            label={t('supply.field_name')}
            value={values.name}
            onChangeText={(v) => setField('name', v)}
            maxLength={100}
            testID="create-name"
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
            testID="create-quantity"
            error={errors.defaultQuantity ? t(errors.defaultQuantity) : undefined}
          />

          <AppInput
            label={t('supply.field_rate')}
            value={values.defaultRatePerUnit}
            onChangeText={(v) => setField('defaultRatePerUnit', v)}
            keyboardType="numeric"
            prefix="₹"
            testID="create-rate"
            error={errors.defaultRatePerUnit ? t(errors.defaultRatePerUnit) : undefined}
          />

          {amountPreview ? (
            <View style={styles.amountBox} accessibilityRole="text" testID="create-amount">
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

          <AppSection title={t('supply.assign_staff')}>
            {eligibleStaff.map((s) => (
              <AppCheckbox
                key={s.staffId}
                label={s.name ?? s.staffId}
                checked={values.staffIds.includes(s.staffId)}
                onChange={(checked) => toggleStaff(s.staffId, checked)}
              />
            ))}
          </AppSection>

          {values.staffIds.length > 0 ? (
            <AppSelect
              label={t('supply.primary_staff')}
              options={primaryStaffOptions}
              value={values.primaryStaffId}
              onChange={(v) => setField('primaryStaffId', String(v))}
              placeholder={t('supply.select_staff')}
              error={errors.primaryStaffId ? t(errors.primaryStaffId) : undefined}
            />
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('supply.create_list')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isListsLoading}
            disabled={isListsLoading || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="create-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function CreateSupplyListScreen() {
  return (
    <ScreenErrorBoundary>
      <CreateSupplyListScreenContent />
    </ScreenErrorBoundary>
  )
}

CreateSupplyListScreen.displayName = 'CreateSupplyListScreen'
