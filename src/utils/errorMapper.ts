/**
 * Error Mapper Utility
 * Purpose: Map API and network errors to i18n translation keys
 * Usage: import { mapApiError } from '@utils/errorMapper'
 */

import axios from 'axios'

/**
 * Maps an unknown API error to an i18n translation key.
 * Screens should call t(mapApiError(err)) to display a translated error message.
 */
export function mapApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    // Network error (no response) = offline
    if (!err.response) return 'common.offline_message'

    const status = err.response.status
    const code: unknown = err.response.data?.error?.code ?? err.response.data?.code

    // Map known error codes from paycycle_api
    if (typeof code === 'string') {
      if (code === 'INVALID_CREDENTIALS') return 'auth.invalid_credentials'
      if (code === 'PHONE_ALREADY_REGISTERED') return 'auth.phone_already_registered'
      if (code === 'USER_NOT_FOUND') return 'auth.invalid_credentials'
      if (code === 'INVALID_OTP') return 'validation.otp_invalid'
      if (code === 'OTP_EXPIRED') return 'auth.otp_expired'
      if (code === 'INVALID_RESET_TOKEN') return 'auth.reset_token_invalid'
    }

    if (status === 401) return 'auth.invalid_credentials'
    if (status === 409) return 'auth.phone_already_registered'
    if (status === 422) return 'validation.required'
    if (status >= 500) return 'errors.server_error'

    return 'common.error'
  }

  // Error messages that are already i18n keys (thrown by mock service)
  if (err instanceof Error && (err.message.startsWith('auth.') || err.message.startsWith('validation.') || err.message.startsWith('common.'))) {
    return err.message
  }

  return 'common.error'
}
