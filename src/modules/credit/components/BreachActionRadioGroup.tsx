/**
 * BreachActionRadioGroup (US-012, T-09)
 * Radio group for actionOnBreach: warn / pause / block.
 * Disabled and forced to 'warn' when creditType = 'unlimited'.
 */

import React from 'react'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { useTranslation } from '@hooks/useTranslation'
import type { ActionOnBreach, CreditType } from '../../../types/credit'

export interface BreachActionRadioGroupProps {
  value: ActionOnBreach
  onChange: (action: ActionOnBreach) => void
  creditType: CreditType
  disabled?: boolean
}

export const BreachActionRadioGroup: React.FC<BreachActionRadioGroupProps> = ({
  value,
  onChange,
  creditType,
  disabled,
}) => {
  const { t } = useTranslation()

  // Force 'warn' when unlimited — server rule mirrors this
  const isUnlimited = creditType === 'unlimited'
  const effectiveValue: ActionOnBreach = isUnlimited ? 'warn' : value

  const options = [
    { label: t('credit.breach_action_warn'), value: 'warn' },
    { label: t('credit.breach_action_pause'), value: 'pause' },
    { label: t('credit.breach_action_block'), value: 'block' },
  ]

  return (
    <AppRadioGroup
      label={t('credit.breach_action_label')}
      options={options}
      value={effectiveValue}
      onChange={(v) => {
        if (isUnlimited) return
        onChange(v as ActionOnBreach)
      }}
      disabled={disabled || isUnlimited}
    />
  )
}

BreachActionRadioGroup.displayName = 'BreachActionRadioGroup'
export default BreachActionRadioGroup
