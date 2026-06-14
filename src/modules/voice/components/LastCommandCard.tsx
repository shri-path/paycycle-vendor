/**
 * LastCommandCard Component (US-013)
 * Purpose: Displays the transcription text + execution result from the last voice command.
 * Shows confidence badge, action taken, and optional undo button.
 */

import React, { memo } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { VoiceTranscribeResultDto, ExecuteCommandResultDto } from '../../../types/voice'

interface Props {
  transcription: VoiceTranscribeResultDto
  result: ExecuteCommandResultDto | null
  onUndo?(): void
  testID?: string
}

export const LastCommandCard = memo(function LastCommandCard({
  transcription,
  result,
  onUndo,
  testID,
}: Props) {
  const { t } = useTranslation()
  const { interpretation } = transcription

  const confidencePct = Math.round(interpretation.confidence ?? 0)
  const confidenceColor =
    confidencePct >= 80 ? colors.success : confidencePct >= 60 ? colors.warning : colors.error

  const resultSummary = result
    ? result.action === 'mark_all'
      ? t('voice.result_mark_all', { count: String(result.markedCount) })
      : t('voice.result_single', { name: 'customerName' in result ? result.customerName : '' })
    : null

  return (
    <View style={styles.card} testID={testID}>
      {/* Transcription text */}
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
        <AppText variant="caption" color={colors.textSecondary} style={styles.headerLabel}>
          {t('voice.transcription_label')}
        </AppText>
        {/* Confidence badge */}
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
          <AppText variant="caption" color={confidenceColor} weight="semibold">
            {confidencePct}{'%'}
          </AppText>
        </View>
      </View>
      <AppText variant="body" weight="medium" style={styles.transcript}>
        {`"${transcription.transcription}"`}
      </AppText>

      {/* Result summary */}
      {resultSummary ? (
        <View style={styles.resultRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <AppText variant="caption" color={colors.success} style={styles.resultText}>
            {resultSummary}
          </AppText>
        </View>
      ) : null}

      {/* Undo button */}
      {onUndo && result ? (
        <Pressable
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel={t('voice.undo')}
          style={styles.undoButton}
          testID={`${testID ?? 'last-cmd'}-undo`}
        >
          <Ionicons name="arrow-undo-outline" size={14} color={colors.primary} />
          <AppText variant="caption" color={colors.primary} weight="medium" style={styles.undoText}>
            {t('voice.undo')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  headerLabel: {
    flex: 1,
    marginStart: spacing[1],
  },
  confidenceBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  transcript: {
    marginBottom: spacing[2],
    fontStyle: 'italic',
    color: colors.textPrimary,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  resultText: {
    marginStart: spacing[1],
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  undoText: {
    marginStart: spacing[1],
  },
})

export default LastCommandCard
