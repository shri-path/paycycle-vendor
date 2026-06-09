/**
 * StaffCard — roles module composite (US-002).
 * Purpose: One staff member row in the Staff List. Avatar, name, phone, assigned
 * list count, today's stats (or placeholder), and a status badge. Memoized for
 * smooth scrolling on low-end devices.
 *
 * Presentational: receives `staff` + `onPress(staffId)`; no store/API access.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { AppBadge, BadgeVariant } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, interaction } from '@constants/tokens'
import type { StaffResponseDto, StaffStatus } from '../../../types/roles'

export interface StaffCardProps {
  /** Staff member to render. */
  staff: StaffResponseDto
  /** Called with the staffId when the card is tapped. */
  onPress: (staffId: string) => void
  /** Test ID. */
  testID?: string
}

const STATUS_BADGE: Record<StaffStatus, { variant: BadgeVariant; key: string }> = {
  ACTIVE: { variant: 'success', key: 'roles.status_active' },
  DISABLED: { variant: 'gray', key: 'roles.status_disabled' },
  INVITED: { variant: 'warning', key: 'roles.status_invited' },
  REMOVED: { variant: 'gray', key: 'roles.status_disabled' },
}

/** Initials from a name (falls back to '?' so the avatar always renders). */
function initialsOf(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second) || '?'
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[2],
    minHeight: interaction.minTouchTarget + spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  body: {
    flex: 1,
    gap: spacing[1],
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
})

const StaffCardComponent: React.FC<StaffCardProps> = ({ staff, onPress, testID }) => {
  const { t } = useTranslation()
  const badge = STATUS_BADGE[staff.status]

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(staff.staffId)
  }, [onPress, staff.staffId])

  const todayLabel =
    staff.todayStats != null
      ? t('roles.today_done', {
          done: staff.todayStats.deliveriesMarked,
          total: staff.todayStats.deliveriesMarked + staff.todayStats.leavesMarked,
        })
      : '—'

  return (
    <AppCard
      variant="elevated"
      onPress={handlePress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={staff.name ?? t('roles.staff_badge')}
      testID={testID}
    >
      <View style={styles.row}>
        <AppAvatar initials={initialsOf(staff.name)} size="md" />
        <View style={styles.body}>
          <View style={styles.topLine}>
            <AppText variant="body" weight="semibold" numberOfLines={1}>
              {staff.name ?? '—'}
            </AppText>
            <AppBadge label={t(badge.key)} variant={badge.variant} size="sm" />
          </View>
          {staff.phone ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {staff.phone}
            </AppText>
          ) : null}
          {staff.areaRouteLabel ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {staff.areaRouteLabel}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {todayLabel}
          </AppText>
        </View>
      </View>
    </AppCard>
  )
}

StaffCardComponent.displayName = 'StaffCard'

export const StaffCard = React.memo(StaffCardComponent)

export default StaffCard
