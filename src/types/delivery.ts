/**
 * Delivery Type Definitions (US-006)
 * Purpose: DTOs + unions aligned with paycycle_api delivery module contracts.
 *
 * These shapes are FROZEN against `paycycle_api/src/modules/delivery/delivery.types.ts`
 * (field names, nullability, unions). Do not invent or change them — coordinate with
 * the backend contract.
 *
 * Backend reconciliation invariants (see FEATURE_PLAN → Backend Reconciliation):
 *   - All ids are STRINGS.
 *   - Status enums are UPPERCASE Prisma enums (PENDING | DELIVERED | LEAVE |
 *     AUTO_MARKED | CANCELLED). The story doc's lowercase values are obsolete.
 *   - `revenue` fields are STRINGS (Prisma Decimal serialised) — parse with
 *     `parseRevenue` before any arithmetic/formatting.
 *   - Owner-only money (`ratePerUnit`, `amount`, `revenue`) is omitted from staff
 *     responses → fields are optional here.
 */

import type { PaginationMeta } from './supplyLists'

export type { PaginationMeta }

/** Daily-supply lifecycle status (Prisma enum — UPPERCASE). */
export type DailySupplyStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'LEAVE'
  | 'AUTO_MARKED'
  | 'CANCELLED'

/** Marking statuses a client may request via the mark endpoint. */
export type MarkableStatus = 'DELIVERED' | 'LEAVE'

/** Leave type (Prisma enum — UPPERCASE). */
export type LeaveType = 'CUSTOMER_REQUESTED' | 'VENDOR_MARKED' | 'SYSTEM'

/** The acting persona resolved from the request context. */
export type ActorRoleLabel = 'owner' | 'staff' | 'customer' | 'system'

/** Calendar day status union (backend lowercase enum for this surface). */
export type CalendarDayStatus = 'completed' | 'has_leaves' | 'pending' | 'has_conflicts'

/** Who marked a delivery, as returned to clients. */
export interface MarkedByDto {
  userId: string
  name: string | null
  role: ActorRoleLabel
}

/** A single delivery card for the per-list view. */
export interface DeliveryDto {
  id: string
  customer: {
    id: string
    name: string | null
    address: string | null
    phoneNumber: string | null
  }
  quantity: number
  unit: string
  /** Owner-only — omitted for staff. */
  ratePerUnit?: number
  /** Owner-only — omitted for staff. */
  amount?: number
  status: DailySupplyStatus
  markedBy: MarkedByDto | null
  markedAt: string | null
  hasConflict: boolean
  conflictReason: string | null
  otherLists: string[]
}

/** Response of PATCH /deliveries/:id/mark. */
export interface MarkDeliveryResultDto {
  delivery: DeliveryDto
  hasConflict: boolean
}

/** Response of POST /deliveries/mark-bulk. */
export interface MarkBulkResultDto {
  updated: number
  /** Count of caller-specified IDs that were explicitly excluded. */
  excluded: number
}

/** Today summary roll-up. `revenue` is a STRING. */
export interface TodaySummaryDto {
  totalDeliveries: number
  delivered: number
  onLeave: number
  pending: number
  autoMarked: number
  revenue: string
  conflicts: number
}

/** Per-list roll-up inside the today view. */
export interface TodayListDto {
  listId: string
  listName: string
  startTime: string | null
  staff: { staffId: string; name: string | null }[]
  totalCustomers: number
  delivered: number
  onLeave: number
  pending: number
  /** Owner-only. */
  revenue?: string
}

/** A conflict surfaced in the today view. */
export interface TodayConflictDto {
  deliveryId: string
  customerName: string | null
  listName: string
  reason: string
}

/** Response of GET /deliveries/today. */
export interface TodayResultDto {
  date: string
  summary: TodaySummaryDto
  byList: TodayListDto[]
  conflicts: TodayConflictDto[]
}

/** Response of GET /supply-lists/:listId/deliveries. */
export interface ListDeliveriesResultDto {
  listId: string
  listName: string
  date: string
  progress: { total: number; delivered: number; onLeave: number; pending: number }
  deliveries: DeliveryDto[]
}

/** Response of POST /extra-charges. */
export interface ExtraChargeResultDto {
  id: string
  dailySupplyId: string
  amount: number
  comment: string
  addedBy: MarkedByDto | null
  createdAt: string
}

/** A single leave row in the create-leave result. */
export interface LeaveDto {
  id: string
  customerId: string
  supplyListId: string
  startDate: string
  endDate: string
  leaveType: LeaveType
}

/** Response of POST /leaves. */
export interface CreateLeaveResultDto {
  created: number
  leaves: LeaveDto[]
  affectedDeliveries: number
}

/** A today-scoped leave row in the leaves listing. */
export interface TodayLeaveRowDto {
  id: string
  customerName: string | null
  listName: string
  date: string
}

/** An upcoming leave row in the leaves listing. */
export interface UpcomingLeaveRowDto {
  id: string
  customerName: string | null
  listName: string
  startDate: string
  endDate: string
  daysCount: number
}

/** Response of GET /leaves. */
export interface ListLeavesResultDto {
  today: TodayLeaveRowDto[]
  upcoming: UpcomingLeaveRowDto[]
}

/** Response of DELETE /leaves/:id. */
export interface CancelLeaveResultDto {
  revertedDeliveries: number
}

/** A single day cell in the calendar. `revenue` is a STRING. */
export interface CalendarDayDto {
  status: CalendarDayStatus
  delivered: number
  leaves: number
  revenue: string
}

/** Response of GET /deliveries/calendar. */
export interface CalendarResultDto {
  month: string
  summary: { totalDeliveries: number; totalLeaves: number; revenue: string }
  days: Record<string, CalendarDayDto>
}

/** Response of GET /deliveries/date/:date. */
export interface DateDetailResultDto {
  date: string
  summary: { totalDeliveries: number; leaves: number; revenue: string }
  byList: {
    listId: string
    listName: string
    startTime: string | null
    staffName: string | null
    delivered: number
    leaves: number
    revenue: string
  }[]
  extraCharges: {
    customerName: string | null
    listName: string
    amount: number
    reason: string
  }[]
  leaves: { customerName: string | null; listName: string; markedBy: ActorRoleLabel }[]
}

// ---------------------------------------------------------------------------
// Request input shapes (client → server). NO markedBy*/vendorId fields — the
// server derives the actor + tenant from the JWT.
// ---------------------------------------------------------------------------

/** Body of PATCH /deliveries/:id/mark. */
export interface MarkDeliveryInput {
  status: MarkableStatus
  quantity?: number
}

/** Body of POST /deliveries/mark-bulk. */
export interface MarkBulkInput {
  supplyListId: string
  date: string
  status: 'DELIVERED'
  excludeDeliveryIds?: string[]
}

/** Body of POST /extra-charges. `amount` must be non-zero, `comment` required. */
export interface ExtraChargeInput {
  dailySupplyId: string
  amount: number
  comment: string
}

/** Body of POST /leaves. */
export interface CreateLeaveInput {
  customerId: string
  supplyListIds: string[]
  startDate: string
  endDate: string
  reason?: string
}

/** Query options for the per-list deliveries read. */
export interface ListDeliveriesOptions {
  date?: string
  status?: DailySupplyStatus
  search?: string
  page?: number
  limit?: number
}

/** Query options for the today read. */
export interface TodayOptions {
  date?: string
  listId?: string
  staffId?: string
}

/** Query options for the calendar read. */
export interface CalendarOptions {
  listId?: string
  customerId?: string
}
