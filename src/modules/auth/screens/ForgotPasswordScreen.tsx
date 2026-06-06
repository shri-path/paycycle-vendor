/**
 * ForgotPasswordScreen
 * Purpose: Phone entry to trigger OTP for password reset
 */

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export default function ForgotPasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { forgotPassword, isLoading, error, clearError } = useAuthStore()

  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const fullPhone = `${countryCode}${phone}`

  const handleSendOtp = async () => {
    clearError()
    setValidationError(null)
    if (!phone.trim() || phone.length < 10) {
      setValidationError(t('validation.invalid_phone'))
      return
    }
    try {
      await forgotPassword(fullPhone)
      router.push('/(auth)/reset-password')
    } catch {
      // error is set in store
    }
  }

  const displayError = validationError ?? error

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <AppText variant="h3" weight="bold">
              {t('auth.forgot_password_title')}
            </AppText>
          </View>

          <AppText variant="body" color={colors.textSecondary} style={styles.desc}>
            {t('auth.forgot_password_desc')}
          </AppText>

          {displayError ? (
            <View style={styles.errorBanner}>
              <AppText variant="caption" color={colors.error}>
                {displayError}
              </AppText>
            </View>
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
          />

          <AppButton
            label={t('auth.back_to_login')}
            onPress={() => router.replace('/(auth)/login')}
            variant="link"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desc: {
    marginBottom: spacing[6],
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
})
