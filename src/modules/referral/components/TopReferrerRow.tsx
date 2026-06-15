/**
 * TopReferrerRow (US-014)
 * List row for a top referrer (TopReferrerDto — has customerId).
 * "Thank" → WhatsApp deeplink (no API call).
 * "Give Discount" → navigate to US-012 credit-settings screen.
 */

import React, { useCallback } from 'react'
import { View, Linking, Share, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { TopReferrerDto } from '../../../types/referral'

export interface TopReferrerRowProps {
  referrer: TopReferrerDto
  onGiveDiscount: (customerId: string) => void
  onThank?: (customerId: string) => void
  testID?: string
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  info: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing[2] },
  star: { marginRight: spacing[2] },
})

function Inner({ referrer, onGiveDiscount, onThank, testID }: TopReferrerRowProps) {
  const { t } = useTranslation()

  const handleThank = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onThank) { onThank(referrer.customerId); return }
    // Default: open WhatsApp with a thank-you message
    const msg = t('referral.customer.thank_message', { name: referrer.customerName })
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`
    const supported = await Linking.canOpenURL(url)
    if (supported) { await Linking.openURL(url) } else { await Share.share({ message: msg }) }
  }, [referrer, onThank, t])

  const handleGiveDiscount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onGiveDiscount(referrer.customerId)
  }, [referrer.customerId, onGiveDiscount])

  return (
    <View style={s.row} testID={testID ?? `top-referrer-row-${referrer.customerId}`}>
      <Ionicons name="star" size={componentSizes.icon.sm} color={colors.warning} style={s.star} />
      <View style={s.info}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary}>{referrer.customerName}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('referral.customer.referral_count', { count: referrer.referralCount })}
        </AppText>
      </View>
      <View style={s.actions}>
        <AppButton label={t('referral.customer.thank')} variant="outline" size="sm" onPress={() => void handleThank()} testID={`thank-btn-${referrer.customerId}`} />
        <AppButton label={t('referral.customer.give_discount')} variant="primary" size="sm" onPress={handleGiveDiscount} testID={`discount-btn-${referrer.customerId}`} />
      </View>
    </View>
  )
}

export const TopReferrerRow = React.memo(Inner)
TopReferrerRow.displayName = 'TopReferrerRow'
export default TopReferrerRow
