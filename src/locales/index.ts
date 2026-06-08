/**
 * i18n Configuration
 * Purpose: Setup and manage translations
 */

import * as Localization from 'expo-localization'

import en from './en.json'
import hi from './hi.json'
import ta from './ta.json'
import te from './te.json'
import mr from './mr.json'
import bn from './bn.json'
import kn from './kn.json'
import ml from './ml.json'
import gu from './gu.json'

// Supported language codes
export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'kn' | 'ml' | 'gu'

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
]

// Translation store
const translations: Record<SupportedLanguage, typeof en> = {
  en,
  hi,
  ta,
  te,
  mr,
  bn,
  kn,
  ml,
  gu,
}

// Find device language
const deviceLanguages = Localization.getLocales()
const deviceLanguage = deviceLanguages?.[0]?.languageTag || 'en'
const deviceLangCode = deviceLanguage.split('-')[0] as string

// Set initial language
const supportedCodes: SupportedLanguage[] = ['en', 'hi', 'ta', 'te', 'mr', 'bn', 'kn', 'ml', 'gu']
let currentLanguage: SupportedLanguage = 'en'
if (supportedCodes.includes(deviceLangCode as SupportedLanguage)) {
  currentLanguage = deviceLangCode as SupportedLanguage
}

/** Interpolation params for translation strings (e.g. {{phone}}). */
export type TranslationParams = Record<string, string | number>

/** Replaces {{token}} placeholders in a resolved string with provided params. */
function interpolate(str: string, params?: TranslationParams): string {
  if (!params) return str
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token: string) =>
    params[token] != null ? String(params[token]) : `{{${token}}}`,
  )
}

/**
 * Get translation for key.
 * @param key Dot-namespaced translation key (e.g. 'auth.sign_in').
 * @param paramsOrDefault Interpolation params object, or a default-value string.
 * @param defaultValue Fallback string when used together with params.
 */
export const t = (
  key: string,
  paramsOrDefault?: TranslationParams | string,
  defaultValue?: string,
): string => {
  const params = typeof paramsOrDefault === 'object' ? paramsOrDefault : undefined
  const fallback = typeof paramsOrDefault === 'string' ? paramsOrDefault : defaultValue

  try {
    const keys = key.split('.')
    let value: any = translations[currentLanguage]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value === 'string') {
      return interpolate(value, params)
    }

    // Fallback to English
    if (currentLanguage !== 'en') {
      let enValue: any = translations.en
      for (const k of keys) {
        enValue = enValue?.[k]
      }
      if (typeof enValue === 'string') {
        return interpolate(enValue, params)
      }
    }

    return fallback || key
  } catch (_error) {
    console.warn(`Translation missing for key: ${key}`)
    return fallback || key
  }
}

/**
 * Set language and persist to storage
 */
export const setLanguage = async (lang: SupportedLanguage): Promise<void> => {
  currentLanguage = lang
  // TODO: Persist to AsyncStorage
}

/**
 * Get current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return currentLanguage
}

export default {
  t,
  setLanguage,
  getCurrentLanguage,
}
