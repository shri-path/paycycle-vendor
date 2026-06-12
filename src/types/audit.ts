/**
 * Audit & Accountability Type Definitions (US-007)
 *
 * All shapes frozen against the paycycle_api API_SPEC
 * (`docs/features/us-007-audit-accountability/API_SPEC.md`).
 *
 * Conventions:
 * - All ids are strings (BigInt serialised as string on the server).
 * - Timestamps are ISO8601 strings; dates are `YYYY-MM-DD`.
 * - `customer`, `supplyList`, `entityType`, `entityId`, `ipAddress` may be null.
 * - `ipAddress` is present only for owner callers.
 * - `vendorId` is NEVER sent from the client — it is JWT-derived on the server.
 * - This is a READ-ONLY domain: the only POST is the CSV export.
 */

/** Actor role on an audit entry. */
export type AuditUserRole = 'owner' | 'staff'

/** Minimal named reference used across audit DTOs. */
export interface AuditRef {
  id: string
  name: string
}

/** The acting user on an audit entry (role included). */
export interface AuditActor {
  id: string
  name: string
  role: AuditUserRole
}

/** Free-form details bag (status, quantity, amount, reason, ...). */
export interface AuditDetails {
  status?: string
  quantity?: number
  amount?: number
  reason?: string
  [key: string]: unknown
}

/** One row in the activity timeline (GET /audit-logs). */
export interface AuditLogDto {
  id: string
  timestamp: string // ISO8601
  actionType: string
  actionLabel: string
  entityType: string | null
  entityId: string | null
  user: AuditActor
  customer: AuditRef | null
  supplyList: AuditRef | null
  details: AuditDetails | null
  /** Owner-only; null/absent for staff callers. */
  ipAddress: string | null
}

/** Pagination block (GET /audit-logs). */
export interface AuditPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Server-provided filter options for the activity log. */
export interface AuditFilters {
  availableStaff: AuditRef[]
  availableActionTypes: string[]
}

/** Full payload of GET /audit-logs (the service returns data.data). */
export interface AuditLogsResult {
  auditLogs: AuditLogDto[]
  pagination: AuditPagination
  filters: AuditFilters
}

/** Staff side of a delivery conflict. */
export interface ConflictStaffAction {
  timestamp: string
  staff: AuditRef
  status: string
}

/** Override side of a delivery conflict. */
export interface ConflictOverrideAction {
  timestamp: string
  by: string // 'owner' | 'customer'
  status: string
  timeDiffMinutes: number
}

/** One delivery-action conflict (GET /audit-logs/conflicts). */
export interface ConflictDto {
  id: string
  deliveryDate: string // YYYY-MM-DD
  customer: AuditRef | null
  supplyList: AuditRef | null
  staffAction: ConflictStaffAction
  overrideAction: ConflictOverrideAction
}

/** Per-action-type aggregation inside a staff summary. */
export interface StaffSummaryByActionType {
  actionType: string
  actionLabel: string
  count: number
  firstActionAt: string
  lastActionAt: string
}

/** Per-date aggregation inside a staff summary. */
export interface StaffSummaryByDate {
  date: string // YYYY-MM-DD
  actionCount: number
  firstActionAt: string
  lastActionAt: string
}

/** Per-staff activity summary (GET /audit-logs/staff-summary). */
export interface StaffSummaryDto {
  staffId: string
  staffName: string
  byActionType: StaffSummaryByActionType[]
  byDate: StaffSummaryByDate[]
  totalActions: number
  activeDays: number
  avgActionsPerDay: number
}

/** One entry in the caller's own activity feed (GET /audit-logs/my-activity). */
export interface MyActivityEntryDto {
  id: string
  timestamp: string
  actionType: string
  actionLabel: string
  customer: AuditRef | null
  supplyList: AuditRef | null
  details: AuditDetails | null
}

/** Rolling counts for the caller (GET /audit-logs/my-activity). */
export interface MyActivitySummary {
  todayActions: number
  thisWeekActions: number
  thisMonthActions: number
}

/** Full payload of GET /audit-logs/my-activity. */
export interface MyActivityResult {
  activity: MyActivityEntryDto[]
  summary: MyActivitySummary
}

// ---------------------------------------------------------------------------
// Request inputs
// ---------------------------------------------------------------------------

/** Options for GET /audit-logs (all optional; vendorId is JWT-derived). */
export interface ListAuditLogsOptions {
  staffId?: string
  customerId?: string
  actionType?: string
  entityType?: string
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  page?: number
  limit?: number
}

/** Options for GET /audit-logs/staff-summary. */
export interface StaffSummaryOptions {
  staffId?: string
  startDate?: string
  endDate?: string
}

/** Body for POST /audit-logs/export. `format` is always 'csv'. */
export interface ExportAuditLogsInput {
  format: 'csv'
  staffId?: string
  actionType?: string
  startDate?: string
  endDate?: string
}

/** Non-PII filter state persisted across restarts for UX continuity. */
export interface AuditFilterState {
  filterStaffId: string | null
  filterActionType: string | null
  filterStartDate: string | null
  filterEndDate: string | null
}
