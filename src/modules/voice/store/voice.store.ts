/**
 * Voice Store (US-013)
 * Purpose: Record → Transcribe → Interpret → Execute round-trip state.
 *
 * Audio recording itself lives in useVoiceRecorder() hook — this store only
 * manages the two network calls + interpretation state.
 *
 * Client orchestration (per API_SPEC Notes):
 *   - After transcribe(), the SCREEN checks interpretation.autoExecute:
 *     true  → screen calls executeCommand() immediately (passing logId)
 *     false → screen shows confirmation/disambiguation, then executeCommand()
 *
 * Delivery refresh: after a successful executeCommand(), the screen calls
 * useDeliveryStore.getState().fetchListDeliveries(listId) via lazy-require
 * (same pattern as US-012 customers store) to avoid module cycles.
 *
 * Security: no PII in logs (no audioData, no transcription content).
 */

import { create } from 'zustand'
import { voiceService } from '../service/voice.service'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  VoiceTranscribeResultDto,
  VoiceInterpretationDto,
  ExecuteCommandResultDto,
  VoiceCandidateDto,
  ExecuteCommandInput,
  LanguageCode,
} from '../../../types/voice'
import type { TranscribeInput } from '../service/voice.service'

export type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing'
  | 'executing'

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface VoiceState {
  recordingState: RecordingState
  lastTranscription: string | null
  lastInterpretation: VoiceInterpretationDto | null
  lastResult: ExecuteCommandResultDto | null
  lastLogId: string | null
  candidates: VoiceCandidateDto[]
  error: string | null

  // Commands (rethrow on failure)
  transcribe(input: {
    audioData: string
    languageCode: LanguageCode
    supplyListId: string
    serviceDate?: string
  }): Promise<VoiceTranscribeResultDto>

  executeCommand(input: ExecuteCommandInput): Promise<ExecuteCommandResultDto>

  reset(): void
  clearVoice(): void
  setRecordingState(state: RecordingState): void
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  recordingState: 'idle' as RecordingState,
  lastTranscription: null as string | null,
  lastInterpretation: null as VoiceInterpretationDto | null,
  lastResult: null as ExecuteCommandResultDto | null,
  lastLogId: null as string | null,
  candidates: [] as VoiceCandidateDto[],
  error: null as string | null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useVoiceStore = create<VoiceState>()((set) => ({
  ...initialState,

  setRecordingState: (state) => set({ recordingState: state }),

  transcribe: async (input: TranscribeInput) => {
    set({ recordingState: 'transcribing', error: null })
    try {
      const result = await voiceService.transcribe(input)
      set({
        recordingState: 'idle',
        lastTranscription: result.transcription,
        lastInterpretation: result.interpretation,
        lastLogId: result.logId,
        candidates: result.interpretation.candidates ?? [],
      })
      return result
    } catch (err) {
      // Never log audioData — log only the error context
      void logError(err, {
        screen: 'VoiceCommandScreen',
        action: 'transcribe',
        endpoint: 'POST /voice/transcribe',
      })
      const i18nKey = mapApiError(err, 'voice')
      set({ recordingState: 'idle', error: i18nKey })
      throw err
    }
  },

  executeCommand: async (input: ExecuteCommandInput) => {
    set({ recordingState: 'executing', error: null })
    try {
      const result = await voiceService.executeCommand(input)
      set({ recordingState: 'idle', lastResult: result })
      return result
    } catch (err) {
      void logError(err, {
        screen: 'VoiceCommandScreen',
        action: 'executeCommand',
        endpoint: 'POST /voice/execute-command',
      })
      const i18nKey = mapApiError(err, 'voice')
      set({ recordingState: 'idle', error: i18nKey })
      throw err
    }
  },

  /** Reset state for [Next Customer] / Cancel. Returns to idle. */
  reset: () => {
    set({
      recordingState: 'idle',
      lastTranscription: null,
      lastInterpretation: null,
      lastResult: null,
      lastLogId: null,
      candidates: [],
      error: null,
    })
  },

  /** Full wipe on logout. */
  clearVoice: () => set({ ...initialState }),
}))

export default useVoiceStore
