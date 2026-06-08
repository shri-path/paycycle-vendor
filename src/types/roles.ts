/**
 * Roles & Access Control Type Definitions (US-002)
 * Purpose: DTOs + input types aligned with paycycle_api staff module contracts.
 *
 * These shapes are FROZEN against `paycycle_api/src/modules/staff/staff.types.ts`
 * (field names, nullability, unions). Do not invent or change them — coordinate
 * with the backend contract.
 *
 * OQ-6 note: `SupplyListOptionDto` and the assign/unassign flows run against the
 * backend's list-assignment STUB until US-005 ships the real supply-list service.
 * The shape may change when US-005 lands and must be re-verified then.
 */

/** Staff-grantable permission capabilities (owner is all-allow and ignores these). */
export type PermissionKey = 'mark_deliveries' | 'mark_leaves' | 'add_extra_charges'

/** Caller-facing role label (mapped from role slug on the server). */
export type StaffRoleLabel = 'owner' | 'staff'

/** Vendor membership status (mirrors backend VendorUserStatus). */
export type StaffStatus = 'ACTIVE' | 'DISABLED' | 'INVITED' | 'REMOVED'

/** GET /vendors/:vendorId/role — the caller's role for the active vendor. */
export interface RoleContextDto {
  role: StaffRoleLabel
  vendorId: string
  staffId: string | null
  permissions: PermissionKey[]
}

/** Placeholder delivery stats until US-006 wires real numbers. */
export interface TodayStatsDto {
  deliveriesMarked: number
  leavesMarked: number
}

/** Staff detail/list item (whitelisted; never carries tokens/secrets). */
export interface StaffResponseDto {
  staffId: string
  userId: string | null
  name: string | null
  phone: string | null
  role: StaffRoleLabel
  status: StaffStatus
  areaRouteLabel: string | null
  permissions: PermissionKey[]
  assignedListCount: number
  assignedListIds: string[]
  todayStats: TodayStatsDto | null
  invitedAt: string | null
  joinedAt: string | null
  createdAt: string
  updatedAt: string
}

/** POST /vendors/:vendorId/staff/invite response. */
export interface InviteStaffResponseDto {
  staff: StaffResponseDto
  inviteUrl: string
  expiresAt: string
}

/** DELETE /vendors/:vendorId/staff/:staffId response. */
export interface RemoveStaffResponseDto {
  staffId: string
  status: StaffStatus
  removedAt: string | null
}

/**
 * Supply-list option for the assign multi-select (OQ-6).
 * Stub-backed until US-005 — shape may change.
 */
export interface SupplyListOptionDto {
  listId: string
  name: string
}

/** Pagination metadata returned alongside list responses. */
export interface StaffListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Channel the owner uses to deliver the invite link. */
export type InviteSendVia = 'whatsapp' | 'sms'

/** Input for POST /staff/invite (vendorId is derived from JWT — never sent here). */
export interface InviteStaffInput {
  phone: string
  name?: string
  areaRouteLabel?: string
  permissions?: PermissionKey[]
  assignedListIds?: string[]
  sendVia?: InviteSendVia
}

/** Result returned to the UI after a successful invite. */
export type InviteStaffResult = InviteStaffResponseDto

/** Input for PATCH /staff/:staffId (at least one field must be present). */
export interface UpdateStaffInput {
  status?: 'ACTIVE' | 'DISABLED'
  areaRouteLabel?: string | null
  permissions?: PermissionKey[]
}
