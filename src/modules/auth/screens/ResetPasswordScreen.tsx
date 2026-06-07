/**
 * ResetPasswordScreen
 * Purpose: OTP + new password entry to complete password reset
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
import { AppInput } from '@components/primitives/AppInput'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { validatePassword } from '@utils/validation'

function ResetPasswordScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { resetPassword, isLoading, error, clearError, pendingResetPhone } = useAuthStore(
    useShallow((s) => ({
      resetPassword: s.resetPassword,
      isLoading: s.isLoading,
      error: s.error,
      clearError: s.clearError,
      pendingResetPhone: s.pendingResetPhone,
    })),
  )
  const { isConnected } = useNetworkStatus()

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Double-tap protection
  const submitting = useRef(false)

  const validate = (): boolean => {
    if (!/^[0-9]{6}$/.test(otp)) {
      setValidationError(t('validation.otp_invalid'))
      return false
    }
    const pwdError = validatePassword(newPassword)
    if (pwdError) {
      setValidationError(t(pwdError))
      return false
    }
    return true
  }

  const handleReset = async () => {
    if (submitting.current || isLoading) return
    submitting.current = true

    clearError()
    setValidationError(null)

    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await resetPassword(otp, newPassword)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(auth)/login')
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
              {t('auth.reset_password_title')}
            </AppText>
          </XStack>

          <AppText variant="body" color={colors.textSecondary} style={{ marginBottom: spacing[4] }}>
            {t('auth.reset_password_desc')}
          </AppText>

          {pendingResetPhone ? (
            <XStack
              alignItems="center"
              backgroundColor={colors.primaryBg}
              borderRadius={8}
              padding={spacing[3]}
              marginBottom={spacing[4]}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} weight="semibold">
                {' '}{t('auth.otp_sent_to')} {pendingResetPhone}
              </AppText>
            </XStack>
          ) : null}

          {/* Dev hint: only visible in development builds, tree-shaken in production */}
          {__DEV__ ? (
            <YStack
              backgroundColor={colors.warningBg}
              borderRadius={8}
              padding={spacing[2]}
              marginBottom={spacing[3]}
            >
              <AppText variant="caption" color={colors.warning}>
                [Dev] OTP: 123456
              </AppText>
            </YStack>
          ) : null}

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

          <AppInput
            label={t('auth.otp_code')}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            placeholder={t('auth.otp_placeholder')}
            keyboardType="number-pad"
            maxLength={6}
          />

          <AppInput
            label={t('auth.new_password')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            helperText={t('validation.password_complexity')}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <AppButton
            label={t('auth.reset_password')}
            onPress={handleReset}
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading || !isConnected}
          />
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function ResetPasswordScreen() {
  return (
    <ScreenErrorBoundary>
      <ResetPasswordScreenContent />
    </ScreenErrorBoundary>
  )
}

ResetPasswordScreen.displayName = 'ResetPasswordScreen'
