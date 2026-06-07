/**
 * ForgotPasswordScreen
 * Purpose: Phone entry to trigger OTP for password reset
 */

import React, { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { XStack, YStack } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'

function ForgotPasswordScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { forgotPassword, isLoading, error, clearError } = useAuthStore(
    useShallow((s) => ({
      forgotPassword: s.forgotPassword,
      isLoading: s.isLoading,
      error: s.error,
      clearError: s.clearError,
    })),
  )
  const { isConnected } = useNetworkStatus()

  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Double-tap protection
  const submitting = useRef(false)

  const fullPhone = `${countryCode}${phone}`

  const handleSendOtp = async () => {
    if (submitting.current || isLoading) return
    submitting.current = true

    clearError()
    setValidationError(null)

    if (!phone.trim() || phone.length < 10) {
      setValidationError(t('validation.invalid_phone'))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await forgotPassword(fullPhone)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.push('/(auth)/reset-password')
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }

  const displayError = validationError ?? error

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <YStack flex={1} paddingHorizontal={spacing[4]} paddingBottom={spacing[8]}>
          {/* Offline banner */}
          {!isConnected ? (
            <AppAlert type="warning" title={t('auth.offline_sign_in')} />
          ) : null}

          {/* Header */}
          <XStack
            alignItems="center"
            gap={spacing[3]}
            paddingTop={spacing[4]}
            paddingBottom={spacing[4]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.back')}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <AppText variant="h3" weight="bold">
              {t('auth.forgot_password_title')}
            </AppText>
          </XStack>

          <AppText variant="body" color={colors.textSecondary} style={{ marginBottom: spacing[6] }}>
            {t('auth.forgot_password_desc')}
          </AppText>

          {displayError ? (
            <YStack
              backgroundColor={colors.errorBg}
              borderRadius={8}
              padding={spacing[3]}
              marginBottom={spacing[4]}
            >
              <AppText variant="caption" color={colors.error}>
                {t(displayError)}
              </AppText>
            </YStack>
          ) : null}

          <AppPhoneInput
            label={t('auth.phone')}
            countryCode={countryCode}
            phone={phone}
            onChange={(code, number) => {
              setCountryCode(code)
              setPhone(number)
            }}
          />

          <AppButton
            label={t('auth.send_otp')}
            onPress={handleSendOtp}
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading || !isConnected}
          />

          <AppButton
            label={t('auth.back_to_login')}
            onPress={() => router.replace('/(auth)/login')}
            variant="link"
            fullWidth
          />
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function ForgotPasswordScreen() {
  return (
    <ScreenErrorBoundary>
      <ForgotPasswordScreenContent />
    </ScreenErrorBoundary>
  )
}

ForgotPasswordScreen.displayName = 'ForgotPasswordScreen'
