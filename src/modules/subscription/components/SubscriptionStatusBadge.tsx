/**
 * SubscriptionStatusBadge — subscription module primitive (US-009).
 * Purpose: Coloured pill indicating subscription lifecycle status.
 * Supports an optional `activeUntil` sublabel for the CANCELLED variant
 * (subscription remains usable until `nextBillingDate`).
 * Presentational — receives `status` via props; no store/API access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppBadge } from '@components/primitives/AppBadge'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { formatLocaleDate } from '@utils/formatDate'
import { colors, spacing } from '@constants/tokens'
import type { BadgeVariant } from '@components/primitives/AppBadge'
import type { SubscriptionStatus } from '../../../types/subscription'

export interface SubscriptionStatusBadgeProps {
  /** Lifecycle status to display. */
  status: SubscriptionStatus
  /** ISO date for "Active until …" sublabel shown when status === CANCELLED. */
  activeUntil?: string | null
}

const STATUS_CONFIG: Record<SubscriptionStatus, { variant: BadgeVariant; key: string }> = {
  TRIAL:    { variant: 'primary', key: 'subscription.status_trial' },
  ACTIVE:   { variant: 'success', key: 'subscription.status_active' },
  PAST_DUE: { variant: 'warning', key: 'subscription.status_past_due' },
  CANCELLED:{ variant: 'warning', key: 'subscription.status_cancelled' },
  EXPIRED:  { variant: 'error',   key: 'subscription.status_expired' },
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  sublabel: { marginTop: spacing[1] },
})

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  status,
  activeUntil,
}) => {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]

  return (
    <View style={styles.container}>
      <AppBadge label={t(config.key)} variant={config.variant} size="sm" />
      {status === 'CANCELLED' && activeUntil ? (
        <AppText
          variant="caption"
          color={colors.textSecondary}
          style={styles.sublabel}
          accessibilityLabel={t('subscription.active_until', { date: formatLocaleDate(activeUntil) })}
        >
          {t('subscription.active_until', { date: formatLocaleDate(activeUntil) })}
        </AppText>
      ) : null}
    </View>
  )
}

SubscriptionStatusBadge.displayName = 'SubscriptionStatusBadge'

export default SubscriptionStatusBadge
