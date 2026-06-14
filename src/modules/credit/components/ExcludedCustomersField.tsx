/**
 * ExcludedCustomersField (US-012, T-10)
 * List + add/remove exclusions for the reminder config.
 * Simple add-by-ID approach (no full customer picker in this iteration).
 */

import React, { useState, useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { AppInput } from '@components/primitives/AppInput'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'

export interface ExcludedCustomersFieldProps {
  excludedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  inputRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-end' },
  inputWrap: { flex: 1 },
  excludedList: { marginTop: spacing[2], gap: spacing[1] },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    minHeight: 44,
  },
  removeBtn: { padding: spacing[1] },
})

export const ExcludedCustomersField: React.FC<ExcludedCustomersFieldProps> = ({
  excludedIds,
  onChange,
  disabled,
}) => {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || excludedIds.includes(trimmed)) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onChange([...excludedIds, trimmed])
    setInputValue('')
  }, [inputValue, excludedIds, onChange])

  const handleRemove = useCallback(
    (id: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onChange(excludedIds.filter((eid) => eid !== id))
    },
    [excludedIds, onChange],
  )

  return (
    <View style={styles.container}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={{ marginBottom: spacing[2] }}>
        {t('credit.excluded_customers_label')}
      </AppText>
      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <AppInput
            label={t('credit.add_excluded_customer')}
            placeholder={t('credit.excluded_customer_placeholder')}
            value={inputValue}
            onChangeText={setInputValue}
            editable={!disabled}
            testID="excluded-customer-input"
          />
        </View>
        <AppButton
          label={t('common.add')}
          variant="secondary"
          onPress={handleAdd}
          disabled={disabled || !inputValue.trim()}
          testID="add-excluded-btn"
        />
      </View>
      {excludedIds.length > 0 ? (
        <View style={styles.excludedList}>
          {excludedIds.map((id) => (
            <View key={id} style={styles.idRow}>
              <AppText variant="body" color={colors.textPrimary}>
                {id}
              </AppText>
              {!disabled ? (
                <Pressable
                  onPress={() => handleRemove(id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('credit.remove_excluded_customer', { id })}
                  style={styles.removeBtn}
                  testID={`remove-excluded-${id}`}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="caption" color={colors.textSecondary}>
          {t('credit.no_excluded_customers')}
        </AppText>
      )}
    </View>
  )
}

ExcludedCustomersField.displayName = 'ExcludedCustomersField'
export default ExcludedCustomersField
