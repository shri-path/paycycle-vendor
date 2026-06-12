/**
 * SupplyListProgressCard (US-010)
 * Purpose: Owner dashboard card for one supply list in "today's supply lists".
 * Shows name, start time, staff name, X/Y done, progress bar, status icon.
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppProgressBar, type ProgressVariant } from '@components/composite/AppProgressBar'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { OwnerTodayList, DeliveryStatus } from '../../../types/dashboard'

export interface SupplyListProgressCardProps {
  list: OwnerTodayList
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

function progressVariant(pct: number): ProgressVariant {
  if (pct >= 100) return 'success'
  if (pct >= 50) return 'default'
  return 'warning'
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  viewBtn: { paddingVertical: spacing[1], paddingHorizontal: spacing[2] },
})

export const SupplyListProgressCard: React.FC<SupplyListProgressCardProps> = ({ list, onPress }) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID={`supply-list-card-${list.id}`}>
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

      <View style={styles.metaRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {list.progress.completed}/{list.progress.total} {t('dashboard.completed').toLowerCase()} | {list.staffName}
        </AppText>
        <TouchableOpacity
          onPress={onPress}
          style={styles.viewBtn}
          accessibilityRole="button"
          accessibilityLabel={`${t('delivery.open_list')} ${list.name}`}
          testID={`supply-list-view-${list.id}`}
        >
          <AppText variant="caption" weight="semibold" color={colors.primary}>
            {t('delivery.open_list')} {'›'}
          </AppText>
        </TouchableOpacity>
      </View>

      <AppProgressBar
        value={list.progress.percentage}
        max={100}
        variant={progressVariant(list.progress.percentage)}
        animated
      />
    </AppCard>
  )
}

export default SupplyListProgressCard
