/**
 * VoiceCommandScreen [S3] (US-013, T-19, wireframe 2.49)
 * Purpose: Voice command capture → transcribe → interpret → execute delivery marking.
 *
 * 5 UI states:
 *   idle      — MicButton (blue), example list, last command card if exists
 *   recording — MicButton (red/stop), duration timer, cancel
 *   processing— MicButton (gray/spinner), disables all interaction
 *   confirm   — for mark_all: Dialog to confirm; for single customer after disambiguation
 *   done      — VoiceResultCard, Undo button, Next Customer button
 *
 * Business rules:
 * - autoExecute=true  → executeCommand immediately after transcribe
 * - autoExecute=false → show confirmation or disambiguation sheet first
 * - mark_all action   → confirm dialog before execute
 * - single customer with candidates → DisambiguationSheet
 * - Undo = markDelivery(PENDING) via useDeliveryStore
 * - If voiceCommandsEnabled=false → CTA to LanguageSettingsScreen
 * - Refresh delivery list after successful execute
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppText } from '@components/primitives/AppText'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useVoiceStore } from '../store/voice.store'
import { useLanguageStore } from '../store/language.store'
import {
  MicButton,
  VoiceExampleList,
  LastCommandCard,
  VoiceResultCard,
  DisambiguationSheet,
} from '../components'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import type { VoiceCandidateDto, LanguageCode } from '../../../types/voice'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  micRow: {
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  timerText: {
    marginTop: spacing[3],
    textAlign: 'center',
  },
  hintText: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
  errorRow: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  ctaRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  nextButton: {
    marginTop: spacing[3],
  },
  disabledBanner: {
    padding: spacing[4],
    backgroundColor: colors.warningBg,
    margin: spacing[4],
    borderRadius: 8,
  },
})

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function VoiceCommandContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const { listId } = useLocalSearchParams<{ listId: string }>()

  const appLanguage = useLanguageStore((s) => s.appLanguage)
  const voiceCommandsEnabled = useLanguageStore(
    (s) => s.preferences?.voiceCommandsEnabled ?? false,
  )

  const {
    recordingState,
    lastTranscription,
    lastInterpretation,
    lastResult,
    lastLogId,
    candidates,
    error,
    transcribe,
    executeCommand,
    reset,
  } = useVoiceStore(
    useShallow((s) => ({
      recordingState: s.recordingState,
      lastTranscription: s.lastTranscription,
      lastInterpretation: s.lastInterpretation,
      lastResult: s.lastResult,
      lastLogId: s.lastLogId,
      candidates: s.candidates,
      error: s.error,
      transcribe: s.transcribe,
      executeCommand: s.executeCommand,
      reset: s.reset,
    })),
  )

  const recorder = useVoiceRecorder()
  const [disambigVisible, setDisambigVisible] = useState(false)
  const executing = useRef(false)

  // Refresh delivery list after execute via lazy-require (avoids module cycle)
  const refreshDeliveries = useCallback(() => {
    if (!listId) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useDeliveryStore } = require('@modules/delivery/store/delivery.store') as {
        useDeliveryStore: { getState: () => { fetchListDeliveries: (id: string) => Promise<void> } }
      }
      void useDeliveryStore.getState().fetchListDeliveries(listId)
    } catch {
      // Store not available in test environment
    }
  }, [listId])

  // Mark deliveries as PENDING (undo) via delivery store
  const handleUndo = useCallback(() => {
    if (!lastResult || !listId) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useDeliveryStore } = require('@modules/delivery/store/delivery.store') as {
        useDeliveryStore: {
          getState: () => {
            markDelivery: (listId: string, deliveryId: string, status: string) => Promise<void>
          }
        }
      }
      if (lastResult.action !== 'mark_all' && 'deliveryId' in lastResult && lastResult.deliveryId) {
        void useDeliveryStore.getState().markDelivery(listId, lastResult.deliveryId, 'PENDING')
      }
      // mark_all undo is not supported (too many records)
      reset()
      refreshDeliveries()
    } catch {
      // Fallback: just reset
      reset()
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [lastResult, listId, reset, refreshDeliveries])

  const doExecute = useCallback(
    async (customerId?: string | null) => {
      if (executing.current || !lastLogId || !lastInterpretation) return
      if (lastInterpretation.action === 'unknown') return
      executing.current = true
      const input = {
        interpretation: {
          action: lastInterpretation.action as Exclude<typeof lastInterpretation.action, 'unknown'>,
          customerId: customerId ?? lastInterpretation.customerId ?? undefined,
          quantity: lastInterpretation.quantity ?? undefined,
        },
        supplyListId: listId ?? '',
        serviceDate: new Date().toISOString().split('T')[0],
        logId: lastLogId,
      }
      try {
        await executeCommand(input)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        refreshDeliveries()
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } finally {
        executing.current = false
      }
    },
    [lastLogId, lastInterpretation, listId, executeCommand, refreshDeliveries],
  )

  const handleTranscribeResult = useCallback(
    async (base64: string) => {
      try {
        const result = await transcribe({
          audioData: base64,
          languageCode: appLanguage as LanguageCode,
          supplyListId: listId ?? '',
          serviceDate: new Date().toISOString().split('T')[0],
        })

        const interp = result.interpretation

        if (interp.action === 'unknown') {
          // Unknown: show error; user must retry
          return
        }

        if (interp.autoExecute) {
          // High-confidence: execute immediately
          if (interp.action === 'mark_all') {
            // Even for auto-execute, confirm mark_all
            Alert.alert(
              t('voice.confirm_mark_all_title'),
              t('voice.confirm_mark_all_message'),
              [
                { text: t('voice.cancel'), style: 'cancel', onPress: reset },
                { text: t('voice.confirm'), onPress: () => void doExecute() },
              ],
            )
          } else {
            await doExecute()
          }
        } else {
          // Low confidence / needs disambiguation
          if (!interp.customerId && interp.candidates && interp.candidates.length > 0) {
            setDisambigVisible(true)
          } else {
            // Single candidate but low confidence → confirmation
            Alert.alert(
              t('voice.confirm_action_title'),
              t('voice.confirm_action_message', { action: t(`voice.action_${interp.action}`) }),
              [
                { text: t('voice.cancel'), style: 'cancel', onPress: reset },
                { text: t('voice.confirm'), onPress: () => void doExecute() },
              ],
            )
          }
        }
      } catch {
        // Error already stored in voice store; haptics handled in doExecute
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    },
    [transcribe, appLanguage, listId, doExecute, reset, t],
  )

  const handleMicPress = useCallback(async () => {
    if (recordingState === 'recording') {
      // Stop recording
      try {
        const base64 = await recorder.stop()
        await handleTranscribeResult(base64)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'voice.error.unknown'
        useVoiceStore.setState({ error: msg, recordingState: 'idle' })
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } else if (recordingState === 'idle') {
      // Start recording
      useVoiceStore.getState().setRecordingState('requesting_permission')
      try {
        await recorder.start()
        useVoiceStore.getState().setRecordingState('recording')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'voice.error.unknown'
        useVoiceStore.setState({ error: msg, recordingState: 'idle' })
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    }
  }, [recordingState, recorder, handleTranscribeResult])

  const handleCandidateSelect = useCallback(
    (candidate: VoiceCandidateDto) => {
      setDisambigVisible(false)
      void doExecute(candidate.id)
    },
    [doExecute],
  )

  // Derive mic button state
  const micState =
    recordingState === 'recording'
      ? 'recording'
      : recordingState === 'transcribing' || recordingState === 'executing' || recordingState === 'requesting_permission'
        ? 'processing'
        : 'idle'

  const isProcessing = micState === 'processing'

  // If voice commands disabled → CTA to settings
  if (!voiceCommandsEnabled) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('voice.title')} showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <View style={styles.disabledBanner}>
            <AppText variant="body" weight="semibold" color={colors.warning} style={{ marginBottom: spacing[3] }}>
              {t('voice.disabled_title')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[4] }}>
              {t('voice.disabled_desc')}
            </AppText>
            <AppButton
              label={t('voice.go_to_language_settings')}
              variant="outline"
              onPress={() => router.push('/(app)/settings/language')}
              testID="goto-lang-settings-btn"
            />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // Done state — show result card
  if (lastResult && recordingState === 'idle') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('voice.title')} showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <VoiceResultCard
            result={lastResult}
            confidence={lastInterpretation?.confidence ?? 1}
            testID="voice-result-card"
          />
        </View>
        <View style={styles.ctaRow}>
          {lastResult.action !== 'mark_all' && 'deliveryId' in lastResult && lastResult.deliveryId ? (
            <AppButton
              label={t('voice.undo')}
              variant="outline"
              onPress={handleUndo}
              testID="undo-btn"
            />
          ) : null}
          <AppButton
            label={t('voice.next_customer')}
            variant="primary"
            onPress={reset}
            style={styles.nextButton}
            testID="next-customer-btn"
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('voice.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.errorRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(error)}
            onClose={() => useVoiceStore.setState({ error: null })}
          />
        </View>
      ) : null}

      <View style={styles.micRow}>
        <MicButton
          state={micState}
          onPress={() => void handleMicPress()}
          disabled={!isConnected || isProcessing}
          testID="mic-button"
        />

        {recordingState === 'recording' ? (
          <AppText variant="body" weight="semibold" color={colors.error} style={styles.timerText}>
            {formatDuration(recorder.durationMs)}
          </AppText>
        ) : null}

        <AppText variant="caption" color={colors.textSecondary} style={styles.hintText}>
          {isProcessing
            ? t('voice.processing')
            : recordingState === 'recording'
              ? t('voice.recording_hint')
              : t('voice.tap_to_speak')}
        </AppText>
      </View>

      {/* Example commands */}
      {recordingState === 'idle' && !lastInterpretation ? (
        <VoiceExampleList />
      ) : null}

      {/* Last command card (after transcription, before result) */}
      {lastInterpretation && !lastResult ? (
        <LastCommandCard
          transcription={{
            transcription: lastTranscription ?? '',
            interpretation: lastInterpretation,
            logId: lastLogId ?? '',
            confidence: lastInterpretation.confidence,
          }}
          result={null}
          testID="last-cmd-card"
        />
      ) : null}

      {/* Disambiguation sheet */}
      <DisambiguationSheet
        visible={disambigVisible}
        candidates={candidates}
        onSelect={handleCandidateSelect}
        onDismiss={() => {
          setDisambigVisible(false)
          reset()
        }}
        testID="disambig-sheet"
      />
    </SafeAreaView>
  )
}

export default function VoiceCommandScreen() {
  return (
    <ScreenErrorBoundary>
      <VoiceCommandContent />
    </ScreenErrorBoundary>
  )
}

VoiceCommandScreen.displayName = 'VoiceCommandScreen'
