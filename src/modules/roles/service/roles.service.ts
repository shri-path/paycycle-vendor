/**
 * Roles Service (US-002)
 * Purpose: Staff / role API calls — mock in dev, real API via the shared httpClient.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data.
 * Errors bubble up — the store maps them via mapApiError.
 *
 * OQ-6: listSupplyLists / assignLists / unassignList run against the backend's
 * list-assignment STUB until US-005 ships the real supply-list service. The
 * SupplyListOptionDto shape and these paths are pinned in FEATURE_PLAN and must be
 * re-verified when US-005 lands.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import {
  mockOwnerRoleContext,
  mockStaffList,
  mockSupplyListOptions,
  mockSupplyListName,
  mockVendorDisplayName,
} from '@services/mocks'
import type {
  RoleContextDto,
  StaffResponseDto,
  StaffListMeta,
  InviteStaffInput,
  InviteStaffResponseDto,
  RemoveStaffResponseDto,
  UpdateStaffInput,
  SupplyListOptionDto,
} from '../../../types/roles'

/** Result of a paginated staff list fetch. */
export interface ListStaffResult {
  staff: StaffResponseDto[]
  meta: StaffListMeta
}

const DEFAULT_LIMIT = 20

function findMockStaff(staffId: string): StaffResponseDto {
  const staff = mockStaffList.find((s) => s.staffId === staffId)
  if (!staff) throw new Error('roles.error_staff_not_found')
  return staff
}

export const rolesService = {
  /** GET /vendors/:vendorId/role */
  async getRole(vendorId: string): Promise<RoleContextDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockOwnerRoleContext, vendorId }
    }
    const { data } = await httpClient.get(APIPath.Vendors.Role(vendorId))
    return data.data as RoleContextDto
  },

  /** GET /vendors/:vendorId/staff?page&limit */
  async listStaff(
    vendorId: string,
    page = 1,
    limit = DEFAULT_LIMIT,
  ): Promise<ListStaffResult> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        staff: [...mockStaffList],
        meta: { page, limit, total: mockStaffList.length, totalPages: 1 },
      }
    }
    const { data } = await httpClient.get(APIPath.Staff.List(vendorId), {
      params: { page, limit },
    })
    return {
      staff: data.data as StaffResponseDto[],
      meta: data.meta as StaffListMeta,
    }
  },

  /** GET /vendors/:vendorId/staff/:staffId */
  async getStaff(vendorId: string, staffId: string): Promise<StaffResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...findMockStaff(staffId) }
    }
    const { data } = await httpClient.get(APIPath.Staff.Detail(vendorId, staffId))
    return data.data as StaffResponseDto
  },

  /** POST /vendors/:vendorId/staff/invite */
  async inviteStaff(
    vendorId: string,
    input: InviteStaffInput,
  ): Promise<InviteStaffResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const now = new Date()
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const staff: StaffResponseDto = {
        staffId: `staff-mock-${now.getTime()}`,
        userId: null,
        name: input.name ?? null,
        phone: input.phone,
        role: 'staff',
        status: 'INVITED',
        areaRouteLabel: input.areaRouteLabel ?? null,
        permissions: input.permissions ?? ['mark_deliveries'],
        assignedListCount: input.assignedListIds?.length ?? 0,
        assignedListIds: input.assignedListIds ?? [],
        todayStats: null,
        invitedAt: now.toISOString(),
        joinedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      mockStaffList.push(staff)
      // OQ-1: embed vendor name + assigned-list labels as query params so the
      // Join screen can preview them before submit (server still validates the token).
      const token = `mock-token-${now.getTime()}`
      const listLabels = (input.assignedListIds ?? []).map(mockSupplyListName)
      const params = [`vendor=${encodeURIComponent(mockVendorDisplayName)}`]
      if (listLabels.length > 0) {
        params.push(`lists=${encodeURIComponent(listLabels.join(','))}`)
      }
      return {
        staff,
        inviteUrl: `paycyclevendor://join/${token}?${params.join('&')}`,
        expiresAt: expires.toISOString(),
      }
    }
    const { data } = await httpClient.post(APIPath.Staff.Invite(vendorId), input)
    return data.data as InviteStaffResponseDto
  },

  /** PATCH /vendors/:vendorId/staff/:staffId */
  async updateStaff(
    vendorId: string,
    staffId: string,
    patch: UpdateStaffInput,
  ): Promise<StaffResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const staff = findMockStaff(staffId)
      if (patch.status !== undefined) staff.status = patch.status
      if (patch.areaRouteLabel !== undefined) staff.areaRouteLabel = patch.areaRouteLabel
      if (patch.permissions !== undefined) staff.permissions = patch.permissions
      staff.updatedAt = new Date().toISOString()
      return { ...staff }
    }
    const { data } = await httpClient.patch(APIPath.Staff.Detail(vendorId, staffId), patch)
    return data.data as StaffResponseDto
  },

  /** DELETE /vendors/:vendorId/staff/:staffId */
  async removeStaff(
    vendorId: string,
    staffId: string,
  ): Promise<RemoveStaffResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const staff = findMockStaff(staffId)
      staff.status = 'REMOVED'
      const removedAt = new Date().toISOString()
      staff.updatedAt = removedAt
      return { staffId, status: 'REMOVED', removedAt }
    }
    const { data } = await httpClient.delete(APIPath.Staff.Detail(vendorId, staffId))
    return data.data as RemoveStaffResponseDto
  },

  /** GET /vendors/:vendorId/supply-lists (OQ-6 stub until US-005). */
  async listSupplyLists(vendorId: string): Promise<SupplyListOptionDto[]> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return [...mockSupplyListOptions]
    }
    const { data } = await httpClient.get(APIPath.Vendors.SupplyLists(vendorId))
    return data.data as SupplyListOptionDto[]
  },

  /** POST /vendors/:vendorId/staff/:staffId/lists (OQ-6 stub). */
  async assignLists(
    vendorId: string,
    staffId: string,
    listIds: string[],
  ): Promise<StaffResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const staff = findMockStaff(staffId)
      const merged = Array.from(new Set([...staff.assignedListIds, ...listIds]))
      staff.assignedListIds = merged
      staff.assignedListCount = merged.length
      staff.updatedAt = new Date().toISOString()
      return { ...staff }
    }
    const { data } = await httpClient.post(APIPath.Staff.Lists(vendorId, staffId), {
      listIds,
    })
    return data.data as StaffResponseDto
  },

  /** DELETE /vendors/:vendorId/staff/:staffId/lists/:listId (OQ-6 stub). */
  async unassignList(
    vendorId: string,
    staffId: string,
    listId: string,
  ): Promise<StaffResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const staff = findMockStaff(staffId)
      const next = staff.assignedListIds.filter((id) => id !== listId)
      staff.assignedListIds = next
      staff.assignedListCount = next.length
      staff.updatedAt = new Date().toISOString()
      return { ...staff }
    }
    const { data } = await httpClient.delete(
      APIPath.Staff.ListDetail(vendorId, staffId, listId),
    )
    return data.data as StaffResponseDto
  },
}

export default rolesService
