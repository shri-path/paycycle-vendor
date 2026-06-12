/**
 * Dashboard Type Definitions (US-010)
 *
 * All shapes frozen against the US-010 API contract in
 * `project_documents/vendor_app/user_stories/US-010-dashboard.md`.
 *
 * Conventions (mirrors the repo convention):
 * - All ids are strings (coerce numeric ids from API: `String(id)`).
 * - Money fields are plain `number` (INR).
 * - Dates are ISO8601: `date` fields are `YYYY-MM-DD`; timestamps are full ISO.
 * - `vendorId` is NEVER sent from the client — it is JWT-derived on the server.
 *
 * Security/typing rule:
 *   `StaffDashboardDto` and `StaffAssignedList` MUST NOT declare any monetary
 *   field (no revenue/amount/price/balance). This is the type-level guarantee
 *   that the staff dashboard cannot render financial data even if a future API
 *   accidentally leaks it.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Delivery status shared by owner and staff views. */
export type DeliveryStatus = 'not_started' | 'in_progress' | 'completed'

/** Auto-mark feature toggle value. */
export type AutoMarkStatus = 'on' | 'off'

/** Progress snapshot for a supply list. */
export interface DeliveryProgress {
  completed: number
  total: number
  percentage: number
}

// ---------------------------------------------------------------------------
// Owner dashboard
// ---------------------------------------------------------------------------

/** One aging bucket — amounts + customer count. */
export interface AgingBucket {
  amount: number
  customerCount: number
}

/** Outstanding aging breakdown (financial — owner-only). */
export interface OutstandingAgingSummary {
  fresh_0_30: AgingBucket
  overdue_30_60: AgingBucket
  critical_60_plus: AgingBucket
}

/** Financial summary section (owner-only). */
export interface FinancialSummaryDto {
  totalRevenue: number
  collected: number
  pending: number
  collectionPercentage: number
  outstandingAging: OutstandingAgingSummary
  advanceCredit: number
  netReceivable: number
}

/** Quick-stats grid (owner). */
export interface QuickStatsDto {
  supplyListsCount: number
  totalCustomers: number
  activeStaff: number
  conflictsToday: number
}

/** One line in the "tomorrow's forecast" summary on the owner dashboard. */
export interface ForecastLine {
  listName: string
  quantity: number
  unit: string
  customerCount: number
}

/** A supply list entry in "today's supply lists" (owner). */
export interface OwnerTodayList {
  id: string
  name: string
  startTime: string
  staffName: string
  progress: DeliveryProgress
  status: DeliveryStatus
}

/** Full owner dashboard payload (GET /vendors/:vendorId/dashboard/owner). */
export interface OwnerDashboardDto {
  currentMonth: string           // e.g. "2026-04"
  financial: FinancialSummaryDto
  quickStats: QuickStatsDto
  autoMarkStatus: AutoMarkStatus
  supplyForecast: {
    tomorrow: ForecastLine[]
  }
  todaySupplyLists: OwnerTodayList[]
}

// ---------------------------------------------------------------------------
// Staff dashboard — MUST contain NO monetary fields
// ---------------------------------------------------------------------------

/**
 * A supply list assigned to the staff member (staff dashboard).
 *
 * SECURITY: NO monetary fields (amount, price, revenue, balance, etc.)
 * are allowed on this type or any nested type it references. The
 * omission is intentional — see FEATURE_PLAN §6.4.
 */
export interface StaffAssignedList {
  id: string
  name: string
  startTime: string
  progress: DeliveryProgress
  status: DeliveryStatus
}

/**
 * Staff dashboard payload (GET /vendors/:vendorId/dashboard/staff).
 *
 * SECURITY: NO monetary fields whatsoever. Any future API response fields
 * carrying financial data must be ignored / not mapped here.
 */
export interface StaffDashboardDto {
  date: string           // YYYY-MM-DD
  staffName: string
  todayProgress: DeliveryProgress
  assignedLists: StaffAssignedList[]
  pendingCount: number
}

// ---------------------------------------------------------------------------
// Supply forecast
// ---------------------------------------------------------------------------

/** One row in the "by list" forecast view. */
export interface ForecastListRow {
  listId: string
  listName: string
  supplyType: string
  quantity: number
  unit: string
  customerCount: number
  plannedLeaves: number
}

/** One aggregate group in the "aggregated" forecast view. */
export interface ForecastAggregateGroup {
  supplyType: string
  totalQuantity: number
  unit: string
  lists: string[]
  /** Only present for multi-day forecast (days > 1). */
  dailyAverage?: number
}

/** Full supply forecast payload. */
export interface SupplyForecastDto {
  date: string
  byList: ForecastListRow[]
  aggregatedByType: Record<string, {
    totalQuantity: number
    unit: string
    lists: string[]
  }>
  next7Days?: Record<string, {
    totalQuantity: number
    unit: string
    dailyAverage: number
  }>
}

// ---------------------------------------------------------------------------
// Outstanding aging (collections)
// ---------------------------------------------------------------------------

/** A priority customer on the collections screen. */
export interface PriorityCustomer {
  customerId: string
  customerName: string
  outstanding: number
  daysOverdue: number
  creditLimit: number
  utilizationPercentage: number
  lastPaymentDate: string | null
  paymentScore: number
}

/** A customer with advance credit (negative balance). */
export interface AdvanceCreditCustomer {
  customerId: string
  customerName: string
  creditBalance: number
  monthsCovered: number
}

/** Full outstanding aging payload (GET /vendors/:vendorId/outstanding-aging). */
export interface OutstandingAgingDto {
  summary: {
    totalOutstanding: number
    fresh_0_30: AgingBucket
    overdue_30_60: AgingBucket
    critical_60_plus: AgingBucket
  }
  priorityCustomers: {
    high: PriorityCustomer[]
    medium: PriorityCustomer[]
    low: PriorityCustomer[]
  }
  advanceCredit: {
    totalAmount: number
    customerCount: number
    customers: AdvanceCreditCustomer[]
  }
}

// ---------------------------------------------------------------------------
// Vendor settings
// ---------------------------------------------------------------------------

/** Vendor settings payload returned by PATCH /vendors/:vendorId/settings. */
export interface VendorSettingsDto {
  autoMarkEnabled: boolean
  autoSendBillsEnabled: boolean
  autoSendBillsTime: string
}
