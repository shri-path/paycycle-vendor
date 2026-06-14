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
export type ApiErrorContext =
  | 'invite_accept'
  | 'role'
  | 'staff'
  | 'invite'
  | 'resend'
  | 'supply'
  | 'delivery'
  | 'customer'
  | 'audit'
  | 'subscription'
  | 'settings'
  | 'credit'

/**
 * Sub-action within the `'delivery'` context (US-006). Several delivery endpoints
 * share a status code but mean different things (a 400/422 on an extra-charge is an
 * invalid amount/comment, on mark/leave it is a validation error). The store passes
 * the action it invoked so the mapper resolves to the right i18n key.
 */
export type DeliveryErrorAction =
  | 'mark'
  | 'mark_bulk'
  | 'extra_charge'
  | 'create_leave'
  | 'cancel_leave'

/**
 * Sub-action within the `'supply'` context (US-005). Several supply endpoints share
 * a status code but mean different things (409 duplicate-name vs all-subscribed; the
 * three distinct 422s). The store passes the action it invoked so the mapper resolves
 * to the right i18n key. Omitted → generic supply mappings.
 */
export type SupplyErrorAction =
  | 'create'
  | 'update'
  | 'add_customers'
  | 'assign_staff'
  | 'update_subscription'

/**
 * Sub-action within the `'subscription'` context (US-009). Several subscription
 * endpoints share status codes that resolve to different i18n keys depending on the
 * action being performed (e.g. 422 on upgrade = not higher tier, on cancel = already
 * cancelled). The store passes the action so the mapper resolves correctly.
 */
export type SubscriptionErrorAction = 'upgrade' | 'renew' | 'cancel' | 'auto_renewal'

/**
 * Sub-action within the `'settings'` context (US-011). Several bulk-op endpoints
 * share status codes that resolve to different i18n keys depending on the action
 * (e.g. 400/422 on mark_leave vs adjust_rate means different things). The store
 * passes the action so the mapper resolves correctly.
 */
export type SettingsErrorAction = 'mark_leave' | 'adjust_rate' | 'send_reminders'

/**
 * Sub-action within the `'customer'` context (US-008). Customer endpoints share
 * status codes that resolve to different i18n keys depending on the action being
 * performed (e.g. 409 on create/update = duplicate phone, on add_subscription =
 * already subscribed; 422 on deactivate = already inactive, on remove_subscription =
 * subscription ended). The store passes the action so the mapper resolves correctly.
 */
export type CustomerErrorAction =
  | 'create'
  | 'update'
  | 'deactivate'
  | 'add_subscription'
  | 'remove_subscription'
  | 'record_payment'
  | 'set_credit_limit'

/**
 * Maps an unknown API error to an i18n translation key.
 * Screens should call t(mapApiError(err)) to display a translated error message.
 *
 * @param context Calling surface — disambiguates shared status codes.
 * @param action  Sub-action within the `'supply'` context (ignored otherwise).
 */
export function mapApiError(
  err: unknown,
  context?: ApiErrorContext,
  action?: SupplyErrorAction | DeliveryErrorAction | CustomerErrorAction | SubscriptionErrorAction | SettingsErrorAction,
): string {
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
    // Resend invitation (US-004): 422 = the invite is no longer pending (member joined).
    if (context === 'resend') {
      if (status === 422) return 'roles.error_resend_not_pending'
      if (status === 404) return 'roles.error_staff_not_found'
      if (status === 403) return 'roles.error_forbidden'
    }

    // Supply Lists surfaces (US-005) — resolve shared status codes by sub-action.
    if (context === 'supply') {
      if (status === 404) return 'supply.error_not_found'
      if (status === 403) return 'roles.error_forbidden'
      if (status === 409) {
        return action === 'add_customers'
          ? 'supply.error_all_already_subscribed'
          : 'supply.error_duplicate_name'
      }
      if (status === 422) {
        if (action === 'assign_staff') return 'supply.error_staff_not_assignable'
        if (action === 'add_customers') return 'supply.error_customer_not_in_vendor'
        if (action === 'update_subscription') return 'supply.error_invalid_sub_transition'
        return 'validation.required'
      }
    }

    // Delivery surfaces (US-006) — resolve shared status codes by sub-action.
    if (context === 'delivery') {
      if (status === 403) return 'roles.error_forbidden'
      if (status === 409) return 'delivery.error_conflict'
      if (status === 404) return 'delivery.error_not_found'
      if (status === 400 || status === 422) {
        return action === 'extra_charge'
          ? 'delivery.error_invalid_charge'
          : 'validation.required'
      }
    }

    // Customer surfaces (US-008) — resolve shared status codes by sub-action.
    if (context === 'customer') {
      if (status === 403) return 'roles.error_forbidden'
      if (status === 404) return 'customer.error_not_found'
      if (status === 409) {
        if (action === 'add_subscription') return 'customer.error_already_subscribed'
        // create and update both produce a duplicate phone 409
        return 'customer.error_duplicate_phone'
      }
      if (status === 422) {
        if (action === 'deactivate') return 'customer.error_already_inactive'
        if (action === 'remove_subscription') return 'customer.error_subscription_ended'
        if (action === 'record_payment') return 'customer.error_invalid_payment'
        return 'validation.required'
      }
      if (status === 400) {
        if (action === 'record_payment') return 'customer.error_invalid_payment'
        if (action === 'set_credit_limit') return 'customer.error_invalid_credit_limit'
        return 'validation.required'
      }
    }

    // Audit surfaces (US-007) — read-only; resolve shared status codes by meaning.
    if (context === 'audit') {
      if (status === 403) return 'roles.error_forbidden' // staff hit an owner-only endpoint
      if (status === 404) return 'audit.error_no_membership'
      if (status === 400 || status === 422) return 'audit.error_invalid_filter'
    }

    // Subscription surfaces (US-009) — resolve shared status codes by sub-action.
    if (context === 'subscription') {
      if (status === 403) return 'roles.error_forbidden' // staff hit owner-only manage action
      if (status === 404) return 'subscription.error_no_subscription'
      if (status === 422) {
        if (action === 'upgrade') return 'subscription.error_not_higher_tier'
        if (action === 'cancel') return 'subscription.error_already_cancelled'
        return 'validation.required'
      }
      if (status === 400) return 'validation.required' // bad billingCycle / autoRenewal
      if (status === 451) return 'subscription.error_limit_reached'
    }

    // Credit Control surfaces (US-012) — resolve shared status codes by meaning.
    if (context === 'credit') {
      if (status === 403) return 'roles.error_forbidden'
      if (status === 404) return 'credit.error_not_found'
      if (status === 409) return 'credit.error_already_prepaid'
      if (status === 429) return 'credit.error_rate_limited'
      if (status === 400 || status === 422) return 'validation.required'
    }

    // Settings surfaces (US-011) — resolve shared status codes by sub-action.
    if (context === 'settings') {
      if (status === 403) return 'roles.error_forbidden'
      if (status === 404) return 'settings.error_not_found'
      if (status === 413) return 'settings.error_too_many_items'
      if (status === 400 || status === 422) {
        if (action === 'mark_leave') return 'settings.error_invalid_leave'
        if (action === 'adjust_rate') return 'settings.error_invalid_rate'
        if (action === 'send_reminders') return 'settings.error_invalid_reminder'
        return 'validation.required'
      }
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
      err.message.startsWith('supply.') ||
      err.message.startsWith('delivery.') ||
      err.message.startsWith('customer.') ||
      err.message.startsWith('audit.') ||
      err.message.startsWith('subscription.') ||
      err.message.startsWith('settings.') ||
      err.message.startsWith('credit.') ||
      err.message.startsWith('common.'))
  ) {
    return err.message
  }

  return 'common.error'
}
