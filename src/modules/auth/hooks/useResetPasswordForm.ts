/**
 * useResetPasswordForm — owns the ResetPasswordScreen form state, per-field
 * validation, touched-field live re-validation, double-tap protection, and the
 * reset submit flow. Errors are stored as RAW i18n keys; the screen translates
 * with t() at render.
 */

import { useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/auth.store'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { validateOtp, validatePassword } from '@utils/validation'

export interface ResetPasswordFormErrors {
  /** Raw i18n key or null */
  otp: string | null
  /** Raw i18n key or null */
  password: string | null
}

export interface UseResetPasswordForm {
  otp: string
  newPassword: string
  showPassword: boolean
  /** The phone awaiting reset (raw, unmasked) — screen masks for display */
  pendingResetPhone: string | null
  errors: ResetPasswordFormErrors
  /** Store-level error as a raw i18n key, or null */
  error: string | null
  isLoading: boolean
  isConnected: boolean
  /** True when all fields currently pass validation */
  isValid: boolean
  onChangeOtp: (text: string) => void
  onBlurOtp: () => void
  onChangePassword: (value: string) => void
  onBlurPassword: () => void
  toggleShowPassword: () => void
  submit: () => Promise<void>
}

export function useResetPasswordForm(): UseResetPasswordForm {
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

  // Per-field error state holds RAW i18n keys (translated with t() only at render).
  const [otpError, setOtpError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [otpTouched, setOtpTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  // Double-tap protection
  const submitting = useRef(false)

  const onChangeOtp = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '')
    setOtp(digits)
    if (otpTouched) setOtpError(validateOtp(digits))
  }

  const onBlurOtp = () => {
    setOtpTouched(true)
    setOtpError(validateOtp(otp))
  }

  const onChangePassword = (value: string) => {
    setNewPassword(value)
    if (passwordTouched) setPasswordError(validatePassword(value))
  }

  const onBlurPassword = () => {
    setPasswordTouched(true)
    setPasswordError(validatePassword(newPassword))
  }

  const toggleShowPassword = () => setShowPassword((v) => !v)

  const validateForm = (): boolean => {
    const oError = validateOtp(otp)
    const pwError = validatePassword(newPassword)
    setOtpError(oError)
    setPasswordError(pwError)
    setOtpTouched(true)
    setPasswordTouched(true)
    return !oError && !pwError
  }

  const isValid = !validateOtp(otp) && !validatePassword(newPassword)

  const submit = async () => {
    if (submitting.current || isLoading) return
    submitting.current = true

    clearError()

    if (!validateForm()) {
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

  return {
    otp,
    newPassword,
    showPassword,
    pendingResetPhone,
    errors: {
      otp: otpError,
      password: passwordError,
    },
    error,
    isLoading,
    isConnected,
    isValid,
    onChangeOtp,
    onBlurOtp,
    onChangePassword,
    onBlurPassword,
    toggleShowPassword,
    submit,
  }
}
