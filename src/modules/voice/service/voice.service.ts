/**
 * Voice Service (US-013)
 * Purpose: API calls for voice transcription and command execution.
 *
 * Audio is sent as base64 JSON (not multipart — see API_SPEC §3.1).
 * All ids are strings.
 * Errors bubble up; stores map them via mapApiError(_, 'voice', action).
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  VoiceTranscribeResultDto,
  ExecuteCommandInput,
  ExecuteCommandResultDto,
  LanguageCode,
} from '../../../types/voice'
import {
  mockTranscribeHighConfidence,
  mockExecuteSingleResult,
} from './voice.mock'

export interface TranscribeInput {
  audioData: string
  languageCode: LanguageCode
  supplyListId: string
  serviceDate?: string
}

export const voiceService = {
  /**
   * POST /voice/transcribe
   * Sends base64 audio; receives transcription + interpretation.
   * Does NOT change delivery state.
   */
  async transcribe(input: TranscribeInput): Promise<VoiceTranscribeResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const result = { ...mockTranscribeHighConfidence }
      return {
        ...result,
        logId: String(result.logId),
        interpretation: {
          ...result.interpretation,
          customerId: result.interpretation.customerId
            ? String(result.interpretation.customerId)
            : null,
        },
      }
    }
    const { data } = await httpClient.post(APIPath.Voice.Transcribe, {
      audioData: input.audioData,
      languageCode: input.languageCode,
      supplyListId: String(input.supplyListId),
      ...(input.serviceDate ? { serviceDate: input.serviceDate } : {}),
    })
    const dto = data.data as VoiceTranscribeResultDto
    return {
      ...dto,
      logId: String(dto.logId),
      interpretation: {
        ...dto.interpretation,
        customerId: dto.interpretation.customerId
          ? String(dto.interpretation.customerId)
          : null,
        candidates: (dto.interpretation.candidates ?? []).map((c) => ({
          ...c,
          id: String(c.id),
        })),
      },
    }
  },

  /**
   * POST /voice/execute-command
   * Execute a previously interpreted command. Mutates delivery state.
   * Returns discriminated ExecuteCommandResultDto.
   */
  async executeCommand(input: ExecuteCommandInput): Promise<ExecuteCommandResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      if (input.interpretation.action === 'mark_all') {
        return { executed: true, action: 'mark_all', markedCount: 7 }
      }
      const result = { ...mockExecuteSingleResult }
      if (result.action !== 'mark_all' && input.interpretation.customerId) {
        return { ...result, customerId: String(input.interpretation.customerId) }
      }
      return result
    }
    const body = {
      interpretation: {
        action: input.interpretation.action,
        ...(input.interpretation.customerId
          ? { customerId: String(input.interpretation.customerId) }
          : {}),
        ...(input.interpretation.quantity != null
          ? { quantity: input.interpretation.quantity }
          : {}),
      },
      supplyListId: String(input.supplyListId),
      ...(input.serviceDate ? { serviceDate: input.serviceDate } : {}),
      ...(input.logId ? { logId: String(input.logId) } : {}),
    }
    const { data } = await httpClient.post(APIPath.Voice.Execute, body)
    const dto = data.data as ExecuteCommandResultDto
    if (dto.action === 'mark_all') return dto
    return { ...dto, customerId: String(dto.customerId), deliveryId: String(dto.deliveryId) }
  },
}

export default voiceService
