/**
 * Voice Service Mock Fixtures (US-013)
 * Deterministic results for dev / test mode.
 * Includes: high-confidence mark_delivered, ambiguous, unknown action.
 */

import type { VoiceTranscribeResultDto, ExecuteCommandResultDto } from '../../../types/voice'

/** High-confidence auto-execute result for mark_delivered */
export const mockTranscribeHighConfidence: VoiceTranscribeResultDto = {
  logId: '55',
  transcription: 'शर्मा जी को दूध दे दिया',
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

/** Ambiguous result: multiple customers matched */
export const mockTranscribeAmbiguous: VoiceTranscribeResultDto = {
  logId: '56',
  transcription: 'अनिल को दे दिया',
  confidence: 72,
  interpretation: {
    action: 'mark_delivered',
    customerId: null,
    customerName: null,
    quantity: null,
    confidence: 72,
    autoExecute: false,
    candidates: [
      { id: '12', name: 'Anil Kumar' },
      { id: '18', name: 'Anil Sharma' },
    ],
  },
}

/** Unknown action result */
export const mockTranscribeUnknown: VoiceTranscribeResultDto = {
  logId: '57',
  transcription: 'कुछ समझ नहीं आया',
  confidence: 0,
  interpretation: {
    action: 'unknown',
    customerId: null,
    customerName: null,
    quantity: null,
    confidence: 0,
    autoExecute: false,
    candidates: [],
  },
}

/** Successful single-customer execute result */
export const mockExecuteSingleResult: ExecuteCommandResultDto = {
  executed: true,
  action: 'mark_delivered',
  customerId: '10',
  customerName: 'Sharma Family',
  deliveryId: '987',
  status: 'DELIVERED',
}

/** Successful mark_all result */
export const mockExecuteMarkAllResult: ExecuteCommandResultDto = {
  executed: true,
  action: 'mark_all',
  markedCount: 7,
}
