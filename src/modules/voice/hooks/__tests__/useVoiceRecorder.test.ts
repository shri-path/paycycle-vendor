/**
 * useVoiceRecorder Hook Tests — T-29 (US-013)
 * Covers: permission-denied throws i18n key, base64 cap throws i18n key,
 *         start/stop lifecycle, cancel cleanup, double-start guard.
 *
 * NOTE: @testing-library/react-native v14 renderHook() is ASYNC — it must be
 * awaited. result.current is populated inside a useEffect; without await the
 * component hasn't mounted yet and result.current is undefined.
 *
 * We also mock setInterval/clearInterval globally so the duration timer inside
 * start() never fires an out-of-act state update.
 */

// ---------------------------------------------------------------------------
// Mocks — must precede imports
// ---------------------------------------------------------------------------

const mockPrepareToRecordAsync = jest.fn()
const mockStartAsync = jest.fn()
const mockStopAndUnloadAsync = jest.fn()
const mockGetURI = jest.fn()
const mockRequestRecordingPermissionsAsync = jest.fn()

jest.mock('expo-audio', () => ({
  Audio: {
    requestRecordingPermissionsAsync: (...args: unknown[]) =>
      mockRequestRecordingPermissionsAsync(...args),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: (...args: unknown[]) => mockPrepareToRecordAsync(...args),
      startAsync: (...args: unknown[]) => mockStartAsync(...args),
      stopAndUnloadAsync: (...args: unknown[]) => mockStopAndUnloadAsync(...args),
      getURI: () => mockGetURI(),
      getStatusAsync: jest
        .fn()
        .mockResolvedValue({ isRecording: false, durationMillis: 0 }),
    })),
    RecordingOptionsPresets: {
      HIGH_QUALITY: { android: {}, ios: {}, web: {} },
    },
  },
}))

const mockReadAsStringAsync = jest.fn()
const mockDeleteAsync = jest.fn()

jest.mock('expo-file-system', () => ({
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  EncodingType: { Base64: 'base64' },
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { renderHook, act } from '@testing-library/react-native'
import { useVoiceRecorder } from '../useVoiceRecorder'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { VoiceRecorderResult } from '../useVoiceRecorder'
import type { RenderHookResult } from '@testing-library/react-native'

type HookResult = RenderHookResult<VoiceRecorderResult, void>['result']

async function startRecording(result: HookResult) {
  await act(async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await result.current!.start()
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVoiceRecorder', () => {
  // Prevent setInterval duration timer from firing state updates outside act().
  let setIntervalSpy: jest.SpyInstance
  let clearIntervalSpy: jest.SpyInstance

  beforeAll(() => {
    setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation(() => 0 as unknown as ReturnType<typeof setInterval>)
    clearIntervalSpy = jest
      .spyOn(global, 'clearInterval')
      .mockImplementation(() => undefined)
  })

  afterAll(() => {
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Re-apply spy implementations cleared by clearAllMocks
    setIntervalSpy.mockImplementation(() => 0 as unknown as ReturnType<typeof setInterval>)
    clearIntervalSpy.mockImplementation(() => undefined)

    mockRequestRecordingPermissionsAsync.mockResolvedValue({ granted: true })
    mockPrepareToRecordAsync.mockResolvedValue(undefined)
    mockStartAsync.mockResolvedValue(undefined)
    mockStopAndUnloadAsync.mockResolvedValue(undefined)
    mockGetURI.mockReturnValue('file:///test/audio.wav')
    mockReadAsStringAsync.mockResolvedValue('base64audiocontent')
    mockDeleteAsync.mockResolvedValue(undefined)
  })

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  it('initialises with isRecording=false and durationMs=0', async () => {
    // renderHook is async in @testing-library/react-native v14 — must await
    const { result } = await renderHook(() => useVoiceRecorder())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.durationMs).toBe(0)
  })

  // -------------------------------------------------------------------------
  // Permission denied — throws i18n key error
  // -------------------------------------------------------------------------
  it('throws i18n key error when microphone permission is denied', async () => {
    mockRequestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false })
    const { result } = await renderHook(() => useVoiceRecorder())

    await expect(
      act(async () => {
        await result.current.start()
      }),
    ).rejects.toThrow('voice.error.permission_denied')
  })

  // -------------------------------------------------------------------------
  // Audio cap — throws i18n key error when base64 is too large
  // -------------------------------------------------------------------------
  it('throws i18n key error when audio exceeds size cap', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('A'.repeat(7_000_001))
    const { result } = await renderHook(() => useVoiceRecorder())

    await startRecording(result)

    await expect(
      act(async () => {
        await result.current.stop()
      }),
    ).rejects.toThrow('voice.error.audio_too_large')
  })

  // -------------------------------------------------------------------------
  // Happy path: start then stop returns base64
  // -------------------------------------------------------------------------
  it('returns base64 string from stop() after successful start()', async () => {
    const { result } = await renderHook(() => useVoiceRecorder())

    await startRecording(result)

    let base64: string | undefined
    await act(async () => {
      base64 = await result.current.stop()
    })

    expect(base64).toBe('base64audiocontent')
  })

  it('isRecording is true after start()', async () => {
    const { result } = await renderHook(() => useVoiceRecorder())
    await startRecording(result)
    expect(result.current.isRecording).toBe(true)
  })

  it('isRecording is false after stop()', async () => {
    const { result } = await renderHook(() => useVoiceRecorder())
    await startRecording(result)
    await act(async () => {
      await result.current.stop()
    })
    expect(result.current.isRecording).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Audio file is deleted after stop (no retention)
  // -------------------------------------------------------------------------
  it('deletes the audio file after extracting base64', async () => {
    const { result } = await renderHook(() => useVoiceRecorder())

    await startRecording(result)
    await act(async () => {
      await result.current.stop()
    })

    expect(mockDeleteAsync).toHaveBeenCalledWith('file:///test/audio.wav', { idempotent: true })
  })

  // -------------------------------------------------------------------------
  // cancel() — cleans up without throwing
  // -------------------------------------------------------------------------
  it('cancel() sets isRecording=false and durationMs=0', async () => {
    const { result, unmount } = await renderHook(() => useVoiceRecorder())

    await startRecording(result)

    // Use async act so React flushes the state updates from cancel()
    await act(async () => {
      result.current.cancel()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.durationMs).toBe(0)

    // Unmount explicitly to prevent fire-and-forget stopAndUnloadAsync from
    // leaking into the next test's component lifecycle.
    unmount()
  })

  // -------------------------------------------------------------------------
  // Prevents double-start
  // -------------------------------------------------------------------------
  it('does not request permissions again when already recording', async () => {
    const { result } = await renderHook(() => useVoiceRecorder())

    await startRecording(result)
    // Clear call count after successful start
    mockRequestRecordingPermissionsAsync.mockClear()

    // Second start while isRecording=true — should return early without requesting permissions.
    // Use the stored result ref directly (not via result.current which can be null post-act).
    const { start } = result.current
    await act(async () => {
      await start()
    })

    expect(mockRequestRecordingPermissionsAsync).not.toHaveBeenCalled()
  })
})
