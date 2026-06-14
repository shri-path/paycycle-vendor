/**
 * QuickActionsGrid (US-012, T-07)
 * 2×2 grid of dashboard action tiles. Haptic on each press.
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'

export interface QuickAction {
  key: string
  labelKey: string
  iconName: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
  comingSoon?: boolean
}

export interface QuickActionsGridProps {
  actions: QuickAction[]
  testID?: string
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[3] },
  tile: {
    flex: 1,
    minWidth: '44%',
    padding: spacing[4],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing[2],
  },
  tileDisabled: { opacity: 0.5 },
  comingSoonBadge: {
    position: 'absolute',
    top: spacing[1],
    right: spacing[1],
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
})

export const QuickActionsGrid = React.memo<QuickActionsGridProps>(({ actions, testID }) => {
  const { t } = useTranslation()

  const handlePress = useCallback((action: QuickAction) => {
    if (action.disabled || action.comingSoon) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    action.onPress()
  }, [])

  return (
    <View style={styles.grid} testID={testID ?? 'quick-actions-grid'}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={t(action.labelKey)}
          accessibilityState={{ disabled: action.disabled || action.comingSoon }}
          onPress={() => handlePress(action)}
          testID={`quick-action-${action.key}`}
        >
          {({ pressed }) => (
            <AppCard
              style={[
                styles.tile,
                (action.disabled || action.comingSoon) && styles.tileDisabled,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons
                name={action.iconName}
                size={28}
                color={action.disabled || action.comingSoon ? colors.textSecondary : colors.primary}
              />
              <AppText
                variant="caption"
                weight="semibold"
                color={action.disabled || action.comingSoon ? colors.textSecondary : colors.textPrimary}
                style={{ textAlign: 'center' }}
              >
                {t(action.labelKey)}
              </AppText>
              {action.comingSoon ? (
                <View style={styles.comingSoonBadge}>
                  <AppText variant="caption" color={colors.textSecondary} style={{ fontSize: 9 }}>
                    {t('common.coming_soon')}
                  </AppText>
                </View>
              ) : null}
            </AppCard>
          )}
        </Pressable>
      ))}
    </View>
  )
})

QuickActionsGrid.displayName = 'QuickActionsGrid'
export default QuickActionsGrid
