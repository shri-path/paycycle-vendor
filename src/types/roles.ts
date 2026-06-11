/**
 * Roles & Access Control Type Definitions (US-002, extended US-004)
 * Purpose: DTOs + input types aligned with paycycle_api staff module contracts.
 *
 * These shapes are FROZEN against `paycycle_api/src/modules/staff/staff.types.ts`
 * (field names, nullability, unions). Do not invent or change them — coordinate
 * with the backend contract.
 *
 * US-004 added: resend invitation, dedicated permissions endpoint, editable name,
 * and the GET /staff `limits` block (see ResendInviteResponseDto, PermissionGrantDto,
 * UpdatePermissionsResponseDto, StaffLimitsDto, and `name` on UpdateStaffInput).
 *
 * OQ-6 note: `SupplyListOptionDto` and the assign/unassign flows run against the
 * backend's list-assignment STUB until US-005 ships the real supply-list service.
 * The shape may change when US-005 lands and must be re-verified then.
 */

/** Staff-grantable permission capabilities (owner is all-allow and ignores these). */
export type PermissionKey = 'mark_deliveries' | 'mark_leaves' | 'add_extra_charges'

/**
 * All grantable permission keys, in canonical order. Single source of truth for
 * the full grant map sent to the MERGE permissions endpoint (US-004). Service
 * mock-merge logic and the StaffDetail grant builder both import this.
 */
export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'mark_deliveries',
  'mark_leaves',
  'add_extra_charges',
]

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

/**
 * Invite delivery channel (mirrors Prisma StaffInvitationChannel on the backend).
 * Alias of InviteSendVia — kept distinct to mirror the backend DTO naming (US-004).
 */
export type InviteChannel = InviteSendVia

/** A single permission grant in the dedicated permissions endpoint (US-004). */
export interface PermissionGrantDto {
  key: PermissionKey
  granted: boolean
}

/** POST /vendors/:vendorId/staff/:staffId/resend-invitation response (US-004). */
export interface ResendInviteResponseDto {
  inviteUrl: string
  expiresAt: string
  sentVia: InviteChannel | null
}

/**
 * Subscription staff-limit snapshot attached to GET /staff (US-004).
 * `maxStaff` null = unlimited (current stub until US-009); `canAddMore` reflects the cap.
 */
export interface StaffLimitsDto {
  maxStaff: number | null
  currentActive: number
  canAddMore: boolean
}

/** PATCH /vendors/:vendorId/staff/:staffId/permissions response — full grant state (US-004). */
export interface UpdatePermissionsResponseDto {
  permissions: PermissionGrantDto[]
}

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
  name?: string
  status?: 'ACTIVE' | 'DISABLED'
  areaRouteLabel?: string | null
  permissions?: PermissionKey[]
}
