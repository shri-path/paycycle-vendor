/**
 * AtLimitList (US-012, T-07)
 * Rows of customers at/near their credit limit. Tap → SetCreditSettingsScreen.
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet, FlatList } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { AtLimitCustomer } from '../../../types/credit'

export interface AtLimitListProps {
  customers: AtLimitCustomer[]
  onRowPress: (customerId: string) => void
  testID?: string
}

const ROW_HEIGHT = 52

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  lastRow: { borderBottomWidth: 0 },
  utilizationBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
})

function utilizationColor(pct: number): string {
  if (pct >= 100) return colors.error
  if (pct >= 90) return colors.warning
  return colors.primary
}

const AtLimitRow = React.memo<{
  customer: AtLimitCustomer
  isLast: boolean
  onPress: (id: string) => void
}>(({ customer, isLast, onPress }) => {
  const { t } = useTranslation()
  const badgeBg = utilizationColor(customer.utilizationPercentage)

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(customer.customerId)
  }, [customer.customerId, onPress])

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t('credit.at_limit_row_label', { name: customer.name, pct: customer.utilizationPercentage })}
      style={[styles.row, isLast && styles.lastRow]}
      testID={`at-limit-row-${customer.customerId}`}
    >
      <AppText variant="body" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
        {customer.name}
      </AppText>
      <View style={[styles.utilizationBadge, { backgroundColor: badgeBg + '22' }]}>
        <AppText variant="caption" weight="semibold" color={badgeBg}>
          {customer.utilizationPercentage}%
        </AppText>
      </View>
    </Pressable>
  )
})
AtLimitRow.displayName = 'AtLimitRow'

export const AtLimitList = React.memo<AtLimitListProps>(({ customers, onRowPress, testID }) => {
  const { t } = useTranslation()

  if (customers.length === 0) return null

  return (
    <AppCard style={styles.card} testID={testID ?? 'at-limit-list'}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
        {t('credit.at_limit_title', { count: customers.length })}
      </AppText>
      {customers.length <= 10 ? (
        customers.map((c, i) => (
          <AtLimitRow
            key={c.customerId}
            customer={c}
            isLast={i === customers.length - 1}
            onPress={onRowPress}
          />
        ))
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c.customerId}
          renderItem={({ item, index }) => (
            <AtLimitRow
              customer={item}
              isLast={index === customers.length - 1}
              onPress={onRowPress}
            />
          )}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          scrollEnabled={false}
        />
      )}
    </AppCard>
  )
})

AtLimitList.displayName = 'AtLimitList'
export default AtLimitList
