/**
 * SignupScreen
 * Purpose: New vendor owner account creation
 */

import React, { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { validatePassword } from '@utils/validation'

/** Category values — labels are resolved via t() at render time */
const CATEGORY_KEYS = ['milk_dairy', 'newspaper', 'bread_bakery', 'vegetables', 'other'] as const

function SignupScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signup, isLoading, error, clearError } = useAuthStore(
    useShallow((s) => ({
      signup: s.signup,
      isLoading: s.isLoading,
      error: s.error,
      clearError: s.clearError,
    })),
  )
  const { isConnected } = useNetworkStatus()

  const [businessName, setBusinessName] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [category, setCategory] = useState<string | number>('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Double-tap protection
  const submitting = useRef(false)

  const fullPhone = `${countryCode}${phone}`

  // Resolve category options with translated labels at render time
  const categoryOptions = CATEGORY_KEYS.map((k) => ({
    label: t(`auth.category_${k}`),
    value: k,
  }))

  const validate = (): boolean => {
    if (!businessName.trim()) {
      setValidationError(t('validation.business_name_required'))
      return false
    }
    if (!phone.trim() || phone.length < 10) {
      setValidationError(t('validation.invalid_phone'))
      return false
    }
    const pwdError = validatePassword(password)
    if (pwdError) {
      setValidationError(t(pwdError))
      return false
    }
    return true
  }

  const handleSignup = async () => {
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
      await signup(fullPhone, password, businessName.trim())
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Offline banner */}
          {!isConnected ? (
            <AppAlert type="warning" title={t('auth.offline_sign_in')} />
          ) : null}

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t('auth.back')}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <AppText variant="h3" weight="bold">
              {t('auth.create_account')}
            </AppText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {displayError ? (
              <View style={styles.errorBanner}>
                <AppText variant="caption" color={colors.error}>
                  {t(displayError)}
                </AppText>
              </View>
            ) : null}

            <AppInput
              label={t('auth.business_name')}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={t('auth.business_name_placeholder')}
              maxLength={150}
            />

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
              label={t('auth.create_password')}
              value={password}
              onChangeText={setPassword}
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

            <AppSelect
              label={t('auth.category')}
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              placeholder={t('auth.category_placeholder')}
            />

            <AppButton
              label={t('auth.create_account')}
              onPress={handleSignup}
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !isConnected}
            />

            <View style={styles.termsRow}>
              <AppText variant="caption" color={colors.textSecondary} align="center">
                {t('auth.terms_agree')}{' '}
                <AppText variant="caption" color={colors.primary} weight="semibold">
                  {t('auth.terms_of_service')}
                </AppText>
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function SignupScreen() {
  return (
    <ScreenErrorBoundary>
      <SignupScreenContent />
    </ScreenErrorBoundary>
  )
}

SignupScreen.displayName = 'SignupScreen'

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: spacing[1],
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  termsRow: {
    paddingTop: spacing[2],
    paddingHorizontal: spacing[2],
  },
})
