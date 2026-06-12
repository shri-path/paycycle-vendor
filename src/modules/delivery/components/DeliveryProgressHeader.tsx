/**
 * DeliveryProgressHeader — composite. Purpose: progress bar + delivered/onLeave/
 * pending chip row for a supply list's deliveries. Presentational only; the
 * caller passes already-computed counts. Status is conveyed by icon + text (never
 * colour alone). Usage:
 *   <DeliveryProgressHeader total={20} delivered={12} onLeave={2} pending={6} />
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'

export interface DeliveryProgressHeaderProps {
  /** Total deliveries for the list today. */
  total: number
  /** Count marked delivered. */
  delivered: number
  /** Count marked on leave. */
  onLeave: number
  /** Count still pending. */
  pending: number
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginTop: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
})

const DeliveryProgressHeaderComponent: React.FC<DeliveryProgressHeaderProps> = ({
  total,
  delivered,
  onLeave,
  pending,
  testID,
}) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container} testID={testID}>
      <AppProgressBar
        value={delivered}
        max={total > 0 ? total : 1}
        variant="success"
        label={t('delivery.progress', { done: delivered, total })}
      />
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Ionicons
            name="checkmark-circle"
            size={componentSizes.icon.sm}
            color={colors.success}
            importantForAccessibility="no"
          />
          <AppText variant="caption" color={colors.textSecondary}>
            {t('delivery.delivered_count_label', { value: delivered })}
          </AppText>
        </View>
        <View style={styles.chip}>
          <Ionicons
            name="remove-circle"
            size={componentSizes.icon.sm}
            color={colors.warning}
            importantForAccessibility="no"
          />
          <AppText variant="caption" color={colors.textSecondary}>
            {t('delivery.leaves_count_label', { value: onLeave })}
          </AppText>
        </View>
        <View style={styles.chip}>
          <Ionicons
            name="ellipse-outline"
            size={componentSizes.icon.sm}
            color={colors.textSecondary}
            importantForAccessibility="no"
          />
          <AppText variant="caption" color={colors.textSecondary}>
            {t('delivery.pending_count_label', { value: pending })}
          </AppText>
        </View>
      </View>
    </View>
  )
}

export const DeliveryProgressHeader = React.memo(DeliveryProgressHeaderComponent)
DeliveryProgressHeader.displayName = 'DeliveryProgressHeader'

export default DeliveryProgressHeader
