/**
 * Roles & Access Control Mock Data (US-002)
 * Purpose: Deterministic fixtures for the roles service in mock mode.
 *
 * Includes: an owner role context, an active staff list with a mix of statuses,
 * a member with `null todayStats` (US-006 not wired yet), an empty-list edge case
 * helper, and supply-list options for the assign multi-select (OQ-6 stub).
 */

import type {
  RoleContextDto,
  StaffResponseDto,
  SupplyListOptionDto,
} from '../../types/roles'

/** The signed-in owner's role context for the active vendor. */
export const mockOwnerRoleContext: RoleContextDto = {
  role: 'owner',
  vendorId: '1',
  staffId: null,
  permissions: ['mark_deliveries', 'mark_leaves', 'add_extra_charges'],
}

/** A staff member's role context (used when simulating a staff session). */
export const mockStaffRoleContext: RoleContextDto = {
  role: 'staff',
  vendorId: '1',
  staffId: 'staff-1',
  permissions: ['mark_deliveries'],
}

/** Display name of the active mock vendor (embedded in the OQ-1 invite URL preview). */
export const mockVendorDisplayName = 'शर्मा डेली स्टोर्स'

/** Supply-list options for the assign multi-select (OQ-6 stub until US-005). */
export const mockSupplyListOptions: SupplyListOptionDto[] = [
  { listId: 'list-1', name: 'Morning Milk — Sector 15' },
  { listId: 'list-2', name: 'Evening Milk — Sector 15' },
  { listId: 'list-3', name: 'Newspaper — Tower A' },
]

/**
 * Mutable staff fixtures (mock mode mutates these so assign/unassign and
 * status updates are observable across calls within a session).
 */
export const mockStaffList: StaffResponseDto[] = [
  {
    staffId: 'staff-1',
    userId: 'user-101',
    name: 'Ramesh Kumar',
    phone: '+919876500001',
    role: 'staff',
    status: 'ACTIVE',
    areaRouteLabel: 'Sector 15, Tower A-D',
    permissions: ['mark_deliveries'],
    assignedListCount: 2,
    assignedListIds: ['list-1', 'list-2'],
    todayStats: { deliveriesMarked: 73, leavesMarked: 4 },
    invitedAt: '2026-05-01T06:00:00.000Z',
    joinedAt: '2026-05-02T06:00:00.000Z',
    createdAt: '2026-05-01T06:00:00.000Z',
    updatedAt: '2026-06-01T06:00:00.000Z',
  },
  {
    staffId: 'staff-2',
    userId: 'user-102',
    name: 'Suresh Patel',
    phone: '+919876500002',
    role: 'staff',
    status: 'ACTIVE',
    areaRouteLabel: 'Sector 22',
    permissions: ['mark_deliveries', 'mark_leaves'],
    assignedListCount: 1,
    assignedListIds: ['list-3'],
    // null todayStats — stats not wired until US-006; UI renders a placeholder.
    todayStats: null,
    invitedAt: '2026-05-05T06:00:00.000Z',
    joinedAt: '2026-05-06T06:00:00.000Z',
    createdAt: '2026-05-05T06:00:00.000Z',
    updatedAt: '2026-06-01T06:00:00.000Z',
  },
  {
    staffId: 'staff-3',
    userId: null,
    name: 'Anita Sharma',
    phone: '+919876500003',
    role: 'staff',
    status: 'INVITED',
    areaRouteLabel: null,
    permissions: ['mark_deliveries'],
    assignedListCount: 0,
    assignedListIds: [],
    todayStats: null,
    invitedAt: '2026-06-07T06:00:00.000Z',
    joinedAt: null,
    createdAt: '2026-06-07T06:00:00.000Z',
    updatedAt: '2026-06-07T06:00:00.000Z',
  },
  {
    staffId: 'staff-4',
    userId: 'user-104',
    name: 'Vijay Singh',
    phone: '+919876500004',
    role: 'staff',
    status: 'DISABLED',
    areaRouteLabel: 'Sector 9',
    permissions: [],
    assignedListCount: 0,
    assignedListIds: [],
    todayStats: null,
    invitedAt: '2026-04-01T06:00:00.000Z',
    joinedAt: '2026-04-02T06:00:00.000Z',
    createdAt: '2026-04-01T06:00:00.000Z',
    updatedAt: '2026-05-20T06:00:00.000Z',
  },
]

/** Resolve a supply-list id to its display name (mock helper). */
export function mockSupplyListName(listId: string): string {
  return mockSupplyListOptions.find((o) => o.listId === listId)?.name ?? listId
}
