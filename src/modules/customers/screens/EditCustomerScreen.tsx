/**
 * EditCustomerScreen — Owner-only (US-008, FEATURE_PLAN §3.3).
 * Purpose: Edit a customer's profile. Pre-fills from the cached detail (or fetches
 * if not cached). Sends a minimal PATCH (only changed fields). Includes status toggle
 * (active/inactive). Online-only; 409 → field-level phone error.
 *
 * 5 states: Loading skeleton | Offline banner | Error banner |
 * Submitting (button spinner) | Content with field-level errors.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native'
import { ScrollView } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppCard } from '@components/primitives/AppCard'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useCustomerForm } from '../hooks/useCustomerForm'
import { useCustomersStore } from '../store/customers.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { LanguageOptions, CUSTOMER_FIELD_META } from './customerFormConfig'
import { CUSTOMER_ERROR_KEYS } from './customerFormConfig'
import type { TFunc } from './customerFormConfig'
import type { CustomerStatus } from '../../../types/customer'

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
  skeletonRow: {
    height: 56,
    marginBottom: spacing[3],
    backgroundColor: colors.gray100,
    borderRadius: spacing[2],
  },
  skeletonWrap: { padding: spacing[4] },
})

const STATUS_OPTIONS = (t: ReturnType<typeof useTranslation>['t']) => [
  { label: t('customer.status_active'), value: 'ACTIVE' },
  { label: t('customer.status_inactive'), value: 'INACTIVE' },
]

function EditCustomerScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ customerId: string }>()
  const customerId = params.customerId

  const {
    detail,
    isDetailLoading,
    detailError,
    fetchCustomer,
    updateCustomer,
    isMutating,
    mutationError,
    clearError,
  } = useCustomersStore(
    useShallow((s) => ({
      detail: s.detail,
      isDetailLoading: s.isDetailLoading,
      detailError: s.detailError,
      fetchCustomer: s.fetchCustomer,
      updateCustomer: s.updateCustomer,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      clearError: s.clearError,
    })),
  )

  const customer = customerId ? detail[customerId] : undefined

  // Initialise form once on mount from cached detail; if not cached, fetch first.
  const formInitial = useMemo(() => {
    if (!customer) return undefined
    return {
      name: customer.name,
      phone: customer.phoneNumber,
      phoneCountryCode: '+91',
      email: customer.email ?? '',
      address: customer.address ?? '',
      area: customer.area ?? '',
      language: customer.language ?? '',
      status: customer.status as CustomerStatus,
    }
  }, [customer])

  const { values, errors, setField, validate, toUpdateInput } = useCustomerForm(formInitial)
  const [phoneFieldError, setPhoneFieldError] = React.useState<string | null>(null)

  const tf = t as TFunc
  const languageOptions = useMemo(() => LanguageOptions(tf), [tf])

  useEffect(() => {
    if (customerId && !customer) {
      void fetchCustomer(customerId)
    }
    return () => clearError()
  }, [customerId, customer, fetchCustomer, clearError])

  const submitting = useRef(false)

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isMutating || !customerId) return
    submitting.current = true
    clearError()
    setPhoneFieldError(null)

    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    const patch = toUpdateInput()
    // Nothing changed — no need to submit.
    if (Object.keys(patch).length === 0) {
      submitting.current = false
      router.back()
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await updateCustomer(customerId, patch)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setPhoneFieldError(CUSTOMER_ERROR_KEYS.duplicatePhone)
      }
    } finally {
      submitting.current = false
    }
  }, [isMutating, customerId, clearError, validate, toUpdateInput, updateCustomer, router])

  const nameMeta = CUSTOMER_FIELD_META['name']
  const phoneMeta = CUSTOMER_FIELD_META['phone']
  const emailMeta = CUSTOMER_FIELD_META['email']
  const addressMeta = CUSTOMER_FIELD_META['address']
  const areaMeta = CUSTOMER_FIELD_META['area']
  const languageMeta = CUSTOMER_FIELD_META['language']

  if (isDetailLoading && !customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader
          title={t('customer.edit_customer')}
          showBack
          onBackPress={() => router.back()}
        />
        <View style={styles.skeletonWrap} testID="edit-loading">
          {[0, 1, 2, 3].map((i) => (
            <AppCard key={i} variant="flat" style={styles.skeletonRow}>
              <View />
            </AppCard>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  if (detailError && !customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader
          title={t('customer.edit_customer')}
          showBack
          onBackPress={() => router.back()}
        />
        <AppAlert
          type="error"
          title={t('common.error')}
          message={t(detailError)}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('customer.edit_customer')}
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
            testID="edit-name"
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
            testID="edit-phone"
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
            testID="edit-email"
            error={errors.email ? t(errors.email) : undefined}
          />

          <AppInput
            label={addressMeta ? t(addressMeta.labelKey) : t('customer.form_address')}
            value={values.address}
            onChangeText={(v) => setField('address', v)}
            testID="edit-address"
          />

          <AppInput
            label={areaMeta ? t(areaMeta.labelKey) : t('customer.form_area')}
            value={values.area}
            onChangeText={(v) => setField('area', v)}
            testID="edit-area"
          />

          {/* AppSelect has no testID prop — wrap in View */}
          <View testID="edit-language">
            <AppSelect
              label={languageMeta ? t(languageMeta.labelKey) : t('customer.form_language')}
              options={languageOptions}
              value={values.language}
              onChange={(v) => setField('language', String(v))}
              placeholder={languageMeta ? t(languageMeta.labelKey) : t('customer.form_language')}
            />
          </View>

          {/* AppRadioGroup has no testID prop — wrap in View */}
          <View testID="edit-status">
            <AppRadioGroup
              label={t('customer.filter_status')}
              options={STATUS_OPTIONS(t)}
              value={values.status}
              onChange={(v) => setField('status', v as CustomerStatus)}
              layout="horizontal"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('common.save')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isMutating}
            disabled={isMutating || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="edit-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function EditCustomerScreen() {
  return (
    <ScreenErrorBoundary>
      <EditCustomerScreenContent />
    </ScreenErrorBoundary>
  )
}

EditCustomerScreen.displayName = 'EditCustomerScreen'
