/**
 * SignupScreen
 * Purpose: New vendor owner account creation
 */

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
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
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { useAuthStore } from '../store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

const CATEGORIES = [
  { label: 'Milk & Dairy', value: 'milk_dairy' },
  { label: 'Newspaper', value: 'newspaper' },
  { label: 'Bread & Bakery', value: 'bread_bakery' },
  { label: 'Vegetables', value: 'vegetables' },
  { label: 'Other', value: 'other' },
]

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

export default function SignupScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signup, isLoading, error, clearError } = useAuthStore()

  const [businessName, setBusinessName] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [category, setCategory] = useState<string | number>('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const fullPhone = `${countryCode}${phone}`

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
    clearError()
    setValidationError(null)
    if (!validate()) return
    try {
      await signup(fullPhone, password, businessName.trim())
      router.replace('/(app)/home')
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
                  {displayError}
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
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
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
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
              placeholder="Select category (optional)"
            />

            <AppButton
              label={t('auth.create_account')}
              onPress={handleSignup}
              variant="primary"
              fullWidth
              loading={isLoading}
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
