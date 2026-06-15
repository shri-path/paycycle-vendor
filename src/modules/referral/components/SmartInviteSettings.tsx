/**
 * SmartInviteSettings (US-014)
 * Combined section: target selector + language selector for BulkInviteCustomersScreen.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { InviteTargetSelector } from './InviteTargetSelector'
import { InviteLanguageSelector } from './InviteLanguageSelector'
import { spacing } from '@constants/tokens'
import type { BulkInviteTargetType, InviteLanguage } from '../../../types/referral'

export interface SmartInviteSettingsProps {
  target: BulkInviteTargetType
  language: InviteLanguage
  onTargetChange: (t: BulkInviteTargetType) => void
  onLanguageChange: (l: InviteLanguage) => void
  testID?: string
}

const s = StyleSheet.create({ c: { marginBottom: spacing[2] } })

function Inner({ target, language, onTargetChange, onLanguageChange, testID }: SmartInviteSettingsProps) {
  return (
    <View style={s.c} testID={testID ?? 'smart-invite-settings'}>
      <InviteTargetSelector value={target} onChange={onTargetChange} />
      <InviteLanguageSelector value={language} onChange={onLanguageChange} />
    </View>
  )
}

export const SmartInviteSettings = React.memo(Inner)
SmartInviteSettings.displayName = 'SmartInviteSettings'
export default SmartInviteSettings
