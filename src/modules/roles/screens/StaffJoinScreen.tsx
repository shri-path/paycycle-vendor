/**
 * StaffJoinScreen — public (US-002, wireframe 1.3).
 * Purpose: Activate a staff membership from a `paycyclevendor://join/<token>` invite
 * deep link and auto-log-in. The invite summary (vendor name + assigned-list labels)
 * is rendered optimistically from the URL query params (OQ-1 — cosmetic, no PII); the
 * token is only truly validated server-side on submit via `accept-invite`.
 *
 * OQ-2: if a session already exists, we require an explicit sign-out first (no silent
 * logout) — we show a "signed in as <X>" prompt with a "Sign out & continue" button.
 *
 * 5 states: Loading (reading params / checking session), Empty (n/a — single record),
 * Error (invalid/expired token → full-screen empty state), Content (summary + form or
 * the sign-out-first prompt), Offline (warning banner + submit disabled).
 *
 * Security: tokens go to SecureStore via auth.store.acceptInvite (reuses the login path).
 */

import React, { useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { ScrollView, YStack, styled } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { LIMITS, sanitizeText, validatePassword, validateStaffName } from '@utils/validation'

const ScreenContainer = styled(SafeAreaView, {
  flex: 1,
  backgroundColor: colors.background,
})

/** Splits the optional `lists` query param ("Morning Milk,Morning Bread") into labels. */
function parseListLabels(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  const value = Array.isArray(raw) ? raw.join(',') : raw
  return value
    .split(',')
    .map((s) => sanitizeText(s).trim())
    .filter(Boolean)
    .slice(0, 20)
}

function firstParam(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined
  return Array.isArray(raw) ? raw[0] : raw
}

function StaffJoinScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const params = useLocalSearchParams<{ token?: string; vendor?: string; lists?: string }>()

  const { acceptInvite, logout, isLoading, error, clearError, isAuthenticated, user, isHydrated } =
    useAuthStore(
      useShallow((s) => ({
        acceptInvite: s.acceptInvite,
        logout: s.logout,
        isLoading: s.isLoading,
        error: s.error,
        clearError: s.clearError,
        isAuthenticated: s.isAuthenticated,
        user: s.user,
        isHydrated: s.isHydrated,
      })),
    )

  const token = firstParam(params.token)
  const vendorName = useMemo(
    () => sanitizeText(firstParam(params.vendor) ?? '').trim(),
    [params.vendor],
  )
  const listLabels = useMemo(() => parseListLabels(params.lists), [params.lists])

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const submitting = useRef(false)
  const signingOut = useRef(false)

  const onChangePassword = (value: string) => {
    setPassword(value)
    if (passwordTouched) setPasswordError(validatePassword(value))
  }

  const onChangeName = (value: string) => {
    const next = sanitizeText(value)
    setName(next)
    if (nameError) setNameError(validateStaffName(next))
  }

  const handleSignOutAndContinue = async () => {
    if (signingOut.current || isLoading) return
    signingOut.current = true
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await logout()
    } finally {
      signingOut.current = false
    }
  }

  const handleJoin = async () => {
    if (submitting.current || isLoading || !token) return
    submitting.current = true
    clearError()

    const nError = validateStaffName(name)
    const pwError = validatePassword(password)
    setNameError(nError)
    setPasswordError(pwError)
    setPasswordTouched(true)

    if (nError || pwError) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const trimmedName = name.trim()
      await acceptInvite(token, password, trimmedName.length > 0 ? trimmedName : undefined)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // Auto-login complete (tokens in SecureStore). Hand off to the role router.
      router.replace('/(app)')
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }

  // Loading: store rehydrating (can't yet decide logged-in vs out).
  if (!isHydrated) {
    return (
      <ScreenContainer>
        <YStack flex={1} justifyContent="center" alignItems="center" padding={spacing[4]}>
          <Ionicons name="hourglass-outline" size={componentSizes.icon.xxl} color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} align="center">
            {t('common.loading')}
          </AppText>
        </YStack>
      </ScreenContainer>
    )
  }

  // Error: a missing/invalid token in the deep link → full-screen empty state.
  if (!token) {
    return (
      <ScreenContainer>
        <AppEmptyState
          icon={<Ionicons name="link-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t('roles.error_invite_invalid')}
          actionLabel={t('auth.sign_in')}
          onActionPress={() => router.replace('/(auth)/login')}
        />
      </ScreenContainer>
    )
  }

  const logoBlock = (
    <YStack alignItems="center" paddingTop={spacing[8]} paddingBottom={spacing[6]} gap={spacing[2]}>
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
    </YStack>
  )

  // Content — already-logged-in prompt (OQ-2): require explicit sign-out first.
  if (isAuthenticated) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {logoBlock}
          <YStack gap={spacing[3]}>
            <AppCard variant="elevated">
              <YStack gap={spacing[1]}>
                <AppText variant="h4" weight="bold">
                  {t('roles.join_signed_in_title', { name: user?.phone ?? '' })}
                </AppText>
                <AppText variant="body" color={colors.textSecondary}>
                  {t('roles.join_signed_in_body')}
                </AppText>
              </YStack>
            </AppCard>
            <AppButton
              label={t('roles.join_sign_out_continue')}
              onPress={handleSignOutAndContinue}
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              testID="join-sign-out-continue"
            />
            <AppButton
              label={t('auth.sign_in')}
              onPress={() => router.replace('/(auth)/login')}
              variant="link"
              fullWidth
            />
          </YStack>
        </ScrollView>
      </ScreenContainer>
    )
  }

  // Content — the join form (logged out).
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
          {!isConnected ? (
            <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
          ) : null}

          {logoBlock}

          <Animated.View entering={FadeIn.duration(200)}>
            <AppCard variant="elevated" testID="join-summary-card">
              <YStack gap={spacing[1]}>
                <AppText variant="h4" weight="bold" testID="join-summary-title">
                  {t('roles.join_title', { vendor: vendorName || t('common.app_name') })}
                </AppText>
                <AppText variant="body" color={colors.textSecondary}>
                  {t('roles.join_subtitle')}
                </AppText>
                {listLabels.length > 0 ? (
                  <YStack marginTop={spacing[2]} gap={spacing[1]}>
                    <AppText variant="label" weight="semibold" color={colors.textSecondary}>
                      {t('roles.assigned_lists')}
                    </AppText>
                    {listLabels.map((label, i) => (
                      <AppText key={`${label}-${i}`} variant="body">
                        • {label}
                      </AppText>
                    ))}
                  </YStack>
                ) : null}
              </YStack>
            </AppCard>
          </Animated.View>

          <YStack gap={spacing[1]} marginTop={spacing[4]}>
            {error ? (
              <YStack
                backgroundColor={colors.errorBg}
                borderRadius={8}
                padding={spacing[3]}
                marginBottom={spacing[2]}
              >
                <AppText variant="caption" color={colors.error} testID="join-error-banner">
                  {t(error)}
                </AppText>
              </YStack>
            ) : null}

            <AppInput
              label={t('roles.staff_name')}
              value={name}
              onChangeText={onChangeName}
              placeholder={t('roles.staff_name_placeholder')}
              maxLength={LIMITS.name}
              testID="join-name"
              error={nameError ? t(nameError) : undefined}
            />

            <AppInput
              label={t('auth.password')}
              value={password}
              onChangeText={onChangePassword}
              onBlur={() => {
                setPasswordTouched(true)
                setPasswordError(validatePassword(password))
              }}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              maxLength={LIMITS.password}
              testID="join-password"
              error={passwordError ? t(passwordError) : undefined}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
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
              label={t('roles.join_as_staff')}
              onPress={handleJoin}
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !isConnected}
              testID="join-submit"
            />
            {!isConnected ? (
              <AppText
                variant="caption"
                color={colors.textSecondary}
                align="center"
                accessibilityLabel={t('common.offline_message')}
              >
                {t('common.offline_message')}
              </AppText>
            ) : null}
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  )
}

export default function StaffJoinScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffJoinScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffJoinScreen.displayName = 'StaffJoinScreen'
