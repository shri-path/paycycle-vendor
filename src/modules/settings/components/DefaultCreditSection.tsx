/**
 * DefaultCreditSection (US-011)
 * Purpose: Credit limit input + breach action radio group.
 *
 * The credit limit uses a numeric AppInput with "₹" prefix.
 * The breach action uses an AppRadioGroup with three options: warn/pause/block.
 */

import React, { useCallback } from 'react'
import { StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppInput } from '@components/primitives/AppInput'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { CreditBreachAction } from '../../../types/settings'

export interface DefaultCreditSectionProps {
  creditLimit: number
  creditAction: CreditBreachAction
  disabled?: boolean
  onCreditLimitChange: (value: number) => void
  onCreditActionChange: (action: CreditBreachAction) => void
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
})

export const DefaultCreditSection: React.FC<DefaultCreditSectionProps> = ({
  creditLimit,
  creditAction,
  disabled = false,
  onCreditLimitChange,
  onCreditActionChange,
}) => {
  const { t } = useTranslation()

  const handleLimitChange = useCallback(
    (text: string) => {
      const num = parseFloat(text)
      if (!isNaN(num) && num >= 0) {
        onCreditLimitChange(num)
      } else if (text === '') {
        onCreditLimitChange(0)
      }
    },
    [onCreditLimitChange],
  )

  const creditActionOptions = [
    {
      label: t('settings.credit_action_warn'),
      value: 'warn',
      description: t('settings.credit_action_warn_desc'),
    },
    {
      label: t('settings.credit_action_pause'),
      value: 'pause',
      description: t('settings.credit_action_pause_desc'),
    },
    {
      label: t('settings.credit_action_block'),
      value: 'block',
      description: t('settings.credit_action_block_desc'),
    },
  ]

  return (
    <AppCard style={styles.card} testID="default-credit-section">
      <AppText variant="label" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
        {t('settings.credit_section_title')}
      </AppText>

      <AppInput
        label={t('settings.credit_limit_label')}
        prefix="₹"
        keyboardType="numeric"
        value={String(creditLimit)}
        onChangeText={handleLimitChange}
        editable={!disabled}
        testID="credit-limit-input"
      />

      <AppRadioGroup
        label={t('settings.credit_action_label')}
        options={creditActionOptions}
        value={creditAction}
        onChange={(v) => onCreditActionChange(v as CreditBreachAction)}
        disabled={disabled}
      />
    </AppCard>
  )
}

export default DefaultCreditSection
