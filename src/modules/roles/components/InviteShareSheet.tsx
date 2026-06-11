/**
 * InviteShareSheet — shared invite-link share UI (US-004).
 * Purpose: Presentational bottom sheet that surfaces a fresh invite URL with
 * WhatsApp / SMS / generic share buttons (+ optional "Link expires {date}" caption).
 *
 * Extracted from InviteStaffScreen so both the Invite flow and the StaffDetail
 * Resend flow reuse one implementation (DRY). No store access — the parent owns the
 * invite URL/expiry and dismiss; this component only renders + shares.
 *
 * Security: shares only the invite URL (no PII). Online-only callers gate the action.
 */

import React, { useCallback } from 'react'
import { Share, Linking, View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppBottomSheet } from '@components/composite/AppBottomSheet'
import { useTranslation } from '@hooks/useTranslation'
import { formatLocaleDate } from '@utils/formatDate'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { InviteSendVia } from '../../../types/roles'

const styles = StyleSheet.create({
  url: {
    backgroundColor: colors.gray50,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginVertical: spacing[3],
  },
  expires: { marginBottom: spacing[2] },
  buttons: { gap: spacing[2] },
})

export interface InviteShareSheetProps {
  visible: boolean
  inviteUrl: string | null
  expiresAt?: string | null
  onDismiss: () => void
  title?: string
  testID?: string
}

export function InviteShareSheet({
  visible,
  inviteUrl,
  expiresAt,
  onDismiss,
  title,
  testID,
}: InviteShareSheetProps) {
  const { t } = useTranslation()

  const handleShare = useCallback(async () => {
    if (!inviteUrl) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await Share.share({ message: inviteUrl })
    } catch {
      // user dismissed the share sheet — no-op
    }
  }, [inviteUrl])

  const handleShareVia = useCallback(
    async (via: InviteSendVia) => {
      if (!inviteUrl) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const text = encodeURIComponent(inviteUrl)
      const url = via === 'whatsapp' ? `whatsapp://send?text=${text}` : `sms:?body=${text}`
      try {
        await Linking.openURL(url)
      } catch {
        await Share.share({ message: inviteUrl })
      }
    },
    [inviteUrl],
  )

  return (
    <AppBottomSheet
      visible={visible && inviteUrl !== null}
      onDismiss={onDismiss}
      title={title ?? t('roles.invite_created_title')}
    >
      {inviteUrl ? (
        <View testID={testID}>
          <View style={styles.url}>
            <AppText variant="caption" color={colors.textSecondary} testID="invite-url">
              {inviteUrl}
            </AppText>
          </View>
          {expiresAt ? (
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={styles.expires}
              testID="invite-expires"
            >
              {t('roles.invite_expires', { date: formatLocaleDate(expiresAt) })}
            </AppText>
          ) : null}
          <View style={styles.buttons}>
            <AppButton
              label={t('roles.invite_share_whatsapp')}
              onPress={() => void handleShareVia('whatsapp')}
              variant="primary"
              fullWidth
              testID="share-whatsapp"
            />
            <AppButton
              label={t('roles.invite_share_sms')}
              onPress={() => void handleShareVia('sms')}
              variant="secondary"
              fullWidth
              testID="share-sms"
            />
            <AppButton
              label={t('roles.invite_share')}
              onPress={() => void handleShare()}
              variant="ghost"
              fullWidth
              testID="share-generic"
            />
          </View>
        </View>
      ) : null}
    </AppBottomSheet>
  )
}

InviteShareSheet.displayName = 'InviteShareSheet'

export default InviteShareSheet
