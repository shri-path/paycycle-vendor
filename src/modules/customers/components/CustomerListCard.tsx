/**
 * CustomerListCard — customer module composite (US-008).
 * Purpose: One customer row in the All Customers list. Shows avatar initial, name,
 * phone, joined supply-list names, and optionally monthly total + payment-status badge
 * when their values are non-null (staff null-safety — server nulls financial fields).
 * Memoized for smooth scrolling on low-end devices.
 *
 * Presentational — receives `customer` + `onPress`; no store/API access.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, interaction } from '@constants/tokens'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import type { CustomerListItemDto } from '../../../types/customer'

export interface CustomerListCardProps {
  /** Customer row data. */
  customer: CustomerListItemDto
  /** Called with the customerId when the card is tapped. */
  onPress: (customerId: string) => void
  /** Test ID. */
  testID?: string
}

/** Two-letter initials from a customer name. Always returns at least one character. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return ((first + second) || '?').toUpperCase()
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[2],
    minHeight: interaction.minTouchTarget + spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  body: {
    flex: 1,
    gap: spacing[1],
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
})

const CustomerListCardComponent: React.FC<CustomerListCardProps> = ({
  customer,
  onPress,
  testID,
}) => {
  const { t } = useTranslation()

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(customer.id)
  }, [onPress, customer.id])

  const listNames =
    customer.supplyLists.length > 0 ? customer.supplyLists.join(', ') : null

  return (
    <AppCard
      variant="elevated"
      onPress={handlePress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={customer.name}
      testID={testID}
    >
      <View style={styles.row}>
        <AppAvatar initials={initialsOf(customer.name)} size="md" />
        <View style={styles.body}>
          <View style={styles.topLine}>
            <AppText variant="body" weight="semibold" numberOfLines={1}>
              {customer.name}
            </AppText>
            {customer.paymentStatus !== null ? (
              <PaymentStatusBadge status={customer.paymentStatus} />
            ) : null}
          </View>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {customer.phoneNumber}
          </AppText>
          {listNames !== null ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {listNames}
            </AppText>
          ) : null}
          {customer.monthlyTotal !== null ? (
            <View style={styles.bottomLine}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t('customer.this_month')}:{' '}
                <AppText variant="caption" weight="semibold" color={colors.textPrimary}>
                  {formatCurrency(customer.monthlyTotal)}
                </AppText>
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </AppCard>
  )
}

CustomerListCardComponent.displayName = 'CustomerListCard'

export const CustomerListCard = React.memo(CustomerListCardComponent)

export default CustomerListCard
