/**
 * InviteLanguageSelector (US-014)
 * Dropdown to select the language for bulk invite messages.
 * Only 3 values: 'hi' | 'en' | 'customer-pref'
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { InviteLanguage } from '../../../types/referral'

export interface InviteLanguageSelectorProps {
  value: InviteLanguage
  onChange: (value: InviteLanguage) => void
  testID?: string
}

const s = StyleSheet.create({
  c: { marginBottom: spacing[3] },
  label: { marginBottom: spacing[2] },
})

const OPTS: { value: InviteLanguage; label: string }[] = [
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'en', label: 'English' },
  { value: 'customer-pref', label: 'Customer language' },
]

function Inner({ value, onChange, testID }: InviteLanguageSelectorProps) {
  const { t } = useTranslation()
  return (
    <View style={s.c} testID={testID ?? 'invite-language-selector'}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.label}>
        {t('referral.invite.language_label')}
      </AppText>
      <AppSelect options={OPTS} value={value} onChange={(v) => onChange(v as InviteLanguage)} placeholder={t('referral.invite.language_placeholder')} />
    </View>
  )
}

export const InviteLanguageSelector = React.memo(Inner)
InviteLanguageSelector.displayName = 'InviteLanguageSelector'
export default InviteLanguageSelector
