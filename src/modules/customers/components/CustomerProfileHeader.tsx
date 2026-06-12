/**
 * CustomerProfileHeader — customer module composite (US-008).
 * Purpose: Displays customer profile information — avatar, name, phone, address,
 * customer-since date, and preferred language. Visible to both owner and staff.
 *
 * Presentational — receives `customer` via props; no store/API access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { CustomerDetailDto } from '../../../types/customer'

export interface CustomerProfileHeaderProps {
  /** Full customer detail. */
  customer: CustomerDetailDto
  /** Test ID. */
  testID?: string
}

/** Two-letter initials from a customer name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return ((first + second) || '?').toUpperCase()
}

/** Format a YYYY-MM-DD date to a human-readable string using the device locale. */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  infoBlock: {
    alignItems: 'center',
    gap: spacing[1],
  },
  metaRow: {
    gap: spacing[2],
    alignItems: 'center',
  },
})

export const CustomerProfileHeader: React.FC<CustomerProfileHeaderProps> = ({
  customer,
  testID,
}) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container} testID={testID}>
      <AppAvatar initials={initialsOf(customer.name)} size="lg" />
      <View style={styles.infoBlock}>
        <AppText variant="h3" weight="bold" align="center">
          {customer.name}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} align="center">
          {customer.phoneNumber}
        </AppText>
      </View>
      <View style={styles.metaRow}>
        {customer.address !== null ? (
          <AppText variant="caption" color={colors.textSecondary} align="center">
            {customer.address}
          </AppText>
        ) : null}
        <AppText variant="caption" color={colors.textSecondary} align="center">
          {t('customer.customer_since', { date: formatDate(customer.customerSince) })}
        </AppText>
        {customer.language !== null ? (
          <AppText variant="caption" color={colors.textSecondary} align="center">
            {t('customer.language')}: {customer.language}
          </AppText>
        ) : null}
      </View>
    </View>
  )
}

CustomerProfileHeader.displayName = 'CustomerProfileHeader'

export default CustomerProfileHeader
