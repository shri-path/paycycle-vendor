/**
 * PaymentScoreStars — customer module display component (US-008).
 * Purpose: Converts a 0–100 payment score into a star display (5 stars) and
 * shows the numeric score as a percentage label.
 *
 * Scoring bands:
 *   0–20  → 1 star
 *   21–40 → 2 stars
 *   41–60 → 3 stars
 *   61–80 → 4 stars
 *   81–100→ 5 stars
 *
 * Presentational — no store/API access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { colors, spacing, componentSizes } from '@constants/tokens'

export interface PaymentScoreStarsProps {
  /** Payment score from 0 to 100. */
  score: number
  /** Test ID forwarded to the root View. */
  testID?: string
}

const MAX_STARS = 5
const STAR_SIZE = componentSizes.icon.sm

/** Maps a 0–100 score to a 1–5 star count. */
function scoreToStars(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  if (clamped <= 20) return 1
  if (clamped <= 40) return 2
  if (clamped <= 60) return 3
  if (clamped <= 80) return 4
  return 5
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stars: {
    flexDirection: 'row',
    gap: spacing[1],
  },
})

export const PaymentScoreStars: React.FC<PaymentScoreStarsProps> = ({ score, testID }) => {
  const filledStars = scoreToStars(score)

  return (
    <View style={styles.container} testID={testID} accessibilityLabel={`${score}%`}>
      <View style={styles.stars}>
        {Array.from({ length: MAX_STARS }, (_, i) => (
          <Ionicons
            key={i}
            name={i < filledStars ? 'star' : 'star-outline'}
            size={STAR_SIZE}
            color={i < filledStars ? colors.warning : colors.gray300}
            importantForAccessibility="no"
          />
        ))}
      </View>
      <AppText variant="caption" color={colors.textSecondary}>
        {score}%
      </AppText>
    </View>
  )
}

PaymentScoreStars.displayName = 'PaymentScoreStars'

export default PaymentScoreStars
