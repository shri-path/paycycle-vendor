/**
 * SubscriptionBanner — global owner banner (US-009).
 * Purpose: Displays a single highest-priority warning above the owner home content.
 *
 * Priority order:
 * 1. status ∈ {EXPIRED, CANCELLED, PAST_DUE} → critical action required
 * 2. expires in ≤ 7 days → expiry warning
 * 3. any utilizationPercentage[resource] >= 90% → usage warning
 *
 * Renders nothing when: no subscription loaded, no condition holds, or dismissed.
 * Dismissible per session (in-memory `useState` — OQ-4).
 * Pure presentational — fetching is the host's responsibility; pass `subscription`
 * and callbacks as props for clean testability.
 */

import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { daysUntil } from '../utils/usage'
import type { SubscriptionViewDto } from '../../../types/subscription'

export interface SubscriptionBannerProps {
  subscription: SubscriptionViewDto | null
  onDismiss: () => void
  onPress: () => void
}

interface BannerMessage {
  text: string
  cta: string
  variant: 'error' | 'warning'
}

function computeMessage(
  subscription: SubscriptionViewDto,
  t: (key: string, opts?: Record<string, unknown>) => string,
): BannerMessage | null {
  const { currentPlan, utilizationPercentage } = subscription
  const { status, nextBillingDate } = currentPlan

  // Priority 1: critical status
  if (status === 'EXPIRED') {
    return { text: t('subscription.banner_expired'), cta: t('subscription.banner_renew_cta'), variant: 'error' }
  }
  if (status === 'CANCELLED') {
    return {
      text: t('subscription.banner_cancelled', { date: nextBillingDate }),
      cta: t('subscription.banner_renew_cta'),
      variant: 'warning',
    }
  }
  if (status === 'PAST_DUE') {
    return { text: t('subscription.banner_expired'), cta: t('subscription.banner_renew_cta'), variant: 'error' }
  }

  // Priority 2: expiry within 7 days
  const days = daysUntil(nextBillingDate)
  if (days > 0 && days <= 7) {
    return {
      text: t('subscription.banner_expiring', { days: String(days) }),
      cta: t('subscription.banner_renew_cta'),
      variant: 'warning',
    }
  }

  // Priority 3: any usage >= 90%
  const resourceEntries: [string, number][] = [
    [t('subscription.customers'), utilizationPercentage.customers],
    [t('subscription.staff'), utilizationPercentage.staff],
    [t('subscription.supply_lists'), utilizationPercentage.supplyLists],
  ]
  for (const [label, pct] of resourceEntries) {
    if (pct >= 90) {
      return {
        text: t('subscription.banner_usage', {
          percent: String(pct),
          resource: label.toLowerCase(),
        }),
        cta: t('subscription.banner_upgrade_cta'),
        variant: 'warning',
      }
    }
  }

  return null
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: spacing[2],
    marginBottom: spacing[2],
  },
  bannerError: { backgroundColor: colors.errorBg },
  bannerWarning: { backgroundColor: colors.warningBg },
  textContainer: { flex: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dismissBtn: { padding: spacing[1] },
})

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  subscription,
  onDismiss,
  onPress,
}) => {
  const { t } = useTranslation()

  if (!subscription) return null

  const message = computeMessage(subscription, t as (key: string, opts?: Record<string, unknown>) => string)
  if (!message) return null

  const bgStyle = message.variant === 'error' ? styles.bannerError : styles.bannerWarning
  const textColor = message.variant === 'error' ? colors.error : colors.warning

  return (
    <View style={[styles.banner, bgStyle]}>
      <View style={styles.textContainer}>
        <AppText variant="caption" color={textColor}>
          {message.text}
        </AppText>
      </View>
      <View style={styles.actions}>
        <AppButton
          label={message.cta}
          onPress={onPress}
          variant="primary"
          size="sm"
          testID="banner-cta"
        />
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          accessibilityLabel={t('subscription.banner_dismiss')}
          testID="banner-dismiss"
        >
          <AppText variant="caption" color={colors.textSecondary}>
            {t('subscription.banner_dismiss')}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  )
}

SubscriptionBanner.displayName = 'SubscriptionBanner'

export default SubscriptionBanner
