/**
 * MessageTemplatesScreen [S2] (US-013, T-18, wireframe 2.48)
 * Purpose: Owner-only screen to view, edit, and save message templates
 * per type (greeting/payment_reminder/delivery_update/collection_notice)
 * and per language.
 *
 * Business rules:
 * - Owner-only: useRequireOwner()
 * - Client-side placeholder validation before save
 * - Default fallback: getTemplateOrDefault() always provides a starting point
 * - Preview fetches server render; shows unresolved tokens
 * - On Save: server PUT; cache updated; haptics success
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
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useTemplateStore } from '../store/template.store'
import { useLanguageStore } from '../store/language.store'
import {
  TemplateTypeSelector,
  TemplateLanguageTabs,
  TemplateEditor,
  PlaceholderChips,
  TemplatePreviewCard,
} from '../components'
import { validatePlaceholders } from '../service/templatePlaceholders'
import type { TemplateEditorRef } from '../components'
import type { SupportedLanguage } from '@locales/index'
import type { TemplateType, LanguageCode } from '../../../types/voice'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing[16] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  activeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  previewButtonRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.background,
  },
})

function MessageTemplatesContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()
  const busy = useRef(false)

  const appLanguage = useLanguageStore((s) => s.appLanguage)

  const {
    isLoading,
    loadError,
    isMutating,
    mutationError,
    isPreviewing,
    previewError,
    preview,
    fetchTemplates,
    saveTemplate,
    previewTemplate,
    getTemplateOrDefault,
    clearErrors,
  } = useTemplateStore(
    useShallow((s) => ({
      isLoading: s.isLoading,
      loadError: s.loadError,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      isPreviewing: s.isPreviewing,
      previewError: s.previewError,
      preview: s.preview,
      fetchTemplates: s.fetchTemplates,
      saveTemplate: s.saveTemplate,
      previewTemplate: s.previewTemplate,
      getTemplateOrDefault: s.getTemplateOrDefault,
      clearErrors: s.clearErrors,
    })),
  )

  const [selectedType, setSelectedType] = useState<TemplateType>('payment_reminder')
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(appLanguage)
  const [editorValue, setEditorValue] = useState('')
  const editorRef = useRef<TemplateEditorRef>(null)
  const [clientErrors, setClientErrors] = useState<string[]>([])

  // Load template for current type + lang selection
  const loadTemplate = useCallback(
    (type: TemplateType, lang: SupportedLanguage) => {
      const tmpl = getTemplateOrDefault(type, lang as LanguageCode)
      const content = tmpl?.content ?? ''
      setEditorValue(content)
      setClientErrors([])
      clearErrors()
    },
    [getTemplateOrDefault, clearErrors],
  )

  // Fetch on mount
  useEffect(() => {
    void fetchTemplates()
    return () => clearErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload editor when type/lang changes (after initial fetch)
  useEffect(() => {
    loadTemplate(selectedType, selectedLang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedLang, isLoading])

  const handleTypeSelect = useCallback(
    (type: TemplateType) => {
      setSelectedType(type)
    },
    [],
  )

  const handleLangSelect = useCallback(
    (lang: SupportedLanguage) => {
      setSelectedLang(lang)
    },
    [],
  )

  const handleInsertToken = useCallback((token: string) => {
    editorRef.current?.insertToken(token)
  }, [])

  const handlePreview = useCallback(async () => {
    const content = editorRef.current?.getValue() ?? editorValue
    if (!content.trim()) return
    await previewTemplate({
      templateType: selectedType,
      languageCode: selectedLang as LanguageCode,
      content,
    })
  }, [editorValue, previewTemplate, selectedType, selectedLang])

  const handleSave = useCallback(async () => {
    if (busy.current || !isConnected) return
    const content = editorRef.current?.getValue() ?? editorValue
    if (!content.trim()) return

    // Client-side placeholder validation
    const invalid = validatePlaceholders(content, selectedType)
    if (invalid.length > 0) {
      setClientErrors(invalid)
      return
    }
    setClientErrors([])

    busy.current = true
    clearErrors()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await saveTemplate({
        templateType: selectedType,
        languageCode: selectedLang as LanguageCode,
        content,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      busy.current = false
    }
  }, [
    isConnected,
    editorValue,
    selectedType,
    selectedLang,
    clearErrors,
    saveTemplate,
  ])

  const writesDisabled = !isConnected || isMutating || isLoading

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('templates.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {loadError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(loadError)} onClose={clearErrors} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} onClose={clearErrors} />
        </View>
      ) : null}

      {clientErrors.length > 0 ? (
        <View style={styles.alertRow}>
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t('templates.invalid_tokens', {
              tokens: clientErrors.map((tk) => `{{${tk}}}`).join(', '),
            })}
            onClose={() => setClientErrors([])}
          />
        </View>
      ) : null}

      {/* Template Type Selector — horizontal scroll */}
      <TemplateTypeSelector
        selected={selectedType}
        onSelect={handleTypeSelect}
        testID="template-type-selector"
      />

      {/* Language Tabs — horizontal scroll */}
      <TemplateLanguageTabs
        selected={selectedLang}
        onSelect={handleLangSelect}
        testID="template-lang-tabs"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Placeholder Chips */}
        <PlaceholderChips
          templateType={selectedType}
          onInsert={handleInsertToken}
          invalidTokens={clientErrors}
          testID="placeholder-chips"
        />

        {/* Section label */}
        <View style={styles.sectionHeader}>
          <AppText variant="caption" weight="medium" color={colors.textSecondary}>
            {t('templates.editor_section_label')}
          </AppText>
        </View>

        {/* Template Editor — key forces remount when type or lang changes so
            initialValue is applied to a fresh useState (MINOR-4 fix) */}
        <TemplateEditor
          key={`${selectedType}:${selectedLang}`}
          ref={editorRef}
          templateType={selectedType}
          initialValue={editorValue}
          onChangeText={setEditorValue}
          testID="template-editor"
        />

        {/* Preview Button */}
        <View style={styles.previewButtonRow}>
          <AppButton
            label={isPreviewing ? t('templates.previewing') : t('templates.preview')}
            variant="outline"
            disabled={writesDisabled || isPreviewing || !editorValue.trim()}
            loading={isPreviewing}
            onPress={() => void handlePreview()}
            testID="preview-template-btn"
          />
        </View>

        {previewError ? (
          <View style={styles.alertRow}>
            <AppAlert type="error" title={t('common.error')} message={t(previewError)} onClose={clearErrors} />
          </View>
        ) : null}

        {/* Preview Card */}
        {preview ? (
          <TemplatePreviewCard preview={preview} testID="template-preview-card" />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('common.save')}
          variant="primary"
          disabled={writesDisabled || !editorValue.trim()}
          loading={isMutating}
          onPress={() => void handleSave()}
          testID="save-template-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function MessageTemplatesScreen() {
  return (
    <ScreenErrorBoundary>
      <MessageTemplatesContent />
    </ScreenErrorBoundary>
  )
}

MessageTemplatesScreen.displayName = 'MessageTemplatesScreen'
