/**
 * Language Service (US-013)
 * Purpose: API calls for language preferences (self-scoped to authenticated user).
 *
 * Security: userId in path must equal authenticated user — never from params/UI.
 * Envelope: standard paycycle_api envelope data.data.
 * All ids are strings.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type { LanguagePreferencesDto, UpdateLanguagePreferencesDto } from '../../../types/voice'
import { mockLanguagePreferences } from './language.mock'

export const languageService = {
  /**
   * GET /users/:userId/language-preferences
   * Self-scoped: returns defaults if never saved.
   */
  async getPreferences(userId: string): Promise<LanguagePreferencesDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockLanguagePreferences }
    }
    const { data } = await httpClient.get(APIPath.Users.LanguagePreferences(userId))
    return data.data as LanguagePreferencesDto
  },

  /**
   * PATCH /users/:userId/language-preferences
   * Upsert: only supplied fields change. Returns full preferences.
   */
  async updatePreferences(
    userId: string,
    patch: UpdateLanguagePreferencesDto,
  ): Promise<LanguagePreferencesDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockLanguagePreferences, ...patch }
    }
    const { data } = await httpClient.patch(
      APIPath.Users.LanguagePreferences(userId),
      patch,
    )
    return data.data as LanguagePreferencesDto
  },
}

export default languageService
