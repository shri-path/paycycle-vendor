/**
 * SignupScreen
 * Purpose: New vendor owner account creation
 */

import React from 'react'
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { ScrollView, XStack, YStack, styled } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { LIMITS } from '@utils/validation'
import { useSignupForm } from '../hooks/useSignupForm'

/** Token-based root container — replaces inline-style SafeAreaView */
const ScreenContainer = styled(SafeAreaView, {
  flex: 1,
  backgroundColor: colors.background,
})

/** Category values — labels are resolved via t() at render time */
const CATEGORY_KEYS = ['milk_dairy', 'newspaper', 'bread_bakery', 'vegetables', 'other'] as const

function SignupScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const form = useSignupForm()

  // Resolve category options with translated labels at render time
  const categoryOptions = CATEGORY_KEYS.map((k) => ({
    label: t(`auth.category_${k}`),
    value: k,
  }))

  return (
    <ScreenContainer>
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
          {!form.isConnected ? (
            <AppAlert type="warning" title={t('auth.offline_sign_in')} />
          ) : null}

          {/* Header */}
          <XStack
            alignItems="center"
            gap={spacing[3]}
            paddingTop={spacing[4]}
            paddingBottom={spacing[6]}
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
              {t('auth.create_account')}
            </AppText>
          </XStack>

          {/* Form */}
          <YStack gap={spacing[1]}>
            {/* Banner only for non-field API/store errors */}
            {form.error ? (
              <YStack
                backgroundColor={colors.errorBg}
                borderRadius={8}
                padding={spacing[3]}
                marginBottom={spacing[2]}
              >
                <AppText variant="caption" color={colors.error} testID="signup-error-banner">
                  {t(form.error)}
                </AppText>
              </YStack>
            ) : null}

            <AppInput
              label={t('auth.business_name')}
              value={form.businessName}
              onChangeText={form.onChangeBusinessName}
              onBlur={form.onBlurBusinessName}
              placeholder={t('auth.business_name_placeholder')}
              maxLength={LIMITS.name}
              testID="signup-business-name"
              error={form.errors.businessName ? t(form.errors.businessName) : undefined}
            />

            <AppPhoneInput
              label={t('auth.phone')}
              countryCode={form.countryCode}
              phone={form.phone}
              onChange={form.onChangePhone}
              onBlur={form.onBlurPhone}
              maxLength={LIMITS.phone}
              testID="signup-phone"
              error={form.errors.phone ? t(form.errors.phone) : undefined}
            />

            <AppInput
              label={t('auth.create_password')}
              value={form.password}
              onChangeText={form.onChangePassword}
              onBlur={form.onBlurPassword}
              secureTextEntry={!form.showPassword}
              placeholder="••••••••"
              maxLength={LIMITS.password}
              testID="signup-password"
              helperText={t('validation.password_complexity')}
              error={form.errors.password ? t(form.errors.password) : undefined}
              rightIcon={
                <TouchableOpacity
                  onPress={form.toggleShowPassword}
                  accessibilityRole="button"
                  accessibilityLabel={
                    form.showPassword ? t('auth.hide_password') : t('auth.show_password')
                  }
                >
                  <Ionicons
                    name={form.showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              }
            />

            <AppSelect
              label={t('auth.category')}
              options={categoryOptions}
              value={form.category}
              onChange={form.setCategory}
              placeholder={t('auth.category_placeholder')}
            />

            <AppButton
              label={t('auth.create_account')}
              onPress={form.submit}
              variant="primary"
              fullWidth
              loading={form.isLoading}
              disabled={form.isLoading || !form.isConnected}
            />

            <YStack paddingTop={spacing[2]} paddingHorizontal={spacing[2]}>
              <AppText variant="caption" color={colors.textSecondary} align="center">
                {t('auth.terms_agree')}{' '}
                <AppText variant="caption" color={colors.primary} weight="semibold">
                  {t('auth.terms_of_service')}
                </AppText>
              </AppText>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
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
