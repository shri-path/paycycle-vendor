/**
 * AddCustomerScreen — Owner-only (US-008, FEATURE_PLAN §3.2).
 * Purpose: Create a new customer — name, phone, email, address, area, language,
 * supply-list multi-select (checklist), start date, credit limit, and a send-invite
 * checkbox. Online-only (submit disabled offline). 409 → field-level phone error.
 * Success → navigate to new customer's detail screen (no "invite sent" toast per API_SPEC).
 *
 * 5 states: Content | Offline banner | Error banner | Submitting (button spinner) |
 * Field-level validation errors.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native'
import { ScrollView } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSection } from '@components/composite/AppSection'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useCustomerForm } from '../hooks/useCustomerForm'
import { useCustomersStore } from '../store/customers.store'
import { useSupplyListsStore } from '@modules/supply-lists/store/supplyLists.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { LanguageOptions, CUSTOMER_FIELD_META, CUSTOMER_ERROR_KEYS } from './customerFormConfig'
import type { TFunc } from './customerFormConfig'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
})

function AddCustomerScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { values, errors, setField, validate } = useCustomerForm()
  const [phoneFieldError, setPhoneFieldError] = React.useState<string | null>(null)

  const { createCustomer, isMutating, mutationError, clearError } = useCustomersStore(
    useShallow((s) => ({
      createCustomer: s.createCustomer,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      clearError: s.clearError,
    })),
  )

  const { lists, fetchLists } = useSupplyListsStore(
    useShallow((s) => ({
      lists: s.lists,
      fetchLists: s.fetchLists,
    })),
  )

  useEffect(() => {
    void fetchLists()
    return () => clearError()
  }, [fetchLists, clearError])

  const submitting = useRef(false)
  const tf = t as TFunc
  const languageOptions = useMemo(() => LanguageOptions(tf), [tf])

  const supplyListItems = useMemo(
    () => lists.map((l) => ({ id: l.id, label: l.name })),
    [lists],
  )

  const toggleSupplyList = useCallback(
    (listId: string, checked: boolean) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const next = checked
        ? [...values.supplyListIds, listId]
        : values.supplyListIds.filter((id) => id !== listId)
      setField('supplyListIds', next)
    },
    [values.supplyListIds, setField],
  )

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isMutating) return
    submitting.current = true
    clearError()
    setPhoneFieldError(null)

    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const created = await createCustomer({
        name: values.name.trim(),
        phone: values.phone.replace(/\D/g, ''),
        ...(values.phoneCountryCode && values.phoneCountryCode !== '+91'
          ? { phoneCountryCode: values.phoneCountryCode }
          : {}),
        ...(values.email.trim() ? { email: values.email.trim() } : {}),
        ...(values.address.trim() ? { address: values.address.trim() } : {}),
        ...(values.area.trim() ? { area: values.area.trim() } : {}),
        ...(values.language.trim() ? { language: values.language.trim() } : {}),
        ...(values.supplyListIds.length > 0 ? { supplyListIds: values.supplyListIds } : {}),
        ...(values.startDate ? { startDate: values.startDate } : {}),
        ...(values.creditLimit.trim() ? { creditLimit: Number(values.creditLimit) } : {}),
        ...(values.sendInvite ? { sendInvite: values.sendInvite } : {}),
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // Navigate to the new customer's detail screen. No "invite sent" toast per API_SPEC.
      router.replace(`/(app)/customers/${created.id}` as Href)
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setPhoneFieldError(CUSTOMER_ERROR_KEYS.duplicatePhone)
      }
    } finally {
      submitting.current = false
    }
  }, [isMutating, clearError, validate, createCustomer, values, router])

  const nameMeta = CUSTOMER_FIELD_META['name']
  const phoneMeta = CUSTOMER_FIELD_META['phone']
  const emailMeta = CUSTOMER_FIELD_META['email']
  const addressMeta = CUSTOMER_FIELD_META['address']
  const areaMeta = CUSTOMER_FIELD_META['area']
  const languageMeta = CUSTOMER_FIELD_META['language']
  const supplyListsMeta = CUSTOMER_FIELD_META['supplyListIds']
  const startDateMeta = CUSTOMER_FIELD_META['startDate']
  const creditLimitMeta = CUSTOMER_FIELD_META['creditLimit']
  const sendInviteMeta = CUSTOMER_FIELD_META['sendInvite']

  const startDateValue = values.startDate ? new Date(values.startDate) : undefined

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('customer.add_customer')}
        showBack
        onBackPress={() => router.back()}
      />
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

          {mutationError ? (
            <AppAlert
              type="error"
              title={t('common.error')}
              message={t(mutationError)}
              onClose={clearError}
            />
          ) : null}

          <AppInput
            label={nameMeta ? t(nameMeta.labelKey) : t('customer.form_name')}
            value={values.name}
            onChangeText={(v) => setField('name', v)}
            maxLength={100}
            testID="add-name"
            error={errors.name ? t(errors.name) : undefined}
          />

          {/* AppPhoneInput uses phone/onChange(countryCode, phone) API.
              testID is forwarded to the inner TextInput for test targeting. */}
          <AppPhoneInput
            label={phoneMeta ? t(phoneMeta.labelKey) : t('customer.form_phone')}
            countryCode={values.phoneCountryCode}
            phone={values.phone}
            onChange={(code, phone) => {
              setField('phoneCountryCode', code)
              setField('phone', phone)
              setPhoneFieldError(null)
            }}
            testID="add-phone"
            error={
              phoneFieldError
                ? t(phoneFieldError)
                : errors.phone
                  ? t(errors.phone)
                  : undefined
            }
          />

          <AppInput
            label={emailMeta ? t(emailMeta.labelKey) : t('customer.form_email')}
            value={values.email}
            onChangeText={(v) => setField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="add-email"
            error={errors.email ? t(errors.email) : undefined}
          />

          <AppInput
            label={addressMeta ? t(addressMeta.labelKey) : t('customer.form_address')}
            value={values.address}
            onChangeText={(v) => setField('address', v)}
            testID="add-address"
          />

          <AppInput
            label={areaMeta ? t(areaMeta.labelKey) : t('customer.form_area')}
            value={values.area}
            onChangeText={(v) => setField('area', v)}
            testID="add-area"
          />

          {/* AppSelect has no testID prop — wrap in View */}
          <View testID="add-language">
            <AppSelect
              label={languageMeta ? t(languageMeta.labelKey) : t('customer.form_language')}
              options={languageOptions}
              value={values.language}
              onChange={(v) => setField('language', String(v))}
              placeholder={languageMeta ? t(languageMeta.labelKey) : t('customer.form_language')}
            />
          </View>

          {supplyListItems.length > 0 ? (
            <AppSection
              title={supplyListsMeta ? t(supplyListsMeta.labelKey) : t('customer.form_supply_lists')}
            >
              {supplyListItems.map((item) => (
                <View key={item.id} testID={`add-list-${item.id}`}>
                  <AppCheckbox
                    label={item.label}
                    checked={values.supplyListIds.includes(item.id)}
                    onChange={(checked) => toggleSupplyList(item.id, checked)}
                  />
                </View>
              ))}
            </AppSection>
          ) : null}

          {/* AppDatePicker has no testID prop — wrap in View */}
          <View testID="add-start-date">
            <AppDatePicker
              label={startDateMeta ? t(startDateMeta.labelKey) : t('customer.form_start_date')}
              value={startDateValue}
              onChange={(d) =>
                setField('startDate', d ? d.toISOString().slice(0, 10) : '')
              }
              mode="date"
              placeholder={startDateMeta ? t(startDateMeta.labelKey) : t('customer.form_start_date')}
            />
          </View>

          <AppInput
            label={creditLimitMeta ? t(creditLimitMeta.labelKey) : t('customer.form_credit_limit')}
            value={values.creditLimit}
            onChangeText={(v) => setField('creditLimit', v)}
            keyboardType="numeric"
            prefix="₹"
            testID="add-credit-limit"
            error={errors.creditLimit ? t(errors.creditLimit) : undefined}
          />

          <View testID="add-send-invite">
            <AppCheckbox
              label={sendInviteMeta ? t(sendInviteMeta.labelKey) : t('customer.form_send_invite')}
              checked={values.sendInvite}
              onChange={(checked) => setField('sendInvite', checked)}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('customer.add_customer')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isMutating}
            disabled={isMutating || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="add-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function AddCustomerScreen() {
  return (
    <ScreenErrorBoundary>
      <AddCustomerScreenContent />
    </ScreenErrorBoundary>
  )
}

AddCustomerScreen.displayName = 'AddCustomerScreen'
