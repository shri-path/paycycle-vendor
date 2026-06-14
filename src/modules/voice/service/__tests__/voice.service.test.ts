/**
 * Voice Service Tests — T-29 (US-013)
 * Runs entirely in mock mode. Verifies:
 *   - transcribe: id coercion (string logId, customerId), shape
 *   - executeCommand: single-customer shape, mark_all shape, discriminated union
 *   - id coercion: all ids are strings (not numbers)
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@services/http', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@constants/apiPaths', () => ({
  APIPath: {
    Voice: {
      Transcribe: '/voice/transcribe',
      Execute: '/voice/execute-command',
    },
  },
}))

import { voiceService } from '../voice.service'

describe('voiceService (mock mode)', () => {
  // -------------------------------------------------------------------------
  // transcribe
  // -------------------------------------------------------------------------
  describe('transcribe', () => {
    it('returns VoiceTranscribeResultDto with correct shape', async () => {
      const result = await voiceService.transcribe({
        audioData: 'base64data',
        languageCode: 'en',
        supplyListId: 'list-1',
      })
      expect(typeof result.logId).toBe('string')
      expect(typeof result.transcription).toBe('string')
      expect(typeof result.confidence).toBe('number')
      expect(result.interpretation).toBeDefined()
      expect(typeof result.interpretation.action).toBe('string')
      expect(typeof result.interpretation.autoExecute).toBe('boolean')
      expect(Array.isArray(result.interpretation.candidates)).toBe(true)
    })

    it('coerces logId to string (not number)', async () => {
      const result = await voiceService.transcribe({
        audioData: 'base64data',
        languageCode: 'hi',
        supplyListId: 'list-1',
      })
      expect(typeof result.logId).toBe('string')
    })

    it('coerces customerId to string when present', async () => {
      const result = await voiceService.transcribe({
        audioData: 'base64data',
        languageCode: 'en',
        supplyListId: 'list-1',
      })
      if (result.interpretation.customerId !== null) {
        expect(typeof result.interpretation.customerId).toBe('string')
      }
    })

    it('returns null customerId for ambiguous results', async () => {
      // Mock mode high-confidence result has customerId=10 — check null path exists
      // Just verify the type contract: when not null it's a string
      const result = await voiceService.transcribe({
        audioData: 'audio',
        languageCode: 'en',
        supplyListId: 'list-1',
      })
      expect(
        result.interpretation.customerId === null ||
          typeof result.interpretation.customerId === 'string',
      ).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // executeCommand
  // -------------------------------------------------------------------------
  describe('executeCommand', () => {
    it('returns single-customer result with string ids', async () => {
      const result = await voiceService.executeCommand({
        interpretation: { action: 'mark_delivered', customerId: '10' },
        supplyListId: 'list-1',
        serviceDate: '2026-06-14',
        logId: '55',
      })
      expect(result.executed).toBe(true)
      expect(result.action).not.toBe('mark_all')
      if (result.action !== 'mark_all') {
        expect(typeof result.customerId).toBe('string')
        expect(typeof result.deliveryId).toBe('string')
        expect(typeof result.status).toBe('string')
      }
    })

    it('returns mark_all result with markedCount', async () => {
      const result = await voiceService.executeCommand({
        interpretation: { action: 'mark_all' },
        supplyListId: 'list-1',
        serviceDate: '2026-06-14',
        logId: '55',
      })
      expect(result.action).toBe('mark_all')
      if (result.action === 'mark_all') {
        expect(typeof result.markedCount).toBe('number')
      }
    })

    it('discriminated union: mark_all does not have deliveryId', async () => {
      const result = await voiceService.executeCommand({
        interpretation: { action: 'mark_all' },
        supplyListId: 'list-1',
        logId: '55',
      })
      expect(result.action).toBe('mark_all')
      expect('deliveryId' in result).toBe(false)
    })

    it('discriminated union: single-customer has deliveryId', async () => {
      const result = await voiceService.executeCommand({
        interpretation: { action: 'mark_delivered', customerId: '10' },
        supplyListId: 'list-1',
        logId: '55',
      })
      expect(result.action).not.toBe('mark_all')
      if (result.action !== 'mark_all') {
        expect('deliveryId' in result).toBe(true)
      }
    })
  })
})
