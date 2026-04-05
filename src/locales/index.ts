/**
 * i18n Configuration
 * Purpose: Setup and manage translations
 */

import * as RNLocalize from 'react-native-localize'

import en from './en.json'
import hi from './hi.json'

// Translation store
const translations: Record<'en' | 'hi', typeof en> = {
  en,
  hi,
}

// Find device language
const deviceLanguages = RNLocalize.getLocales()
const deviceLanguage = deviceLanguages?.[0]?.languageTag || 'en'

// Set initial language
let currentLanguage: 'en' | 'hi' = 'en'
if (deviceLanguage && (deviceLanguage === 'en' || deviceLanguage === 'hi')) {
  currentLanguage = deviceLanguage as 'en' | 'hi'
} else if (deviceLanguage && deviceLanguage.startsWith('hi')) {
  currentLanguage = 'hi'
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
  } catch (error) {
    console.warn(`Translation missing for key: ${key}`)
    return defaultValue || key
  }
}

/**
 * Set language and persist to storage
 */
export const setLanguage = async (lang: 'en' | 'hi'): Promise<void> => {
  currentLanguage = lang
  // TODO: Persist to AsyncStorage
}

/**
 * Get current language
 */
export const getCurrentLanguage = (): 'en' | 'hi' => {
  return currentLanguage
}

export default {
  t,
  setLanguage,
  getCurrentLanguage,
}
