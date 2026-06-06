/**
 * i18n Configuration
 * Purpose: Setup and manage translations
 */

import * as RNLocalize from 'react-native-localize'

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
const deviceLanguages = RNLocalize.getLocales()
const deviceLanguage = deviceLanguages?.[0]?.languageTag || 'en'
const deviceLangCode = deviceLanguage.split('-')[0] as string

// Set initial language
const supportedCodes: SupportedLanguage[] = ['en', 'hi', 'ta', 'te', 'mr', 'bn', 'kn', 'ml', 'gu']
let currentLanguage: SupportedLanguage = 'en'
if (supportedCodes.includes(deviceLangCode as SupportedLanguage)) {
  currentLanguage = deviceLangCode as SupportedLanguage
}

/**
 * Get translation for key
 */
export const t = (key: string, defaultValue?: string): string => {
  try {
    const keys = key.split('.')
    let value: any = translations[currentLanguage]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value === 'string') {
      return value
    }

    // Fallback to English
    if (currentLanguage !== 'en') {
      let enValue: any = translations.en
      for (const k of keys) {
        enValue = enValue?.[k]
      }
      if (typeof enValue === 'string') {
        return enValue
      }
    }

    return defaultValue || key
  } catch (_error) {
    console.warn(`Translation missing for key: ${key}`)
    return defaultValue || key
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
