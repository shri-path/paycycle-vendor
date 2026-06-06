/**
 * ResetPasswordScreen
 * Purpose: OTP + new password entry to complete password reset
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
import { AppInput } from '@components/primitives/AppInput'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { isMockMode } from '@services/config'
import { MOCK_OTP } from '@services/mocks'

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/,
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'validation.password_min_8'
  if (!PASSWORD_REGEX.uppercase.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.lowercase.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.digit.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.special.test(password)) return 'validation.password_complexity'
  return null
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { resetPassword, isLoading, error, clearError, pendingResetPhone } = useAuthStore()

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

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
    clearError()
    setValidationError(null)
    if (!validate()) return
    try {
      await resetPassword(otp, newPassword)
      router.replace('/(auth)/login')
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
              {t('auth.reset_password_title')}
            </AppText>
          </View>

          <AppText variant="body" color={colors.textSecondary} style={styles.desc}>
            {t('auth.reset_password_desc')}
          </AppText>

          {pendingResetPhone ? (
            <View style={styles.phoneBadge}>
              <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} weight="semibold">
                {' '}{t('auth.otp_sent_to')} {pendingResetPhone}
              </AppText>
            </View>
          ) : null}

          {/* Dev hint in mock mode */}
          {isMockMode ? (
            <View style={styles.devHint}>
              <AppText variant="caption" color={colors.warning}>
                [Dev] OTP: {MOCK_OTP}
              </AppText>
            </View>
          ) : null}

          {displayError ? (
            <View style={styles.errorBanner}>
              <AppText variant="caption" color={colors.error}>
                {displayError}
              </AppText>
            </View>
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
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
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
    marginBottom: spacing[4],
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  devHint: {
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    padding: spacing[2],
    marginBottom: spacing[3],
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
})
