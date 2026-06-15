/**
 * ReferralCodeCard (US-014)
 * Shows the referral code returned from the last createVendorReferral call.
 * Copy uses Share.share (expo-clipboard not available).
 * Null-guarded: shows placeholder when code is not yet available.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet, Share } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface ReferralCodeCardProps {
  code: string | null
  referralLink: string | null
  testID?: string
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3], alignItems: 'center' },
  label: { marginBottom: spacing[2] },
  code: { letterSpacing: 4, marginBottom: spacing[3] },
  placeholder: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', gap: spacing[2] },
})

export const ReferralCodeCard = React.memo<ReferralCodeCardProps>(({ code, referralLink, testID }) => {
  const { t } = useTranslation()

  const handleCopy = useCallback(async () => {
    if (!code) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await Share.share({ message: code })
  }, [code])

  const handleShare = useCallback(async () => {
    if (!referralLink) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await Share.share({ message: referralLink })
  }, [referralLink])

  return (
    <AppCard style={styles.card} testID={testID ?? 'referral-code-card'}>
      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {t('referral.refer.your_code')}
      </AppText>

      {code ? (
        <AppText variant="h2" weight="bold" color={colors.primary} style={styles.code} testID="referral-code-value">
          {code}
        </AppText>
      ) : (
        <AppText variant="body" color={colors.gray400} style={styles.placeholder} testID="referral-code-placeholder">
          {t('referral.refer.code_placeholder')}
        </AppText>
      )}

      <View style={styles.row}>
        <AppButton
          label={t('referral.refer.copy_code')}
          variant="outline"
          size="sm"
          onPress={() => void handleCopy()}
          disabled={!code}
          testID="copy-code-btn"
        />
        <AppButton
          label={t('referral.refer.share_link')}
          variant="primary"
          size="sm"
          onPress={() => void handleShare()}
          disabled={!referralLink}
          testID="share-link-btn"
        />
      </View>
    </AppCard>
  )
})

ReferralCodeCard.displayName = 'ReferralCodeCard'
export default ReferralCodeCard
