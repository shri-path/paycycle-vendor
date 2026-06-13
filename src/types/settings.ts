/**
 * Settings Type Definitions (US-011)
 *
 * All shapes frozen against the US-011 API contract in
 * `project_documents/vendor_app/user_stories/US-011-vendor-settings.md`.
 *
 * Conventions:
 * - All ids are strings.
 * - Money values are numbers (INR).
 * - Times are "HH:mm" 24h strings.
 * - Dates are "YYYY-MM-DD" strings.
 * - `vendorId` is NEVER sent from the client — it is JWT-derived on the server.
 */

// ---------------------------------------------------------------------------
// Credit breach action
// ---------------------------------------------------------------------------

/** What the system does when a customer breaches their credit limit. */
export type CreditBreachAction = 'warn' | 'pause' | 'block'

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export interface NotificationPreferencesDto {
  channels: {
    push: boolean
    whatsapp: boolean
    sms: boolean
  }
  payment: {
    paymentReceived: boolean
    outstandingAlert: boolean
    creditLimitBreach: boolean
  }
  customer: {
    customerMarkedLeave: boolean
    customerAdjustedQty: boolean
    newCustomerJoined: boolean
    customerOverride: boolean
  }
  operations: {
    lowStockAlert: boolean
    staffActivitySummary: boolean
    dailyDigest: boolean
  }
}

// ---------------------------------------------------------------------------
// Vendor settings
// ---------------------------------------------------------------------------

/**
 * Full vendor settings payload — GET /vendors/:v/settings.
 *
 * API spec (§1 API_SPEC.md) returns:
 *   autoMarkEnabled, autoSendBillsEnabled, autoSendBillsTime,
 *   defaultCreditLimit, defaultCreditPeriodDays,
 *   bulkOperationConcurrencyLimit, notificationPreferences,
 *   id, vendorId, createdAt, updatedAt.
 *
 * Note on `defaultCreditAction`: this field is a frontend UX concern modelled from
 * the user story (warn/pause/block breach behaviour). It is NOT currently returned
 * by the v1 backend spec. It is kept here so the DefaultCreditSection continues to
 * compile; confirm with the backend whether this field will be added in a later
 * sprint or if it should be removed. Track as tech-debt.
 */
export interface VendorSettingsDto {
  autoMarkEnabled: boolean
  autoSendBillsEnabled: boolean
  /** "HH:mm" 24h time string, e.g. "20:00" */
  autoSendBillsTime: string
  defaultCreditLimit: number
  /**
   * Number of credit days extended to customers by default (1–365).
   * Present in the API spec (§1) as `defaultCreditPeriodDays`.
   */
  defaultCreditPeriodDays?: number
  /**
   * Frontend-only UX field — not yet in the v1 API spec.
   * What the system does when a customer breaches their credit limit.
   * @see CreditBreachAction
   */
  defaultCreditAction: CreditBreachAction
  notificationPreferences: NotificationPreferencesDto
}

// ---------------------------------------------------------------------------
// Bulk mark leave
// ---------------------------------------------------------------------------

/**
 * UI form shape for bulk mark leave.
 *
 * The API wire shape (§3 API_SPEC.md) uses:
 *   { subscriptionIds?, all: boolean, date: "YYYY-MM-DD", reason? }
 *
 * This type captures the richer UI shape (multi-day range, supply list scoping).
 * The service layer maps this to the API wire shape in real mode.
 * `all` is set automatically by the service based on whether supplyListId and
 * customerIds are absent.
 */
export interface BulkLeaveInput {
  /** Present when scope = single list */
  supplyListId?: string
  /** Present when customer scope = specific */
  customerIds?: string[]
  startDate: string    // "YYYY-MM-DD"
  endDate: string      // "YYYY-MM-DD" (multi-day UI; v1 API uses startDate as the single date)
  reason?: string
}

export interface BulkLeaveImpactDto {
  customersAffected: number
  days: number
  totalLeaves: number
  revenueImpact: number
}

export interface BulkLeaveResultDto {
  operationId: string
  summary: BulkLeaveImpactDto
}

// ---------------------------------------------------------------------------
// Bulk adjust rate
// ---------------------------------------------------------------------------

export type RateScope = 'single_list' | 'all_lists_same_supply'

/**
 * UI form shape for bulk adjust rate.
 *
 * The API wire shape (§4 API_SPEC.md) uses:
 *   { subscriptionIds?, all: boolean, newRate: number,
 *     effectiveDate: "YYYY-MM-DD", notifyCustomers?: boolean }
 *
 * Note: the UI uses `effectiveFrom`; the API uses `effectiveDate`.
 * The service layer maps `effectiveFrom` → `effectiveDate` in real mode.
 */
export interface BulkRateInput {
  scope: RateScope
  supplyListId?: string
  supplyType?: string
  newRate: number
  /** Maps to `effectiveDate` in the API wire shape (§4 API_SPEC.md). */
  effectiveFrom: string     // "YYYY-MM-DD"
  notifyCustomers: boolean
}

export interface BulkRateImpactDto {
  listsAffected: number
  customersAffected: number
  rateChange: number
  monthlyImpact: number
}

export interface BulkRateResultDto {
  operationId: string
  summary: BulkRateImpactDto
}

// ---------------------------------------------------------------------------
// Bulk send reminders
// ---------------------------------------------------------------------------

export type ReminderTarget = 'overdue' | 'all_pending' | 'specific_customers'
export type ReminderChannel = 'whatsapp' | 'sms'

/**
 * UI form shape for bulk send reminders.
 *
 * The API wire shape (§5 API_SPEC.md) uses:
 *   { customerIds?, all: boolean, messageTemplate?: string }
 *
 * Notes:
 * - `customMessage` maps to `messageTemplate` in the API wire shape.
 * - `sendVia` is a UI-only field (channel selector); the v1 API does not
 *   accept a channel parameter (the backend determines delivery channel).
 * - `all`/`customerIds` are computed by the service from `targetType`.
 * The service layer performs all mappings in real mode.
 */
export interface BulkReminderInput {
  targetType: ReminderTarget
  customerIds?: string[]
  /** Maps to `messageTemplate` in the API wire shape (§5 API_SPEC.md). */
  customMessage?: string
  /** UI-only channel selector; not sent in the v1 API wire body. */
  sendVia: ReminderChannel
}

export interface BulkReminderResultDto {
  operationId: string
  summary: {
    totalSent: number
    delivered: number
    failed: number
  }
}
