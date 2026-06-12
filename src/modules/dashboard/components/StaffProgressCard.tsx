/**
 * StaffProgressCard (US-010)
 * Purpose: Staff dashboard card for one assigned supply list.
 * Shows name, start time, X/Y done, progress bar, status icon,
 * and a Continue/View button by status.
 *
 * SECURITY: NO financial fields on this component. StaffAssignedList type
 * enforces this at the type level.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { StaffAssignedList, DeliveryStatus } from '../../../types/dashboard'

export interface StaffProgressCardProps {
  list: StaffAssignedList
  onPress: () => void
}

function statusIcon(status: DeliveryStatus): React.ReactNode {
  switch (status) {
    case 'completed':
      return <Ionicons name="checkmark-circle" size={componentSizes.icon.md} color={colors.success} />
    case 'in_progress':
      return <Ionicons name="refresh-circle" size={componentSizes.icon.md} color={colors.warning} />
    default:
      return <Ionicons name="ellipse-outline" size={componentSizes.icon.md} color={colors.gray400} />
  }
}

const styles = StyleSheet.create({
  card: { padding: spacing[3], marginBottom: spacing[3] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  progressLabel: { marginBottom: spacing[2] },
  btn: { marginTop: spacing[1] },
})

export const StaffProgressCard: React.FC<StaffProgressCardProps> = ({ list, onPress }) => {
  const { t } = useTranslation()

  const buttonLabel =
    list.status === 'in_progress' ? t('delivery.continue') : t('delivery.open_list')

  return (
    <AppCard style={styles.card} testID={`staff-list-card-${list.id}`}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          {statusIcon(list.status)}
          <AppText variant="body" weight="semibold" color={colors.textPrimary}>
            {list.name}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.textSecondary}>
          {list.startTime}
        </AppText>
      </View>

      <AppText variant="caption" color={colors.textSecondary} style={styles.progressLabel}>
        {list.progress.completed}/{list.progress.total} {t('dashboard.completed').toLowerCase()}
      </AppText>

      <AppProgressBar
        value={list.progress.percentage}
        max={100}
        variant={list.progress.percentage >= 100 ? 'success' : 'default'}
        animated
      />

      <AppButton
        label={buttonLabel}
        onPress={onPress}
        variant={list.status === 'in_progress' ? 'primary' : 'secondary'}
        size="sm"
        fullWidth
        style={styles.btn}
        testID={`staff-list-btn-${list.id}`}
      />
    </AppCard>
  )
}

export default StaffProgressCard
