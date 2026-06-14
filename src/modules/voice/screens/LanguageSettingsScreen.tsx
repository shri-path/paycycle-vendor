/**
 * LanguageSettingsScreen [S1] (US-013, T-17, wireframe 2.47)
 * Purpose: Allows users to select app language, toggle voice/transliteration,
 * and set bill-language default. Available to both owner and staff.
 *
 * Business rules:
 * - appLanguage='en' → force transliterationEnabled=false, disable toggle
 * - secondaryLanguage must ≠ appLanguage (validated before save)
 * - fetchPreferences on mount; form is populated from server data
 * - Server wins on next login; local state is ephemeral until Save
 * - On Save: call updatePreferences with full patch; apply setAppLanguage
 *
 * 5 states: loading, offline, error, mutating, success.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppText } from '@components/primitives/AppText'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useLanguageStore } from '../store/language.store'
import {
  LanguageRadioList,
  PreferenceToggleCard,
  BillLanguageRadioGroup,
} from '../components'
import type { SupportedLanguage } from '@locales/index'
import type { BillLanguageDefault } from '../../../types/voice'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing[16] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
    backgroundColor: colors.background,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginHorizontal: spacing[4],
    marginVertical: spacing[1],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.background,
  },
  secondaryError: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[1],
  },
})

function LanguageSettingsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const busy = useRef(false)

  const {
    appLanguage,
    preferences,
    isPreferencesLoading,
    preferencesError,
    isMutating,
    mutationError,
    fetchPreferences,
    updatePreferences,
    setAppLanguage,
    clearErrors,
  } = useLanguageStore(
    useShallow((s) => ({
      appLanguage: s.appLanguage,
      preferences: s.preferences,
      isPreferencesLoading: s.isPreferencesLoading,
      preferencesError: s.preferencesError,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      fetchPreferences: s.fetchPreferences,
      updatePreferences: s.updatePreferences,
      setAppLanguage: s.setAppLanguage,
      clearErrors: s.clearErrors,
    })),
  )

  // Local form state — initialised from preferences once loaded
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(appLanguage)
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false)
  const [voiceResponsesEnabled, setVoiceResponseEnabled] = useState(false)
  const [transliterationEnabled, setTransliterationEnabled] = useState(false)
  const [billLanguageDefault, setBillLanguageDefault] = useState<BillLanguageDefault>('customer')
  const [secondaryLanguage, setSecondaryLanguage] = useState<SupportedLanguage | null>(null)
  const [secondaryError, setSecondaryError] = useState<string | null>(null)

  // Populate form from server preferences
  useEffect(() => {
    if (preferences) {
      setSelectedLang((preferences.appLanguage as SupportedLanguage) ?? appLanguage)
      setVoiceCommandsEnabled(preferences.voiceCommandsEnabled ?? false)
      setVoiceResponseEnabled(preferences.voiceResponsesEnabled ?? false)
      setTransliterationEnabled(preferences.transliterationEnabled ?? false)
      setBillLanguageDefault(preferences.billLanguageDefault ?? 'customer')
      setSecondaryLanguage((preferences.secondaryLanguage as SupportedLanguage | null) ?? null)
    }
  }, [preferences, appLanguage])

  // Business rule: English disables transliteration
  const isEnglish = selectedLang === 'en'
  const effectiveTransliteration = isEnglish ? false : transliterationEnabled

  const handleLangSelect = useCallback((lang: SupportedLanguage) => {
    setSelectedLang(lang)
    if (lang === 'en') setTransliterationEnabled(false)
    // Clear secondary error when user changes language
    setSecondaryError(null)
  }, [])

  // Fetch on mount
  useEffect(() => {
    void fetchPreferences()
    return () => clearErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validate = useCallback((): boolean => {
    if (secondaryLanguage && secondaryLanguage === selectedLang) {
      setSecondaryError(t('language.error_secondary_same_as_app'))
      return false
    }
    setSecondaryError(null)
    return true
  }, [secondaryLanguage, selectedLang, t])

  const handleSave = useCallback(async () => {
    if (busy.current || !isConnected) return
    if (!validate()) return
    busy.current = true
    clearErrors()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await updatePreferences({
        appLanguage: selectedLang,
        voiceCommandsEnabled,
        voiceResponsesEnabled,
        transliterationEnabled: effectiveTransliteration,
        billLanguageDefault,
        secondaryLanguage: secondaryLanguage,
      })
      // Apply new language to locales layer
      await setAppLanguage(selectedLang)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      busy.current = false
    }
  }, [
    isConnected,
    validate,
    clearErrors,
    updatePreferences,
    selectedLang,
    voiceCommandsEnabled,
    voiceResponsesEnabled,
    effectiveTransliteration,
    billLanguageDefault,
    secondaryLanguage,
    setAppLanguage,
    router,
  ])

  const writesDisabled = !isConnected || isMutating || isPreferencesLoading

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('language.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {preferencesError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(preferencesError)} onClose={clearErrors} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section: App Language */}
        <View style={styles.sectionHeader}>
          <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
            {t('language.section_app_language').toUpperCase()}
          </AppText>
        </View>
        <LanguageRadioList
          selected={selectedLang}
          onSelect={handleLangSelect}
          testID="app-lang-list"
        />

        <View style={styles.divider} />

        {/* Section: Voice & Input Preferences */}
        <View style={styles.sectionHeader}>
          <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
            {t('language.section_voice_preferences').toUpperCase()}
          </AppText>
        </View>

        <PreferenceToggleCard
          label={t('language.voice_commands_label')}
          description={t('language.voice_commands_desc')}
          value={voiceCommandsEnabled}
          onValueChange={setVoiceCommandsEnabled}
          disabled={writesDisabled}
          testID="toggle-voice-commands"
        />
        <PreferenceToggleCard
          label={t('language.voice_response_label')}
          description={t('language.voice_response_desc')}
          value={voiceResponsesEnabled}
          onValueChange={setVoiceResponseEnabled}
          disabled={writesDisabled}
          testID="toggle-voice-response"
        />
        <PreferenceToggleCard
          label={t('language.transliteration_label')}
          description={
            isEnglish
              ? t('language.transliteration_disabled_english')
              : t('language.transliteration_desc')
          }
          value={effectiveTransliteration}
          onValueChange={(v) => {
            if (!isEnglish) setTransliterationEnabled(v)
          }}
          disabled={writesDisabled || isEnglish}
          testID="toggle-transliteration"
        />

        <View style={styles.divider} />

        {/* Section: Bill Language */}
        <View style={styles.sectionHeader}>
          <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
            {t('language.section_bill_language').toUpperCase()}
          </AppText>
        </View>
        <BillLanguageRadioGroup
          selected={billLanguageDefault}
          onSelect={setBillLanguageDefault}
          currentAppLanguage={selectedLang}
          testID="bill-lang-group"
        />

        {/* Secondary language selector */}
        <View style={styles.sectionHeader}>
          <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
            {t('language.section_secondary_language').toUpperCase()}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing[1] }}>
            {t('language.secondary_language_desc')}
          </AppText>
        </View>
        <LanguageRadioList
          selected={secondaryLanguage ?? selectedLang}
          onSelect={(lang) => {
            setSecondaryLanguage(lang === selectedLang ? null : lang)
            setSecondaryError(null)
          }}
          testID="secondary-lang-list"
        />
        {secondaryError ? (
          <View style={styles.secondaryError}>
            <AppText variant="caption" color={colors.error}>
              {secondaryError}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('common.save')}
          variant="primary"
          disabled={writesDisabled}
          loading={isMutating}
          onPress={() => void handleSave()}
          testID="save-language-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function LanguageSettingsScreen() {
  return (
    <ScreenErrorBoundary>
      <LanguageSettingsContent />
    </ScreenErrorBoundary>
  )
}

LanguageSettingsScreen.displayName = 'LanguageSettingsScreen'
