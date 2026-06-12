/**
 * SetCreditLimitScreen — Owner-only (US-008, FEATURE_PLAN §3.8).
 * Purpose: Set a customer's credit limit. Single numeric field ≥0 and ≤9999999.99.
 * PATCH → `setCreditLimit`. Response patches the cached detail. Online-only.
 * On success: navigates back.
 *
 * 5 states: Content | Offline banner | Error banner |
 * Submitting (button spinner) | Validation error.
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
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useCustomersStore } from '../store/customers.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'

const CREDIT_LIMIT_MAX = 9_999_999.99

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

function SetCreditLimitScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ customerId: string }>()
  const customerId = params.customerId

  const { detail, setCreditLimit, isMutating, mutationError, clearError } = useCustomersStore(
    useShallow((s) => ({
      detail: s.detail,
      setCreditLimit: s.setCreditLimit,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      clearError: s.clearError,
    })),
  )

  const customer = customerId ? detail[customerId] : undefined
  const [limitValue, setLimitValue] = useState(
    customer?.creditLimit !== undefined ? String(customer.creditLimit) : '',
  )
  const [fieldError, setFieldError] = useState<string | null>(null)

  const submitting = useRef(false)

  const validateLimit = useCallback((raw: string): string | null => {
    const trimmed = raw.trim()
    if (trimmed === '') return 'validation.required'
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return 'validation.invalid_number'
    if (n < 0) return 'validation.invalid_number'
    if (n > CREDIT_LIMIT_MAX) return 'customer.error_invalid_credit_limit'
    return null
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isMutating || !customerId) return

    const err = validateLimit(limitValue)
    if (err) {
      setFieldError(err)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    submitting.current = true
    clearError()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await setCreditLimit(customerId, Number(limitValue.trim()))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }, [isMutating, customerId, validateLimit, limitValue, clearError, setCreditLimit, router])

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('customer.set_credit_limit')}
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
            label={t('customer.credit_limit')}
            value={limitValue}
            onChangeText={(v) => {
              setLimitValue(v)
              if (fieldError) setFieldError(null)
            }}
            onBlur={() => {
              const err = validateLimit(limitValue)
              setFieldError(err)
            }}
            keyboardType="numeric"
            prefix="₹"
            testID="credit-limit-input"
            error={fieldError ? t(fieldError) : undefined}
          />
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('customer.set_credit_limit')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isMutating}
            disabled={isMutating || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="credit-limit-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function SetCreditLimitScreen() {
  return (
    <ScreenErrorBoundary>
      <SetCreditLimitScreenContent />
    </ScreenErrorBoundary>
  )
}

SetCreditLimitScreen.displayName = 'SetCreditLimitScreen'
