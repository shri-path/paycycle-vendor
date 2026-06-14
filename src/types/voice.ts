/**
 * Voice & Language Types (US-013)
 * Purpose: DTOs matching the API_SPEC exactly for multi-language & voice interface.
 * All numeric ids from the API are coerced to string in the service layer.
 * Re-exports SupportedLanguage from locales so callers use a single source.
 */

export type { SupportedLanguage } from '@locales/index'

// ---------------------------------------------------------------------------
// Enumerations (mirror API_SPEC enumerations section)
// ---------------------------------------------------------------------------

export type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'kn' | 'ml' | 'gu'

export type BillLanguageDefault = 'customer' | 'my_language' | 'english'

export type TemplateType =
  | 'payment_reminder'
  | 'monthly_bill'
  | 'delivery_confirmation'
  | 'leave_confirmation'

export type VoiceAction =
  | 'mark_delivered'
  | 'mark_leave'
  | 'mark_all'
  | 'adjust_quantity'
  | 'unknown'

// ---------------------------------------------------------------------------
// Language Preferences (§1)
// ---------------------------------------------------------------------------

export interface LanguagePreferencesDto {
  appLanguage: LanguageCode
  secondaryLanguage: LanguageCode | null
  voiceCommandsEnabled: boolean
  voiceResponsesEnabled: boolean
  transliterationEnabled: boolean
  billLanguageDefault: BillLanguageDefault
  preferredVoiceAccent: string | null
}

export type UpdateLanguagePreferencesDto = Partial<LanguagePreferencesDto>

// ---------------------------------------------------------------------------
// Message Templates (§2)
// ---------------------------------------------------------------------------

export interface MessageTemplateDto {
  id: string
  templateType: TemplateType
  languageCode: LanguageCode
  content: string
  placeholders: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SaveMessageTemplateDto {
  templateType: TemplateType
  languageCode: LanguageCode
  content: string
}

export interface PreviewTemplateDto {
  templateType: TemplateType
  languageCode: LanguageCode
  content?: string
  sampleData?: Record<string, string>
}

export interface PreviewTemplateResultDto {
  preview: string
  unresolved: string[]
}

// ---------------------------------------------------------------------------
// Voice Commands (§3)
// ---------------------------------------------------------------------------

export interface VoiceCandidateDto {
  id: string
  name: string
}

export interface VoiceInterpretationDto {
  action: VoiceAction
  customerId: string | null
  customerName: string | null
  quantity: number | null
  confidence: number
  autoExecute: boolean
  candidates: VoiceCandidateDto[]
}

export interface VoiceTranscribeResultDto {
  logId: string
  transcription: string
  confidence: number
  interpretation: VoiceInterpretationDto
}

/**
 * The subset of an interpretation that execute-command accepts.
 * `action` cannot be 'unknown'.
 */
export interface ExecutableInterpretation {
  action: Exclude<VoiceAction, 'unknown'>
  customerId?: string
  quantity?: number
}

export interface ExecuteCommandInput {
  interpretation: ExecutableInterpretation
  supplyListId: string
  serviceDate?: string
  logId?: string
}

/**
 * Discriminated union based on action shape returned by execute-command.
 */
export type ExecuteCommandResultDto =
  | { executed: true; action: 'mark_all'; markedCount: number }
  | {
      executed: true
      action: Exclude<VoiceAction, 'unknown' | 'mark_all'>
      customerId: string
      customerName: string
      deliveryId: string
      status: string
    }
