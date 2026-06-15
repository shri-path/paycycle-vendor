import React, { useCallback } from 'react'
import { Linking, Share, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { spacing } from '@constants/tokens'

export interface ShareViaWhatsAppButtonProps {
  phone: string
  message: string
  disabled?: boolean
  testID?: string
}

const styles = StyleSheet.create({ btn: { marginBottom: spacing[2] } })

export const ShareViaWhatsAppButton = React.memo<ShareViaWhatsAppButtonProps>(
  ({ phone, message, disabled, testID }) => {
    const { t } = useTranslation()
    const handlePress = useCallback(async () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
      const supported = await Linking.canOpenURL(url)
      if (supported) { await Linking.openURL(url) } else { await Share.share({ message }) }
    }, [phone, message])
    return (
      <AppButton
        label={t('referral.refer.send_via_whatsapp')}
        variant="primary"
        onPress={() => void handlePress()}
        disabled={disabled}
        style={styles.btn}
        testID={testID ?? 'whatsapp-share-btn'}
      />
    )
  },
)

ShareViaWhatsAppButton.displayName = 'ShareViaWhatsAppButton'
export default ShareViaWhatsAppButton
