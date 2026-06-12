/**
 * RecordPaymentScreen — Owner-only (US-008, FEATURE_PLAN §3.6).
 * Purpose: Record a customer payment. Fields: amount (>0), payment date (≤ today+1),
 * payment method radio (CASH | ONLINE | UPI | OTHER), optional reference number.
 * Online-only. On success: re-fetches customer detail (balance changes server-side)
 * and navigates back. 400 → validation field errors.
 *
 * 5 states: Content | Offline banner | Error banner |
 * Submitting (button spinner) | Validation errors.
 */

import React, { useCallback, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, View, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useCustomersStore } from '../store/customers.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import type { PaymentMethod, RecordPaymentInput } from '../../../types/customer'

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'ONLINE', 'UPI', 'OTHER']

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
})

function RecordPaymentScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ customerId: string }>()
  const customerId = params.customerId

  const { recordPayment, fetchCustomer, isMutating, mutationError, clearError } =
    useCustomersStore(
      useShallow((s) => ({
        recordPayment: s.recordPayment,
        fetchCustomer: s.fetchCustomer,
        isMutating: s.isMutating,
        mutationError: s.mutationError,
        clearError: s.clearError,
      })),
    )

  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentDateError, setPaymentDateError] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')

  const submitting = useRef(false)

  const methodOptions = PAYMENT_METHODS.map((m) => ({
    label: t(`customer.method_${m.toLowerCase()}`),
    value: m,
  }))

  // Max allowed date = today + 1 day (to account for timezone differences).
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 1)

  const validateFields = useCallback((): boolean => {
    let valid = true
    const amountNum = Number(amount.trim())
    if (!amount.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      setAmountError('customer.error_invalid_payment')
      valid = false
    } else {
      setAmountError(null)
    }
    if (!paymentDate || paymentDate > maxDate) {
      setPaymentDateError('customer.error_invalid_payment')
      valid = false
    } else {
      setPaymentDateError(null)
    }
    return valid
  }, [amount, paymentDate, maxDate])

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isMutating || !customerId) return

    if (!validateFields()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    submitting.current = true
    clearError()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const input: RecordPaymentInput = {
      amount: Number(amount.trim()),
      paymentDate: paymentDate.toISOString().slice(0, 10),
      paymentMethod: method,
      ...(reference.trim() ? { referenceNumber: reference.trim() } : {}),
    }

    try {
      await recordPayment(customerId, input)
      // Re-fetch detail — balance and currentMonthBill change server-side.
      void fetchCustomer(customerId)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }, [isMutating, customerId, validateFields, clearError, amount, paymentDate, method, reference, recordPayment, fetchCustomer, router])

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('customer.record_payment')}
        showBack
        onBackPress={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            label={t('customer.field_amount')}
            value={amount}
            onChangeText={(v) => {
              setAmount(v)
              if (amountError) setAmountError(null)
            }}
            keyboardType="numeric"
            prefix="₹"
            testID="payment-amount"
            error={amountError ? t(amountError) : undefined}
          />

          {/* AppDatePicker has no testID prop — wrap in View */}
          <View testID="payment-date">
            <AppDatePicker
              label={t('customer.field_payment_date')}
              value={paymentDate}
              onChange={(d) => {
                setPaymentDate(d)
                setPaymentDateError(null)
              }}
              mode="date"
              maximumDate={maxDate}
              placeholder={t('customer.field_payment_date')}
              error={paymentDateError ? t(paymentDateError) : undefined}
            />
          </View>

          {/* AppRadioGroup has no testID prop — wrap in View */}
          <View testID="payment-method">
            <AppRadioGroup
              label={t('customer.field_payment_method')}
              options={methodOptions}
              value={method}
              onChange={(v) => setMethod(v as PaymentMethod)}
              layout="horizontal"
            />
          </View>

          <AppInput
            label={t('customer.field_reference')}
            value={reference}
            onChangeText={setReference}
            maxLength={100}
            testID="payment-reference"
          />
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('customer.record_payment')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isMutating}
            disabled={isMutating || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="payment-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function RecordPaymentScreen() {
  return (
    <ScreenErrorBoundary>
      <RecordPaymentScreenContent />
    </ScreenErrorBoundary>
  )
}

RecordPaymentScreen.displayName = 'RecordPaymentScreen'
