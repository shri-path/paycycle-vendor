/**
 * InviteTargetSelector (US-014)
 * Radio-group selector for bulk invite target type.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { BulkInviteTargetType } from '../../../types/referral'

export interface InviteTargetSelectorProps {
  value: BulkInviteTargetType
  onChange: (value: BulkInviteTargetType) => void
  testID?: string
}

const s = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  label: { marginBottom: spacing[2] },
})

const OPTIONS: { value: BulkInviteTargetType; labelKey: string }[] = [
  { value: 'all_not_on_paycycle', labelKey: 'referral.invite.target_all' },
  { value: 'specific', labelKey: 'referral.invite.target_specific' },
]

function Inner({ value, onChange, testID }: InviteTargetSelectorProps) {
  const { t } = useTranslation()
  return (
    <View style={s.container} testID={testID ?? 'invite-target-selector'}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.label}>
        {t('referral.invite.target_label')}
      </AppText>
      <AppRadioGroup
        options={OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        value={value}
        onChange={(v) => onChange(v as BulkInviteTargetType)}
      />
    </View>
  )
}

export const InviteTargetSelector = React.memo(Inner)
InviteTargetSelector.displayName = 'InviteTargetSelector'
export default InviteTargetSelector
