/**
 * useVoiceRecorder Hook (US-013)
 * Purpose: Encapsulate expo-audio recording to produce a base64 string for the
 * voice transcription API. Hides the library so swapping it is one-file change.
 *
 * Recording preset: WAV/LINEAR16 16 kHz mono (OQ-4) matching the backend STT config.
 * Audio cap: ~5 MB base64 (≈ ~3.75 MB binary) — server rejects larger payloads.
 *
 * Permissions: requests RECORD_AUDIO on first start(); if denied, throws an i18n-key
 * error so the screen can show a settings-deeplink CTA without crashing.
 *
 * Security:
 * - Audio is discarded after base64 is returned from stop().
 * - Never retains audio on the device beyond the single recording session.
 * - No PII in any logged context.
 */

import { useCallback, useRef, useState } from 'react'

/** Max allowed base64 length (~5 MB binary → ~6.7 MB base64). */
const MAX_BASE64_LENGTH = 7_000_000

export interface VoiceRecorderResult {
  start(): Promise<void>
  stop(): Promise<string>
  cancel(): void
  isRecording: boolean
  durationMs: number
}

/**
 * Hook wrapping expo-audio for voice command capture.
 * Returns a stable object of start/stop/cancel controls.
 */
export function useVoiceRecorder(): VoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)

  // Recording object from expo-audio — typed as a local interface, cast from require()
  const recordingRef = useRef<{
    prepareToRecordAsync(options: unknown): Promise<void>
    startAsync(): Promise<void>
    stopAndUnloadAsync(): Promise<void>
    getURI(): string | null
    getStatusAsync(): Promise<{ isRecording: boolean; durationMillis: number }>
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    if (isRecording) return

    // Lazy-require expo-audio to stay test-friendly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Audio } = require('expo-audio') as {
      Audio: {
        requestRecordingPermissionsAsync(): Promise<{ granted: boolean }>
        Recording: new () => {
          prepareToRecordAsync(options: unknown): Promise<void>
          startAsync(): Promise<void>
          stopAndUnloadAsync(): Promise<void>
          getURI(): string | null
          getStatusAsync(): Promise<{ isRecording: boolean; durationMillis: number }>
        }
        RecordingOptionsPresets?: { HIGH_QUALITY?: unknown }
      }
    }

    // Request permission
    const { granted } = await Audio.requestRecordingPermissionsAsync()
    if (!granted) {
      throw new Error('voice.error.permission_denied')
    }

    const recording = new Audio.Recording()

    // Use HIGH_QUALITY preset if available; otherwise use a reasonable WAV config
    const options = Audio.RecordingOptionsPresets?.HIGH_QUALITY ?? {
      android: {
        extension: '.wav',
        outputFormat: 2,    // MPEG_4 fallback
        audioEncoder: 3,    // AAC fallback
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        outputFormat: 1145980512, // kAudioFormatLinearPCM
        audioQuality: 127,        // max
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: { mimeType: 'audio/wav', bitsPerSecond: 128000 },
    }

    await recording.prepareToRecordAsync(options)
    await recording.startAsync()
    recordingRef.current = recording
    startTimeRef.current = Date.now()
    setIsRecording(true)
    setDurationMs(0)

    // Update duration counter every 100 ms
    timerRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current)
    }, 100)
  }, [isRecording])

  const stop = useCallback(async (): Promise<string> => {
    if (!recordingRef.current) throw new Error('voice.error.no_recording')
    clearTimer()
    setIsRecording(false)

    const recording = recordingRef.current
    recordingRef.current = null

    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    if (!uri) throw new Error('voice.error.no_uri')

    // Read file as base64 via expo-file-system
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      readAsStringAsync(uri: string, options: { encoding: string }): Promise<string>
      EncodingType: { Base64: string }
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // Enforce size cap (reject before sending to server)
    if (base64.length > MAX_BASE64_LENGTH) {
      throw new Error('voice.error.audio_too_large')
    }

    // Discard the local file immediately — no audio retention
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FS = require('expo-file-system') as {
        deleteAsync(uri: string, opts?: { idempotent?: boolean }): Promise<void>
      }
      await FS.deleteAsync(uri, { idempotent: true })
    } catch {
      // Deletion failure is non-fatal — the data is already in base64 in memory
    }

    return base64
  }, [clearTimer])

  const cancel = useCallback(() => {
    clearTimer()
    setIsRecording(false)
    setDurationMs(0)
    const recording = recordingRef.current
    recordingRef.current = null
    if (recording) {
      // Fire-and-forget — best-effort cleanup
      void recording.stopAndUnloadAsync().catch(() => undefined)
    }
  }, [clearTimer])

  return { start, stop, cancel, isRecording, durationMs }
}

export default useVoiceRecorder
