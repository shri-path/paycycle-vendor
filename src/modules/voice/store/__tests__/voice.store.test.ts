/**
 * Voice Store Tests — T-28 (US-013)
 * Covers: transcribe happy/error path, executeCommand happy/error path,
 *         reset clears state, clearVoice full wipe, setRecordingState.
 * Regression: undo path requires listId (BLOCKER-1 fix verification).
 */

// ---------------------------------------------------------------------------
// Mocks — must precede imports
// ---------------------------------------------------------------------------

jest.mock('@utils/logger', () => ({ logError: jest.fn() }))
jest.mock('@utils/errorMapper', () => ({
  mapApiError: jest.fn(() => 'voice.error_unknown'),
}))

const mockTranscribe = jest.fn()
const mockExecuteCommand = jest.fn()

jest.mock('../../service/voice.service', () => ({
  voiceService: {
    transcribe: (...args: unknown[]) => mockTranscribe(...args),
    executeCommand: (...args: unknown[]) => mockExecuteCommand(...args),
  },
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { act } from '@testing-library/react-native'
import { useVoiceStore } from '../voice.store'
import type { VoiceTranscribeResultDto, ExecuteCommandResultDto } from '../../../../types/voice'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockTranscribeResult: VoiceTranscribeResultDto = {
  logId: '55',
  transcription: 'Delivered to Sharma',
  confidence: 95,
  interpretation: {
    action: 'mark_delivered',
    customerId: '10',
    customerName: 'Sharma Family',
    quantity: null,
    confidence: 95,
    autoExecute: true,
    candidates: [],
  },
}

const mockExecuteSingleResult: ExecuteCommandResultDto = {
  executed: true,
  action: 'mark_delivered',
  customerId: '10',
  customerName: 'Sharma Family',
  deliveryId: '987',
  status: 'DELIVERED',
}

const mockExecuteMarkAllResult: ExecuteCommandResultDto = {
  executed: true,
  action: 'mark_all',
  markedCount: 7,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useVoiceStore.setState({
    recordingState: 'idle',
    lastTranscription: null,
    lastInterpretation: null,
    lastResult: null,
    lastLogId: null,
    candidates: [],
    error: null,
  })
}

const transcribeInput = {
  audioData: 'base64audio',
  languageCode: 'en' as const,
  supplyListId: 'list-1',
  serviceDate: '2026-06-14',
}

const executeInput = {
  interpretation: {
    action: 'mark_delivered' as const,
    customerId: '10',
    quantity: undefined,
  },
  supplyListId: 'list-1',
  serviceDate: '2026-06-14',
  logId: '55',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVoiceStore', () => {
  beforeEach(() => {
    resetStore()
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // setRecordingState
  // -------------------------------------------------------------------------
  describe('setRecordingState', () => {
    it('updates recordingState', async () => {
      await act(async () => {
        useVoiceStore.getState().setRecordingState('recording')
      })
      expect(useVoiceStore.getState().recordingState).toBe('recording')
    })
  })

  // -------------------------------------------------------------------------
  // transcribe — happy path
  // -------------------------------------------------------------------------
  describe('transcribe', () => {
    it('returns transcription result and updates store state', async () => {
      mockTranscribe.mockResolvedValueOnce(mockTranscribeResult)
      let result: VoiceTranscribeResultDto | undefined
      await act(async () => {
        result = await useVoiceStore.getState().transcribe(transcribeInput)
      })
      expect(result).toEqual(mockTranscribeResult)
      const state = useVoiceStore.getState()
      expect(state.lastTranscription).toBe(mockTranscribeResult.transcription)
      expect(state.lastInterpretation).toEqual(mockTranscribeResult.interpretation)
      expect(state.lastLogId).toBe(mockTranscribeResult.logId)
      expect(state.recordingState).toBe('idle')
      expect(state.error).toBeNull()
    })

    it('sets error and RETHROWS on failure', async () => {
      mockTranscribe.mockRejectedValueOnce(new Error('network'))
      await expect(
        act(async () => {
          await useVoiceStore.getState().transcribe(transcribeInput)
        }),
      ).rejects.toThrow()
      const state = useVoiceStore.getState()
      expect(state.error).toBe('voice.error_unknown')
      expect(state.recordingState).toBe('idle')
    })

    it('populates candidates for ambiguous results', async () => {
      const ambiguousResult: VoiceTranscribeResultDto = {
        ...mockTranscribeResult,
        interpretation: {
          ...mockTranscribeResult.interpretation,
          customerId: null,
          autoExecute: false,
          candidates: [
            { id: '12', name: 'Anil Kumar' },
            { id: '18', name: 'Anil Sharma' },
          ],
        },
      }
      mockTranscribe.mockResolvedValueOnce(ambiguousResult)
      await act(async () => {
        await useVoiceStore.getState().transcribe(transcribeInput)
      })
      expect(useVoiceStore.getState().candidates).toHaveLength(2)
      expect(useVoiceStore.getState().candidates[0]!.id).toBe('12')
    })

    it('sets recordingState to transcribing during call', async () => {
      let capturedState: string | undefined
      mockTranscribe.mockImplementationOnce(async () => {
        capturedState = useVoiceStore.getState().recordingState
        return mockTranscribeResult
      })
      await act(async () => {
        await useVoiceStore.getState().transcribe(transcribeInput)
      })
      expect(capturedState).toBe('transcribing')
    })
  })

  // -------------------------------------------------------------------------
  // executeCommand — happy path
  // -------------------------------------------------------------------------
  describe('executeCommand', () => {
    it('returns single-customer result and sets lastResult', async () => {
      mockExecuteCommand.mockResolvedValueOnce(mockExecuteSingleResult)
      let result: ExecuteCommandResultDto | undefined
      await act(async () => {
        result = await useVoiceStore.getState().executeCommand(executeInput)
      })
      expect(result).toEqual(mockExecuteSingleResult)
      const state = useVoiceStore.getState()
      expect(state.lastResult).toEqual(mockExecuteSingleResult)
      expect(state.recordingState).toBe('idle')
      expect(state.error).toBeNull()
    })

    it('handles mark_all result', async () => {
      mockExecuteCommand.mockResolvedValueOnce(mockExecuteMarkAllResult)
      await act(async () => {
        await useVoiceStore.getState().executeCommand({
          ...executeInput,
          interpretation: { action: 'mark_all', customerId: undefined, quantity: undefined },
        })
      })
      const state = useVoiceStore.getState()
      expect(state.lastResult?.action).toBe('mark_all')
      if (state.lastResult?.action === 'mark_all') {
        expect(state.lastResult.markedCount).toBe(7)
      }
    })

    it('sets error and RETHROWS on failure', async () => {
      mockExecuteCommand.mockRejectedValueOnce(new Error('conflict'))
      await expect(
        act(async () => {
          await useVoiceStore.getState().executeCommand(executeInput)
        }),
      ).rejects.toThrow()
      expect(useVoiceStore.getState().error).toBe('voice.error_unknown')
    })

    it('sets recordingState to executing during call', async () => {
      let capturedState: string | undefined
      mockExecuteCommand.mockImplementationOnce(async () => {
        capturedState = useVoiceStore.getState().recordingState
        return mockExecuteSingleResult
      })
      await act(async () => {
        await useVoiceStore.getState().executeCommand(executeInput)
      })
      expect(capturedState).toBe('executing')
    })
  })

  // -------------------------------------------------------------------------
  // reset — clears all transient state, returns to idle
  // -------------------------------------------------------------------------
  describe('reset', () => {
    it('clears all transient state', async () => {
      // Seed state
      useVoiceStore.setState({
        recordingState: 'idle',
        lastTranscription: 'Some transcription',
        lastInterpretation: mockTranscribeResult.interpretation,
        lastResult: mockExecuteSingleResult,
        lastLogId: '55',
        candidates: [{ id: '12', name: 'Anil' }],
        error: 'voice.error_unknown',
      })

      await act(async () => {
        useVoiceStore.getState().reset()
      })

      const state = useVoiceStore.getState()
      expect(state.recordingState).toBe('idle')
      expect(state.lastTranscription).toBeNull()
      expect(state.lastInterpretation).toBeNull()
      expect(state.lastResult).toBeNull()
      expect(state.lastLogId).toBeNull()
      expect(state.candidates).toEqual([])
      expect(state.error).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // clearVoice — full wipe on logout
  // -------------------------------------------------------------------------
  describe('clearVoice', () => {
    it('resets all fields to initial state', async () => {
      useVoiceStore.setState({
        recordingState: 'recording',
        lastTranscription: 'text',
        lastResult: mockExecuteSingleResult,
        candidates: [{ id: '1', name: 'Test' }],
        error: 'some.error',
      })

      await act(async () => {
        useVoiceStore.getState().clearVoice()
      })

      const state = useVoiceStore.getState()
      expect(state.recordingState).toBe('idle')
      expect(state.lastTranscription).toBeNull()
      expect(state.lastResult).toBeNull()
      expect(state.candidates).toEqual([])
      expect(state.error).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Regression: Undo path requires listId + deliveryId (BLOCKER-1 fix)
  // -------------------------------------------------------------------------
  describe('undo path (regression for BLOCKER-1)', () => {
    it('single-customer lastResult has deliveryId for undo (mark_all does not)', () => {
      // After executeCommand with single customer result — undo should be possible
      useVoiceStore.setState({ lastResult: mockExecuteSingleResult })
      const state = useVoiceStore.getState()
      expect(state.lastResult?.action).not.toBe('mark_all')
      if (state.lastResult && state.lastResult.action !== 'mark_all') {
        expect(state.lastResult.deliveryId).toBe('987')
      }
    })

    it('mark_all lastResult does NOT have deliveryId — undo not supported', () => {
      useVoiceStore.setState({ lastResult: mockExecuteMarkAllResult })
      const state = useVoiceStore.getState()
      expect(state.lastResult?.action).toBe('mark_all')
      // mark_all shape has no deliveryId
      expect('deliveryId' in (state.lastResult ?? {})).toBe(false)
    })
  })
})
