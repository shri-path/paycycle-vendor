/**
 * DisambiguationSheet Component (US-013)
 * Purpose: Bottom-sheet-style candidate picker when server returns
 * multiple customer matches (customerId is null, candidates > 0).
 * Renders candidate chips; user taps one to confirm.
 */

import React, { memo } from 'react'
import { View, Pressable, ScrollView, StyleSheet, Modal } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { VoiceCandidateDto } from '../../../types/voice'

interface Props {
  visible: boolean
  candidates: VoiceCandidateDto[]
  onSelect(candidate: VoiceCandidateDto): void
  onDismiss(): void
  testID?: string
}

export const DisambiguationSheet = memo(function DisambiguationSheet({
  visible,
  candidates,
  onSelect,
  onDismiss,
  testID,
}: Props) {
  const { t } = useTranslation()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      testID={testID}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel={t('voice.dismiss')}>
        <View />
      </Pressable>
      <View style={styles.sheet} testID={`${testID ?? 'disambig'}-sheet`}>
        {/* Handle */}
        <View style={styles.handle} />

        <AppText variant="body" weight="semibold" style={styles.title}>
          {t('voice.disambiguation_title')}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={styles.subtitle}>
          {t('voice.disambiguation_subtitle')}
        </AppText>

        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {candidates.map((candidate) => (
            <Pressable
              key={candidate.id}
              onPress={() => onSelect(candidate)}
              accessibilityRole="button"
              accessibilityLabel={candidate.name}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
              testID={`candidate-${candidate.id}`}
            >
              <AppText variant="body" weight="medium" color={colors.primary}>
                {candidate.name}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('voice.cancel')}
          style={styles.cancelButton}
          testID={`${testID ?? 'disambig'}-cancel`}
        >
          <AppText variant="body" color={colors.error} weight="medium">
            {t('voice.cancel')}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  )
})

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  title: {
    paddingHorizontal: spacing[6],
    marginBottom: spacing[1],
  },
  subtitle: {
    paddingHorizontal: spacing[6],
    marginBottom: spacing[4],
  },
  scroll: {
    maxHeight: 300,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  chip: {
    padding: spacing[4],
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  chipPressed: {
    opacity: 0.7,
  },
  cancelButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginHorizontal: spacing[6],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
})

export default DisambiguationSheet
