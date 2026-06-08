/**
 * useSignupForm — owns the SignupScreen form state, per-field validation,
 * touched-field live re-validation, double-tap protection, and submit flow.
 * Errors are stored as RAW i18n keys; the screen translates with t() at render.
 */

import { useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/auth.store'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import {
  sanitizeText,
  validateBusinessName,
  validatePassword,
  validatePhone,
} from '@utils/validation'

export interface SignupFormErrors {
  /** Raw i18n key or null */
  businessName: string | null
  /** Raw i18n key or null */
  phone: string | null
  /** Raw i18n key or null */
  password: string | null
}

export interface UseSignupForm {
  businessName: string
  countryCode: string
  phone: string
  password: string
  category: string | number
  showPassword: boolean
  errors: SignupFormErrors
  /** Store-level error as a raw i18n key, or null */
  error: string | null
  isLoading: boolean
  isConnected: boolean
  /** True when all required fields currently pass validation */
  isValid: boolean
  onChangeBusinessName: (raw: string) => void
  onBlurBusinessName: () => void
  onChangePhone: (code: string, number: string) => void
  onBlurPhone: () => void
  onChangePassword: (value: string) => void
  onBlurPassword: () => void
  setCategory: (value: string | number) => void
  toggleShowPassword: () => void
  submit: () => Promise<void>
}

export function useSignupForm(): UseSignupForm {
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

  // Per-field error state holds RAW i18n keys (translated with t() only at render).
  const [businessNameError, setBusinessNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [businessNameTouched, setBusinessNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  // Double-tap protection
  const submitting = useRef(false)

  const fullPhone = `${countryCode}${phone}`

  const onChangeBusinessName = (raw: string) => {
    const value = sanitizeText(raw)
    setBusinessName(value)
    if (businessNameTouched) setBusinessNameError(validateBusinessName(value))
  }

  const onBlurBusinessName = () => {
    setBusinessNameTouched(true)
    setBusinessNameError(validateBusinessName(businessName))
  }

  const onChangePhone = (code: string, number: string) => {
    setCountryCode(code)
    setPhone(number)
    if (phoneTouched) setPhoneError(validatePhone(number))
  }

  const onBlurPhone = () => {
    setPhoneTouched(true)
    setPhoneError(validatePhone(phone))
  }

  const onChangePassword = (value: string) => {
    setPassword(value)
    if (passwordTouched) setPasswordError(validatePassword(value))
  }

  const onBlurPassword = () => {
    setPasswordTouched(true)
    setPasswordError(validatePassword(password))
  }

  const toggleShowPassword = () => setShowPassword((v) => !v)

  const validateForm = (): boolean => {
    const bnError = validateBusinessName(businessName)
    const pError = validatePhone(phone)
    const pwError = validatePassword(password)
    setBusinessNameError(bnError)
    setPhoneError(pError)
    setPasswordError(pwError)
    setBusinessNameTouched(true)
    setPhoneTouched(true)
    setPasswordTouched(true)
    return !bnError && !pError && !pwError
  }

  const isValid =
    !validateBusinessName(businessName) && !validatePhone(phone) && !validatePassword(password)

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
      await signup(fullPhone, password, businessName.trim())
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(app)/home')
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }

  return {
    businessName,
    countryCode,
    phone,
    password,
    category,
    showPassword,
    errors: {
      businessName: businessNameError,
      phone: phoneError,
      password: passwordError,
    },
    error,
    isLoading,
    isConnected,
    isValid,
    onChangeBusinessName,
    onBlurBusinessName,
    onChangePhone,
    onBlurPhone,
    onChangePassword,
    onBlurPassword,
    setCategory,
    toggleShowPassword,
    submit,
  }
}
