/**
 * ReferralMessagePreview (US-014)
 * Read-only preview of the WhatsApp message that will be sent to the referee.
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface ReferralMessagePreviewProps {
  message: string | null
  testID?: string
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3], backgroundColor: colors.gray50 },
  label: { marginBottom: spacing[2] },
  message: { lineHeight: 22 },
})

export const ReferralMessagePreview = React.memo<ReferralMessagePreviewProps>(({ message, testID }) => {
  const { t } = useTranslation()
  return (
    <AppCard style={styles.card} testID={testID ?? 'referral-message-preview'}>
      <AppText variant="caption" weight="semibold" color={colors.textSecondary} style={styles.label}>
        {t('referral.refer.message_preview_label')}
      </AppText>
      <AppText variant="body" color={colors.textPrimary} style={styles.message} testID="message-preview-text">
        {message ?? t('referral.refer.message_preview_placeholder')}
      </AppText>
    </AppCard>
  )
})

ReferralMessagePreview.displayName = 'ReferralMessagePreview'
export default ReferralMessagePreview
