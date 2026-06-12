/**
 * ReasonChips — composite. Purpose: quick-select reason chips (e.g. Extra milk /
 * Festival) that fill a free-text reason field with one tap (recognition over
 * recall, minimal typing). Presentational; the caller passes already-translated
 * reason labels and handles selection. Usage:
 *   <ReasonChips reasons={[t('delivery.reason_festival')]} onSelect={setReason} />
 */

import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { colors, spacing, borderRadius, interaction, componentSizes } from '@constants/tokens'

export interface ReasonChipsProps {
  /** Already-translated reason labels to offer as chips. */
  reasons: string[]
  /** Called with the selected reason label. */
  onSelect: (reason: string) => void
  /** Currently selected reason (for visual highlight), if any. */
  selected?: string | null
  testID?: string
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    minHeight: componentSizes.button.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
})

const ReasonChipsComponent: React.FC<ReasonChipsProps> = ({
  reasons,
  onSelect,
  selected,
  testID,
}) => {
  return (
    <View style={styles.row} testID={testID}>
      {reasons.map((reason) => {
        const isSelected = selected === reason
        return (
          <TouchableOpacity
            key={reason}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(reason)}
            activeOpacity={interaction.activeOpacity}
            hitSlop={interaction.defaultHitSlop}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={reason}
            testID={testID ? `${testID}-${reason}` : undefined}
          >
            <AppText
              variant="caption"
              weight="medium"
              color={isSelected ? colors.primary : colors.textPrimary}
            >
              {reason}
            </AppText>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export const ReasonChips = React.memo(ReasonChipsComponent)
ReasonChips.displayName = 'ReasonChips'

export default ReasonChips
