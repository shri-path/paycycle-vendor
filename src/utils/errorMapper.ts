/**
 * Error Mapper Utility
 * Purpose: Map API and network errors to i18n translation keys
 * Usage: import { mapApiError } from '@utils/errorMapper'
 *
 * An optional `context` disambiguates status codes that mean different things on
 * different surfaces (e.g. a 404 on the staff-join screen is an invalid invite,
 * whereas a 404 on the staff list is a missing staff member). Existing callers
 * pass no context and keep their behaviour.
 */

import axios from 'axios'

/** Surface that produced the error — lets the mapper resolve ambiguous codes. */
export type ApiErrorContext = 'invite_accept' | 'role' | 'staff' | 'invite'

/**
 * Maps an unknown API error to an i18n translation key.
 * Screens should call t(mapApiError(err)) to display a translated error message.
 */
export function mapApiError(err: unknown, context?: ApiErrorContext): string {
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
      // Roles & Access Control (US-002)
      if (code === 'SUBSCRIPTION_LIMIT') return 'roles.error_staff_limit'
    }

    // Roles surfaces — resolve shared status codes by the calling surface.
    if (context === 'invite_accept') {
      if (status === 404) return 'roles.error_invite_invalid'
      if (status === 422) return 'roles.error_invite_expired'
    }
    if (context === 'invite') {
      if (status === 409) return 'roles.error_already_staff'
      if (status === 451) return 'roles.error_staff_limit'
    }
    if (context === 'role') {
      if (status === 404) return 'roles.error_no_membership'
      if (status === 403) return 'roles.error_forbidden'
    }
    if (context === 'staff') {
      if (status === 404) return 'roles.error_staff_not_found'
      if (status === 403) return 'roles.error_forbidden'
    }

    if (status === 401) return 'auth.invalid_credentials'
    if (status === 403) return 'roles.error_forbidden'
    if (status === 409) return 'auth.phone_already_registered'
    if (status === 451) return 'roles.error_staff_limit'
    if (status === 422) return 'validation.required'
    if (status >= 500) return 'errors.server_error'

    return 'common.error'
  }

  // Error messages that are already i18n keys (thrown by mock service)
  if (
    err instanceof Error &&
    (err.message.startsWith('auth.') ||
      err.message.startsWith('validation.') ||
      err.message.startsWith('roles.') ||
      err.message.startsWith('common.'))
  ) {
    return err.message
  }

  return 'common.error'
}
