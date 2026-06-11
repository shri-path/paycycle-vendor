/**
 * ResetPasswordScreen
 * Purpose: OTP + new password entry to complete password reset
 */

import React from 'react'
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { XStack, YStack, styled } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { LIMITS } from '@utils/validation'
import { maskPhone } from '@utils/formatters'
import { useResetPasswordForm } from '../hooks/useResetPasswordForm'

/** Token-based root container — replaces inline-style SafeAreaView */
const ScreenContainer = styled(SafeAreaView, {
  flex: 1,
  backgroundColor: colors.background,
})

function ResetPasswordScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const form = useResetPasswordForm()

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <YStack flex={1} paddingHorizontal={spacing[4]} paddingBottom={spacing[8]}>
          {/* Offline banner */}
          {!form.isConnected ? (
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

          {form.pendingResetPhone ? (
            <XStack
              alignItems="center"
              backgroundColor={colors.primaryBg}
              borderRadius={8}
              padding={spacing[3]}
              marginBottom={spacing[4]}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} weight="semibold">
                {' '}{t('auth.otp_sent_to_number', { phone: maskPhone(form.pendingResetPhone) })}
              </AppText>
            </XStack>
          ) : null}

          {/* Dev hint: shows the actual generated OTP echoed by the API in non-production
              environments. Only rendered in dev builds (tree-shaken in production) and
              only when an OTP is available — never in production. */}
          {__DEV__ && form.devOtp ? (
            <YStack
              backgroundColor={colors.warningBg}
              borderRadius={8}
              padding={spacing[2]}
              marginBottom={spacing[3]}
            >
              <AppText variant="caption" color={colors.warning} testID="reset-dev-otp">
                [Dev] OTP: {form.devOtp}
              </AppText>
            </YStack>
          ) : null}

          {/* Banner only for non-field API/store errors */}
          {form.error ? (
            <YStack
              backgroundColor={colors.errorBg}
              borderRadius={8}
              padding={spacing[3]}
              marginBottom={spacing[4]}
            >
              <AppText variant="caption" color={colors.error} testID="reset-error-banner">
                {t(form.error)}
              </AppText>
            </YStack>
          ) : null}

          <AppInput
            label={t('auth.otp_code')}
            value={form.otp}
            onChangeText={form.onChangeOtp}
            onBlur={form.onBlurOtp}
            placeholder={t('auth.otp_placeholder')}
            keyboardType="number-pad"
            maxLength={LIMITS.otp}
            testID="reset-otp"
            error={form.errors.otp ? t(form.errors.otp) : undefined}
          />

          <AppInput
            label={t('auth.new_password')}
            value={form.newPassword}
            onChangeText={form.onChangePassword}
            onBlur={form.onBlurPassword}
            secureTextEntry={!form.showPassword}
            placeholder="••••••••"
            maxLength={LIMITS.password}
            testID="reset-password"
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

          {/* Spacer pushes the primary CTA to the bottom of the screen (thumb reach) */}
          <YStack flex={1} minHeight={spacing[6]} />

          <AppButton
            label={t('auth.reset_password')}
            onPress={form.submit}
            variant="primary"
            fullWidth
            loading={form.isLoading}
            disabled={form.isLoading || !form.isConnected}
          />
        </YStack>
      </KeyboardAvoidingView>
    </ScreenContainer>
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
