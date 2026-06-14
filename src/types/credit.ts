/**
 * Credit Control Type Definitions (US-012)
 *
 * All shapes frozen against the US-012 API contract in
 * `paycycle_api/docs/features/us-012-credit-control/API_SPEC.md`.
 *
 * Conventions:
 * - All ids are strings (coerce numeric ids from API: `String(id)`).
 * - Money fields are plain `number` (INR, 2-decimal).
 * - Dates are YYYY-MM-DD; months are YYYY-MM.
 * - Positive `outstanding`/`currentBalance` = customer owes the vendor.
 * - Negative balance = customer is in advance/credit.
 *
 * Security: vendorId is NEVER held on the client as a type field —
 * it appears only in request URL paths (JWT-derived on the server).
 */

// Re-export AgingBucket from dashboard so callers have a single source.
export type { AgingBucket } from './dashboard'

// ---------------------------------------------------------------------------
// Enums / union literals
// ---------------------------------------------------------------------------

export type CreditType = 'normal' | 'prepaid' | 'unlimited'
export type ActionOnBreach = 'warn' | 'pause' | 'block'
export type PrioritySort = 'oldest_first' | 'amount_desc' | 'utilization_desc' | 'score_asc'
export type BulkReminderTarget = 'all_overdue' | 'selected'
export type ReminderStatus = 'sent' | 'delivered' | 'failed'
export type ReminderSkipReason = 'already_paid' | 'duplicate_today'

// ---------------------------------------------------------------------------
// Collections dashboard — GET /vendors/:v/collections/dashboard
// ---------------------------------------------------------------------------

export interface AgingBucketEntry {
  amount: number
  customerCount: number
}

export interface OutstandingOverviewDto {
  totalOutstanding: number
  fresh_0_30: AgingBucketEntry
  overdue_30_60: AgingBucketEntry
  critical_60_plus: AgingBucketEntry
}

export interface AdvanceCreditSummary {
  totalAmount: number
  customerCount: number
}

export interface MonthProgressDto {
  totalBilled: number
  collected: number
  percentage: number
  target: number
  gap: number
}

export interface AtLimitCustomer {
  customerId: string
  name: string
  utilizationPercentage: number
}

export interface CollectionsDashboardDto {
  outstandingOverview: OutstandingOverviewDto
  advanceCredit: AdvanceCreditSummary
  netReceivable: number
  thisMonthProgress: MonthProgressDto
  customersAtLimit: AtLimitCustomer[]
}

// ---------------------------------------------------------------------------
// Priority list — GET /vendors/:v/collections/priority-list
// ---------------------------------------------------------------------------

export interface CreditPriorityCustomer {
  customerId: string
  customerName: string
  phoneNumber: string
  outstanding: number
  daysOverdue: number
  creditLimit: number
  utilizationPercentage: number
  lastPaymentDate: string | null
  paymentScore: number
  creditType: CreditType
}

export interface AdvanceCreditEntry {
  customerId: string
  customerName: string
  creditBalance: number
  monthsCovered: number
}

export interface PriorityListDto {
  highPriority: CreditPriorityCustomer[]
  mediumPriority: CreditPriorityCustomer[]
  lowPriority: CreditPriorityCustomer[]
  advanceCredit: AdvanceCreditEntry[]
}

// ---------------------------------------------------------------------------
// Analytics — GET /vendors/:v/collections/analytics
// ---------------------------------------------------------------------------

export interface MonthlySummaryDto {
  totalBilled: number
  collected: number
  outstanding: number
  collectionPercentage: number
  target: number
}

export interface PaymentModeEntry {
  amount: number
  percentage: number
}

export interface PaymentModeBreakdown {
  upi: PaymentModeEntry
  cash: PaymentModeEntry
  bank: PaymentModeEntry
  online: PaymentModeEntry
  other: PaymentModeEntry
}

export interface CollectionTrendPoint {
  month: string
  percentage: number
}

export interface RankedCustomer {
  customerId: string
  customerName: string
  amount: number
}

export interface Defaulter {
  customerId: string
  customerName: string
  amount: number
  daysOverdue: number
}

export interface CollectionAnalyticsDto {
  month: string
  monthlySummary: MonthlySummaryDto
  paymentModeBreakdown: PaymentModeBreakdown
  collectionTrend: CollectionTrendPoint[]
  topPayers: RankedCustomer[]
  defaulters: Defaulter[]
}

// ---------------------------------------------------------------------------
// Aging — GET /vendors/:v/collections/aging
// ---------------------------------------------------------------------------

export interface AgingDto {
  totalOutstanding: number
  fresh_0_30: AgingBucketEntry
  overdue_30_60: AgingBucketEntry
  critical_60_plus: AgingBucketEntry
}

// ---------------------------------------------------------------------------
// Credit settings — PATCH /vendors/:v/customers/:c/credit-settings
// ---------------------------------------------------------------------------

export interface UpdateCreditSettingsDto {
  creditType?: CreditType
  creditLimit?: number
  warningThreshold?: number
  actionOnBreach?: ActionOnBreach
  minimumBalanceWarning?: number
}

export interface CreditSettingsResultDto {
  customerId: string
  creditType: CreditType
  creditLimit: number
  warningThreshold: number
  actionOnBreach: ActionOnBreach
  minimumBalanceWarning: number | null
  currentBalance: number
  creditUtilization: number
  breached: boolean
  deliveriesPaused: boolean
  /** Non-null when the new limit is below current outstanding (change is still applied). */
  warning: 'limit_below_outstanding' | null
}

// ---------------------------------------------------------------------------
// Enable prepaid — POST /vendors/:v/customers/:c/enable-prepaid
// Discriminated union: clearOutstandingRequired boolean
// ---------------------------------------------------------------------------

export interface EnablePrepaidDto {
  clearOutstandingFirst: boolean
  minimumBalanceWarning?: number
  message?: string
}

/** Prepaid switch applied successfully. */
export interface EnablePrepaidSuccessResult {
  customerId: string
  creditType: 'prepaid'
  minimumBalanceWarning: number | null
  clearOutstandingRequired: false
}

/** Outstanding must be cleared before the switch can be applied. */
export interface EnablePrepaidBlockedResult {
  customerId: string
  creditType: CreditType
  clearOutstandingRequired: true
  outstanding: number
}

export type EnablePrepaidResultDto = EnablePrepaidSuccessResult | EnablePrepaidBlockedResult

// ---------------------------------------------------------------------------
// Single reminder — POST /vendors/:v/customers/:c/reminders
// ---------------------------------------------------------------------------

export interface SendReminderResultDto {
  reminderId: string
  customerId: string
  amountDue: number
  sentVia: string
  status: ReminderStatus
  reminderDate: string
  skipped: boolean
  skipReason: ReminderSkipReason | null
}

// ---------------------------------------------------------------------------
// Reminder history — GET /vendors/:v/customers/:c/reminders
// ---------------------------------------------------------------------------

export interface ReminderHistoryItem {
  id: string
  amountDue: number
  reminderDate: string
  sentVia: string
  status: ReminderStatus
  responseType: string | null
  responseAmount: number | null
}

export interface ReminderHistoryDto {
  totalReminders: number
  successRate: number
  reminders: ReminderHistoryItem[]
}

export interface ReminderHistoryMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Bulk reminders — POST /vendors/:v/reminders/send-bulk
// ---------------------------------------------------------------------------

export interface SendBulkRemindersDto {
  target: BulkReminderTarget
  customerIds?: string[]
  customMessage?: string
}

export interface BulkReminderResultDto {
  sent: number
  skipped: number
  failed: number
}

// ---------------------------------------------------------------------------
// Reminder config — GET/PATCH /vendors/:v/reminder-config
// ---------------------------------------------------------------------------

export interface ReminderConfigDto {
  autoRemindersEnabled: boolean
  schedule3Days: boolean
  schedule15Days: boolean
  schedule30Days: boolean
  reminderTemplate: string | null
  excludedCustomerIds: string[]
}

export interface UpdateReminderConfigDto {
  autoRemindersEnabled?: boolean
  schedule3Days?: boolean
  schedule15Days?: boolean
  schedule30Days?: boolean
  reminderTemplate?: string
  excludedCustomerIds?: string[]
}

/** Known placeholder tokens for reminder templates (client-side validation). */
export const KNOWN_REMINDER_PLACEHOLDERS = [
  '{customer_name}',
  '{month}',
  '{amount}',
  '{upi_id}',
  '{phone}',
  '{vendor_name}',
] as const

export type KnownReminderPlaceholder = (typeof KNOWN_REMINDER_PLACEHOLDERS)[number]
