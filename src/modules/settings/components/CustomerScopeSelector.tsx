/**
 * CustomerScopeSelector (US-011)
 * Purpose: Radio for "all customers in list" vs "specific customer IDs" + multi-select.
 * Used on S3 (bulk leave) and S5 (bulk reminders).
 *
 * When scope = specific, renders a flat list of customer checkboxes.
 */

import React from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface CustomerOption {
  id: string
  name: string
}

export interface CustomerScopeSelectorProps {
  allCustomers: boolean
  selectedIds: string[]
  customers: CustomerOption[]
  isCustomersLoading?: boolean
  disabled?: boolean
  onScopeChange: (allCustomers: boolean) => void
  onSelectionsChange: (ids: string[]) => void
}

const styles = StyleSheet.create({
  customerList: {
    marginTop: spacing[2],
    maxHeight: 240,
  },
  customerItem: {
    paddingVertical: spacing[1],
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing[2],
  },
})

export const CustomerScopeSelector: React.FC<CustomerScopeSelectorProps> = ({
  allCustomers,
  selectedIds,
  customers,
  isCustomersLoading = false,
  disabled = false,
  onScopeChange,
  onSelectionsChange,
}) => {
  const { t } = useTranslation()

  const scopeOptions = [
    { label: t('settings.customer_scope_all'), value: 'all' },
    { label: t('settings.customer_scope_specific'), value: 'specific' },
  ]

  const toggleCustomer = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    onSelectionsChange(next)
  }

  return (
    <View testID="customer-scope-selector">
      <AppRadioGroup
        label={t('settings.customer_scope_label')}
        options={scopeOptions}
        value={allCustomers ? 'all' : 'specific'}
        onChange={(v) => onScopeChange(v === 'all')}
        disabled={disabled}
        layout="horizontal"
      />

      {!allCustomers ? (
        <View style={styles.customerList}>
          {isCustomersLoading ? (
            <AppText variant="caption" style={styles.loadingText}>
              {t('common.loading')}
            </AppText>
          ) : customers.length === 0 ? (
            <AppText variant="caption" style={styles.loadingText}>
              {t('settings.customer_scope_empty')}
            </AppText>
          ) : (
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.customerItem}>
                  <AppCheckbox
                    label={item.name}
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleCustomer(item.id)}
                    disabled={disabled}
                  />
                </View>
              )}
            />
          )}
        </View>
      ) : null}
    </View>
  )
}

export default CustomerScopeSelector
