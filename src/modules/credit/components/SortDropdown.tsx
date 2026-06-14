/**
 * SortDropdown (US-012, T-08)
 * Priority list sort selector using AppSelect.
 */

import React, { useCallback } from 'react'
import { AppSelect } from '@components/primitives/AppSelect'
import { useTranslation } from '@hooks/useTranslation'
import type { PrioritySort } from '../../../types/credit'

export interface SortDropdownProps {
  value: PrioritySort
  onChange: (sort: PrioritySort) => void
  disabled?: boolean
}

const SORT_OPTIONS: { label: string; value: PrioritySort }[] = [
  { label: 'credit.sort_oldest_first', value: 'oldest_first' },
  { label: 'credit.sort_amount_desc', value: 'amount_desc' },
  { label: 'credit.sort_utilization_desc', value: 'utilization_desc' },
  { label: 'credit.sort_score_asc', value: 'score_asc' },
]

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange, disabled }) => {
  const { t } = useTranslation()

  const translatedOptions = SORT_OPTIONS.map((o) => ({ label: t(o.label), value: o.value }))

  const handleChange = useCallback(
    (val: string | number) => {
      onChange(String(val) as PrioritySort)
    },
    [onChange],
  )

  return (
    <AppSelect
      label={t('credit.sort_label')}
      options={translatedOptions}
      value={value}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}

SortDropdown.displayName = 'SortDropdown'
export default SortDropdown
