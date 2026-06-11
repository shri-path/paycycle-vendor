/**
 * SupplyListCard — supply-lists module domain component (US-005).
 * Purpose: One supply-list row for the Owner Lists screen and the Staff My-Lists screen.
 * Shows type icon, name, start time, frequency badge, default qty@rate, assigned staff,
 * customer count, and today's progress (bar + text; "no data yet" while US-006 stubs
 * zero stats).
 *
 * Presentational + memoized (smooth scroll on 2 GB devices). No store/API access.
 * Tokens only; every string via t(); color is never the only signal (frequency uses a
 * labelled badge; progress pairs the bar with "45/52" text).
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, interaction } from '@constants/tokens'
import type { SupplyFrequency, SupplyListListDto } from '../../../types/supplyLists'
import { SupplyTypeIcon } from './SupplyTypeIcon'

export interface SupplyListCardProps {
  /** List row to render. */
  list: SupplyListListDto
  /** Called with the listId when the card is tapped. */
  onPress: (listId: string) => void
  /** Show today's progress bar. Default true; pass false to hide stub-zero bars. */
  showProgress?: boolean
  /** Test ID. */
  testID?: string
}

/** Frequency → i18n label key (color is never the only signal — the badge is labelled). */
const FREQUENCY_LABEL: Record<SupplyFrequency, string> = {
  DAILY: 'supply.freq_daily',
  WEEKLY: 'supply.freq_weekly',
  MONTHLY: 'supply.freq_monthly',
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[2],
    minHeight: interaction.minTouchTarget + spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  name: {
    flexShrink: 1,
  },
  progress: {
    marginTop: spacing[1],
    marginBottom: spacing[0],
  },
})

const SupplyListCardComponent: React.FC<SupplyListCardProps> = ({
  list,
  onPress,
  showProgress = true,
  testID,
}) => {
  const { t } = useTranslation()

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(list.id)
  }, [onPress, list.id])

  const { delivered, pending } = list.todayStats
  // Stub-zero detection: the US-006 stub zeroes every today field. When nothing has
  // been recorded we show a muted "no data yet" caption instead of a misleading 0/N.
  const hasTodayData = delivered > 0 || pending > 0
  const total = list.customerCount

  // Default "qty unit @ ₹rate/unit" — only when both default values are present.
  const hasDefaults = list.defaultQuantity != null && list.defaultRatePerUnit != null
  const defaultLabel = hasDefaults
    ? t('supply.default_label', {
        qty: String(list.defaultQuantity),
        unit: list.unit,
        rate: String(list.defaultRatePerUnit),
      })
    : null

  // Assigned staff names, comma-joined, or "Unassigned".
  const staffNames = list.assignedStaff
    .map((s) => s.staffName)
    .filter((n): n is string => !!n)
  const staffLabel =
    staffNames.length > 0
      ? t('supply.staff_label', { names: staffNames.join(', ') })
      : t('supply.unassigned')

  const progressText = hasTodayData
    ? t('supply.today_progress', { done: String(delivered), total: String(total) })
    : t('supply.no_delivery_data_yet')

  const a11yLabel = t('supply.card_a11y', {
    name: list.name,
    count: String(total),
    status: hasTodayData
      ? t('supply.today_progress', { done: String(delivered), total: String(total) })
      : t('supply.today_not_started'),
  })

  return (
    <AppCard
      variant="elevated"
      onPress={handlePress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      testID={testID}
    >
      <View style={styles.row}>
        <SupplyTypeIcon supplyType={list.supplyType} />
        <View style={styles.body}>
          <View style={styles.topLine}>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
              {list.name}
            </AppText>
            <AppBadge label={t(FREQUENCY_LABEL[list.frequency])} variant="primary" size="sm" />
          </View>

          {list.startTime ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {list.startTime}
            </AppText>
          ) : null}

          {defaultLabel ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {defaultLabel}
            </AppText>
          ) : null}

          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {staffLabel}
          </AppText>

          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {t('supply.customers_count', { count: String(total) })}
          </AppText>

          {showProgress ? (
            <View style={styles.progress}>
              <AppProgressBar
                value={hasTodayData ? delivered : 0}
                max={total > 0 ? total : 1}
                animated={false}
                label={
                  <AppText variant="caption" color={colors.textSecondary}>
                    {progressText}
                  </AppText>
                }
              />
            </View>
          ) : null}
        </View>
      </View>
    </AppCard>
  )
}

SupplyListCardComponent.displayName = 'SupplyListCard'

export const SupplyListCard = React.memo(SupplyListCardComponent)

export default SupplyListCard
