/**
 * RankedAmountList (US-012, T-11)
 * Top payers / defaulters ranked rows — shared by both lists.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { RankedCustomer, Defaulter } from '../../../types/credit'

type RankedItem = RankedCustomer | Defaulter

export interface RankedAmountListProps {
  items: RankedItem[]
  titleKey: string
  amountColor?: string
  showDaysOverdue?: boolean
  testID?: string
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  nameWrap: { flex: 1 },
  right: { alignItems: 'flex-end' },
})

export const RankedAmountList = React.memo<RankedAmountListProps>(
  ({ items, titleKey, amountColor, showDaysOverdue, testID }) => {
    const { t } = useTranslation()
    const color = amountColor ?? colors.textPrimary

    return (
      <AppCard style={styles.card} testID={testID ?? 'ranked-amount-list'}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
          {t(titleKey)}
        </AppText>
        {items.map((item, index) => {
          const defaulter = 'daysOverdue' in item ? (item as Defaulter) : null
          return (
            <View key={item.customerId} style={styles.row}>
              <View style={styles.rankBadge}>
                <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.nameWrap}>
                <AppText variant="body" color={colors.textPrimary} numberOfLines={1}>
                  {item.customerName}
                </AppText>
                {showDaysOverdue && defaulter ? (
                  <AppText variant="caption" color={colors.error}>
                    {defaulter.daysOverdue > 365 ? '365+' : defaulter.daysOverdue}{' '}
                    {t('credit.days_overdue_short')}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.right}>
                <AppText variant="body" weight="semibold" color={color}>
                  {formatCurrency(item.amount)}
                </AppText>
              </View>
            </View>
          )
        })}
      </AppCard>
    )
  },
)

RankedAmountList.displayName = 'RankedAmountList'
export default RankedAmountList
