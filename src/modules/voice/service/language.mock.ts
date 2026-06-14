/**
 * Language Service Mock Fixtures (US-013)
 * Realistic data for development / test mode.
 */

import type { LanguagePreferencesDto } from '../../../types/voice'

export const mockLanguagePreferences: LanguagePreferencesDto = {
  appLanguage: 'hi',
  secondaryLanguage: 'en',
  voiceCommandsEnabled: true,
  voiceResponsesEnabled: false,
  transliterationEnabled: true,
  billLanguageDefault: 'customer',
  preferredVoiceAccent: null,
}
