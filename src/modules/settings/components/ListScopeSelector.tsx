/**
 * ListScopeSelector (US-011)
 * Purpose: Radio group for "single list (pick one)" vs "all lists" scope
 * Used on S3 (bulk leave) and S4 (bulk rate adjust).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppSelect } from '@components/primitives/AppSelect'
import { useTranslation } from '@hooks/useTranslation'
import { spacing } from '@constants/tokens'

export interface SupplyListOption {
  label: string
  value: string
}

export interface ListScopeSelectorProps {
  allLists: boolean
  supplyListId: string | undefined
  supplyLists: SupplyListOption[]
  disabled?: boolean
  onScopeChange: (allLists: boolean) => void
  onListChange: (listId: string) => void
}

const styles = StyleSheet.create({
  listPicker: {
    marginTop: spacing[2],
  },
})

export const ListScopeSelector: React.FC<ListScopeSelectorProps> = ({
  allLists,
  supplyListId,
  supplyLists,
  disabled = false,
  onScopeChange,
  onListChange,
}) => {
  const { t } = useTranslation()

  const scopeOptions = [
    { label: t('settings.scope_all_lists'), value: 'all' },
    { label: t('settings.scope_single_list'), value: 'single' },
  ]

  const selectOptions = supplyLists.map((l) => ({ label: l.label, value: l.value }))

  return (
    <View testID="list-scope-selector">
      <AppRadioGroup
        label={t('settings.scope_label')}
        options={scopeOptions}
        value={allLists ? 'all' : 'single'}
        onChange={(v) => onScopeChange(v === 'all')}
        disabled={disabled}
        layout="horizontal"
      />

      {!allLists ? (
        <View style={styles.listPicker}>
          <AppSelect
            label={t('settings.scope_select_list')}
            options={selectOptions}
            value={supplyListId ?? ''}
            onChange={(v) => onListChange(String(v))}
            disabled={disabled}
          />
        </View>
      ) : null}
    </View>
  )
}

export default ListScopeSelector
