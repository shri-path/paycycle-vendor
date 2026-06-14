/**
 * VoiceResultCard Component (US-013)
 * Purpose: Shows execution result summary — mark_all (count) or single-customer name.
 * Displays confidence percentage. Used as the success state in VoiceCommandScreen.
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { ExecuteCommandResultDto } from '../../../types/voice'

interface Props {
  result: ExecuteCommandResultDto
  confidence: number
  testID?: string
}

export const VoiceResultCard = memo(function VoiceResultCard({
  result,
  confidence,
  testID,
}: Props) {
  const { t } = useTranslation()

  const confidencePct = Math.round(confidence)
  const isMarkAll = result.action === 'mark_all'

  const summary = isMarkAll
    ? t('voice.result_mark_all', { count: String(result.markedCount) })
    : t('voice.result_single', { name: 'customerName' in result ? result.customerName : '' })

  const subtext = isMarkAll
    ? t('voice.result_mark_all_sub', { count: String(result.markedCount) })
    : 'deliveryId' in result && result.deliveryId
      ? t('voice.result_single_sub')
      : ''

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.iconRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-done" size={32} color={colors.white} />
        </View>
      </View>

      <AppText variant="h4" weight="semibold" style={styles.summary}>
        {summary}
      </AppText>

      {subtext ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.subtext}>
          {subtext}
        </AppText>
      ) : null}

      <View style={styles.confidenceRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('voice.confidence_label')}
        </AppText>
        <View
          style={[
            styles.confidencePill,
            { backgroundColor: confidencePct >= 80 ? colors.successBg : colors.warningBg },
          ]}
        >
          <AppText
            variant="caption"
            weight="semibold"
            color={confidencePct >= 80 ? colors.success : colors.warning}
          >
            {confidencePct}{'%'}
          </AppText>
        </View>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginHorizontal: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  iconRow: {
    marginBottom: spacing[4],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    textAlign: 'center',
    marginBottom: spacing[2],
    color: colors.textPrimary,
  },
  subtext: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  confidencePill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
})

export default VoiceResultCard
