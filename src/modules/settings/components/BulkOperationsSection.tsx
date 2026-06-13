/**
 * BulkOperationsSection (US-011)
 * Purpose: Three navigation buttons to S3/S4/S5 bulk operation screens.
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { AppCard } from '@components/primitives/AppCard'
import { AppButton } from '@components/primitives/AppButton'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    marginBottom: spacing[2],
  },
  button: {
    marginBottom: spacing[1],
  },
})

export const BulkOperationsSection: React.FC = () => {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <AppCard style={styles.card} testID="bulk-operations-section">
      <AppText variant="label" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
        {t('settings.bulk_operations_title')}
      </AppText>

      <AppButton
        label={t('settings.bulk_mark_leave')}
        variant="secondary"
        style={styles.button}
        onPress={() => router.push('/(app)/settings/bulk/mark-leave' as Href)}
        testID="bulk-mark-leave-btn"
      />

      <AppButton
        label={t('settings.bulk_adjust_rate')}
        variant="secondary"
        style={styles.button}
        onPress={() => router.push('/(app)/settings/bulk/adjust-rate' as Href)}
        testID="bulk-adjust-rate-btn"
      />

      <AppButton
        label={t('settings.bulk_send_reminders')}
        variant="secondary"
        style={styles.button}
        onPress={() => router.push('/(app)/settings/bulk/send-reminders' as Href)}
        testID="bulk-send-reminders-btn"
      />
    </AppCard>
  )
}

export default BulkOperationsSection
