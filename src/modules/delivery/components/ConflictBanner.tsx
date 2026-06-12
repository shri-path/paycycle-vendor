/**
 * ConflictBanner — composite. Purpose: owner-facing summary of today's delivery
 * conflicts (count → expandable list). Conflicts are DISPLAY-ONLY here; tapping a
 * row navigates the caller to the owning list to re-mark. Status conveyed by icon
 * + text. Presentational; data + callback via props. Usage:
 *   <ConflictBanner conflicts={conflicts} onSelectConflict={openList} />
 */

import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius, componentSizes, interaction } from '@constants/tokens'
import type { TodayConflictDto } from '../../../types/delivery'

export interface ConflictBannerProps {
  /** Conflicts surfaced by the today view. Empty → renders nothing. */
  conflicts: TodayConflictDto[]
  /** Called with the conflicting delivery's list id (resolved by caller). */
  onSelectConflict: (deliveryId: string) => void
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerText: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    minHeight: componentSizes.button.md,
  },
  rowText: {
    flex: 1,
  },
})

const ConflictBannerComponent: React.FC<ConflictBannerProps> = ({
  conflicts,
  onSelectConflict,
  testID,
}) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (conflicts.length === 0) return null

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={interaction.activeOpacity}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('delivery.conflicts_count', { count: conflicts.length })}
        testID={testID ? `${testID}-toggle` : undefined}
      >
        <Ionicons
          name="warning"
          size={componentSizes.icon.md}
          color={colors.warning}
          importantForAccessibility="no"
        />
        <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.headerText}>
          {t('delivery.conflicts_count', { count: conflicts.length })}
        </AppText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={componentSizes.icon.md}
          color={colors.textSecondary}
          importantForAccessibility="no"
        />
      </TouchableOpacity>

      {expanded
        ? conflicts.map((conflict) => (
            <TouchableOpacity
              key={conflict.deliveryId}
              style={styles.row}
              onPress={() => onSelectConflict(conflict.deliveryId)}
              activeOpacity={interaction.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel={`${conflict.listName} — ${conflict.reason}`}
              testID={testID ? `${testID}-row-${conflict.deliveryId}` : undefined}
            >
              <View style={styles.rowText}>
                <AppText variant="caption" weight="medium" color={colors.textPrimary} numberOfLines={1}>
                  {conflict.listName}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                  {t('delivery.conflict_reason', { reason: conflict.reason })}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={componentSizes.icon.sm}
                color={colors.textSecondary}
                importantForAccessibility="no"
              />
            </TouchableOpacity>
          ))
        : null}
    </View>
  )
}

export const ConflictBanner = React.memo(ConflictBannerComponent)
ConflictBanner.displayName = 'ConflictBanner'

export default ConflictBanner
