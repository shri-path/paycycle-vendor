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

/** Full vendor settings payload — GET /vendors/:v/settings. */
export interface VendorSettingsDto {
  autoMarkEnabled: boolean
  autoSendBillsEnabled: boolean
  /** "HH:mm" 24h time string, e.g. "20:00" */
  autoSendBillsTime: string
  defaultCreditLimit: number
  defaultCreditAction: CreditBreachAction
  notificationPreferences: NotificationPreferencesDto
}

// ---------------------------------------------------------------------------
// Bulk mark leave
// ---------------------------------------------------------------------------

export interface BulkLeaveInput {
  /** Present when scope = single list */
  supplyListId?: string
  /** Present when customer scope = specific */
  customerIds?: string[]
  startDate: string    // "YYYY-MM-DD"
  endDate: string      // "YYYY-MM-DD"
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

export interface BulkRateInput {
  scope: RateScope
  supplyListId?: string
  supplyType?: string
  newRate: number
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

export interface BulkReminderInput {
  targetType: ReminderTarget
  customerIds?: string[]
  customMessage?: string
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
