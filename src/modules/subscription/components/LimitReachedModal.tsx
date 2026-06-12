/**
 * LimitReachedModal — shared subscription component (US-009).
 * Purpose: Modal shown when a write endpoint returns HTTP 451
 * (SUBSCRIPTION_LIMIT_REACHED). Informs the user of their current vs. max
 * resource usage and offers an "Upgrade Plan" CTA.
 * Shows "Unlimited" for max === 0 (shouldn't normally reach modal in that case,
 * but handles it safely per R3 spec).
 * Pure presentational — trigger state owned by the host screen via useLimitReached.
 */

import React from 'react'
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { isUnlimited } from '../utils/usage'

export type LimitResource = 'customers' | 'staff' | 'supplyLists'

export interface LimitReachedModalProps {
  visible: boolean
  resource: LimitResource
  current: number
  max: number
  onUpgrade: () => void
  onClose: () => void
}

const RESOURCE_LABEL_KEY: Record<LimitResource, string> = {
  customers: 'subscription.customers',
  staff: 'subscription.staff',
  supplyLists: 'subscription.supply_lists',
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: spacing[3],
    padding: spacing[5],
    width: '100%',
    maxWidth: 400,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  icon: {
    fontSize: 40,
    lineHeight: 48,
  },
  title: { marginBottom: spacing[2], textAlign: 'center' },
  body: { marginBottom: spacing[4], textAlign: 'center' },
  actions: { gap: spacing[2] },
})

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
  visible,
  resource,
  current,
  max,
  onUpgrade,
  onClose,
}) => {
  const { t } = useTranslation()
  const resourceLabel = t(RESOURCE_LABEL_KEY[resource]).toLowerCase()
  const maxLabel = isUnlimited(max) ? t('subscription.unlimited') : String(max)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={styles.modal} activeOpacity={1}>
          <View style={styles.iconRow}>
            <AppText style={styles.icon}>⚠️</AppText>
          </View>

          <AppText variant="h3" weight="bold" color={colors.textPrimary} style={styles.title}>
            {t('subscription.limit_reached_title')}
          </AppText>

          <AppText variant="body" color={colors.textSecondary} style={styles.body}>
            {t('subscription.limit_reached_body', {
              max: maxLabel,
              current: String(current),
              resource: resourceLabel,
            })}
          </AppText>

          <View style={styles.actions}>
            <AppButton
              label={t('subscription.limit_upgrade_cta')}
              onPress={onUpgrade}
              variant="primary"
              fullWidth
              testID="limit-modal-upgrade"
            />
            <AppButton
              label={t('common.cancel')}
              onPress={onClose}
              variant="secondary"
              fullWidth
              testID="limit-modal-cancel"
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

LimitReachedModal.displayName = 'LimitReachedModal'

export default LimitReachedModal
