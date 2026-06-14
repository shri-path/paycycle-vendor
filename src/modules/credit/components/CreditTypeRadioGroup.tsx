/**
 * CreditTypeRadioGroup (US-012, T-09)
 * Radio group for selecting credit type: Normal / Prepaid / Unlimited.
 */

import React from 'react'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { useTranslation } from '@hooks/useTranslation'
import type { CreditType } from '../../../types/credit'

export interface CreditTypeRadioGroupProps {
  value: CreditType
  onChange: (type: CreditType) => void
  disabled?: boolean
}

export const CreditTypeRadioGroup: React.FC<CreditTypeRadioGroupProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const { t } = useTranslation()

  const options = [
    { label: t('credit.credit_type_normal'), value: 'normal' },
    { label: t('credit.credit_type_prepaid'), value: 'prepaid' },
    { label: t('credit.credit_type_unlimited'), value: 'unlimited' },
  ]

  return (
    <AppRadioGroup
      label={t('credit.credit_type_label')}
      options={options}
      value={value}
      onChange={(v) => onChange(v as CreditType)}
      disabled={disabled}
    />
  )
}

CreditTypeRadioGroup.displayName = 'CreditTypeRadioGroup'
export default CreditTypeRadioGroup
