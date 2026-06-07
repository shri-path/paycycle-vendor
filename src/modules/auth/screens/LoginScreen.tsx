/**
 * LoginScreen
 * Purpose: Phone + password sign-in for vendor owners and staff
 */

import React, { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { ScrollView, XStack, YStack } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'

function LoginScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore(
    useShallow((s) => ({
      login: s.login,
      isLoading: s.isLoading,
      error: s.error,
      clearError: s.clearError,
    })),
  )
  const { isConnected } = useNetworkStatus()

  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Double-tap protection — ref to avoid stale closure issues
  const submitting = useRef(false)

  const fullPhone = `${countryCode}${phone}`

  const validate = (): boolean => {
    if (!phone.trim() || phone.length < 10) {
      setValidationError(t('validation.invalid_phone'))
      return false
    }
    if (!password) {
      setValidationError(t('validation.required'))
      return false
    }
    return true
  }

  const handleLogin = async () => {
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
      await login(fullPhone, password)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(app)/home')
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
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Offline banner */}
          {!isConnected ? (
            <AppAlert type="warning" title={t('auth.offline_sign_in')} />
          ) : null}

          {/* Logo area */}
          <YStack
            alignItems="center"
            paddingTop={spacing[10]}
            paddingBottom={spacing[8]}
            gap={spacing[2]}
          >
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor={colors.primary}
              justifyContent="center"
              alignItems="center"
              marginBottom={spacing[2]}
            >
              <Ionicons name="bicycle-outline" size={40} color={colors.white} />
            </YStack>
            <AppText variant="h3" weight="bold" align="center" color={colors.primary}>
              {t('common.app_name')}
            </AppText>
            <AppText variant="caption" align="center" color={colors.textSecondary}>
              {t('auth.tagline')}
            </AppText>
          </YStack>

          {/* Form */}
          <YStack gap={spacing[1]}>
            {displayError ? (
              <YStack
                backgroundColor={colors.errorBg}
                borderRadius={8}
                padding={spacing[3]}
                marginBottom={spacing[2]}
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

            <AppInput
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
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
              label={t('auth.sign_in')}
              onPress={handleLogin}
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !isConnected}
            />

            <AppButton
              label={t('auth.forgot_password')}
              onPress={() => router.push('/(auth)/forgot-password')}
              variant="link"
              fullWidth
            />
          </YStack>

          {/* Divider */}
          <YStack marginVertical={spacing[6]} alignItems="center">
            <YStack width="100%" height={1} backgroundColor={colors.gray200} />
          </YStack>

          {/* Sign up link */}
          <XStack justifyContent="center" alignItems="center">
            <AppText variant="body" color={colors.textSecondary}>
              {t('auth.new_vendor')}{' '}
            </AppText>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              accessibilityRole="button"
              accessibilityLabel={t('auth.sign_up')}
            >
              <AppText variant="body" weight="semibold" color={colors.primary}>
                {t('auth.sign_up')}
              </AppText>
            </TouchableOpacity>
          </XStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function LoginScreen() {
  return (
    <ScreenErrorBoundary>
      <LoginScreenContent />
    </ScreenErrorBoundary>
  )
}

LoginScreen.displayName = 'LoginScreen'
