/**
 * RoleBadge — composite. Purpose: show the caller's role (Owner/Staff) as a badge,
 * with an optional area/route label for staff. Thin wrapper over AppBadge.
 * Usage: <RoleBadge role="staff" areaLabel="Sector 15" />
 *
 * Presentational only — labels are resolved here via t() (role labels are a fixed
 * two-value set, so translating inside keeps call sites trivial). No store access.
 */

import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { AppBadge } from '../primitives/AppBadge'
import { AppText } from '../primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface RoleBadgeProps {
  /** Caller role for the active vendor. */
  role: 'owner' | 'staff'
  /** Optional area/route label shown alongside the badge (staff only). */
  areaLabel?: string | null
  /** Test ID for queries. */
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  } as ViewStyle,
})

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, areaLabel, testID }) => {
  const { t } = useTranslation()
  const label = role === 'owner' ? t('roles.owner_badge') : t('roles.staff_badge')
  const variant = role === 'owner' ? 'success' : 'primary'

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={areaLabel ? `${label}, ${areaLabel}` : label}
    >
      <AppBadge label={label} variant={variant} />
      {role === 'staff' && areaLabel ? (
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {areaLabel}
        </AppText>
      ) : null}
    </View>
  )
}

export default RoleBadge
