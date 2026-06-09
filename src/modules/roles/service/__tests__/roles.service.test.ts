/**
 * Roles Service Tests (US-002)
 * Purpose: Verify mock-mode fixtures + real-mode path/unwrap behaviour for the
 * roles service. Asserts no vendorId is sent in request bodies (multi-tenancy)
 * and that the OQ-6 list-assignment trio mutates fixtures deterministically.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

// Mock mode is toggled per-describe. The service reads `isMockMode` live at each
// use site (Babel CJS interop accesses it as a property), so a getter backed by a
// mutable flag lets us flip mock/real mode without re-requiring the module.
let mockModeFlag = true
jest.mock('@services/config', () => ({
  get isMockMode() {
    return mockModeFlag
  },
  API_MODE: 'mock',
  API_CONFIG: {
    baseUrl: 'http://localhost:3000/api',
    socketUrl: 'http://localhost:3000',
    timeout: 30000,
    mockDelay: 0,
  },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { httpClient } from '@services/http'
import { rolesService } from '../roles.service'
import { APIPath } from '@constants/apiPaths'
import type { InviteStaffInput, StaffResponseDto } from '../../../../types/roles'

const VENDOR_ID = 'v1'
const mockedHttp = httpClient as jest.Mocked<typeof httpClient>

function setMockMode(value: boolean): void {
  mockModeFlag = value
}

describe('rolesService (mock mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setMockMode(true)
  })

  describe('getRole', () => {
    it('returns the owner role context scoped to the requested vendor', async () => {
      const role = await rolesService.getRole(VENDOR_ID)
      expect(role.role).toBe('owner')
      expect(role.vendorId).toBe(VENDOR_ID)
      expect(role.permissions).toContain('mark_deliveries')
    })
  })

  describe('listStaff', () => {
    it('returns a typed list with pagination meta', async () => {
      const { staff, meta } = await rolesService.listStaff(VENDOR_ID, 1, 20)
      expect(Array.isArray(staff)).toBe(true)
      expect(staff.length).toBeGreaterThan(0)
      expect(meta.page).toBe(1)
      expect(meta.total).toBe(staff.length)
    })

    it('includes a member with null todayStats (US-006 not wired)', async () => {
      const { staff } = await rolesService.listStaff(VENDOR_ID)
      expect(staff.some((s) => s.todayStats === null)).toBe(true)
    })
  })

  describe('getStaff', () => {
    it('returns the matching staff member', async () => {
      const staff = await rolesService.getStaff(VENDOR_ID, 'staff-1')
      expect(staff.staffId).toBe('staff-1')
    })

    it('throws roles.error_staff_not_found for an unknown id', async () => {
      await expect(rolesService.getStaff(VENDOR_ID, 'nope')).rejects.toThrow(
        'roles.error_staff_not_found',
      )
    })
  })

  describe('inviteStaff', () => {
    it('returns an INVITED staff record + invite url + expiry', async () => {
      const input: InviteStaffInput = {
        phone: '+919876511111',
        name: 'New Staff',
        assignedListIds: ['list-1'],
      }
      const result = await rolesService.inviteStaff(VENDOR_ID, input)
      expect(result.staff.status).toBe('INVITED')
      expect(result.staff.phone).toBe(input.phone)
      expect(result.staff.assignedListIds).toEqual(['list-1'])
      expect(result.inviteUrl).toContain('paycyclevendor://join/')
      expect(typeof result.expiresAt).toBe('string')
    })
  })

  describe('updateStaff', () => {
    it('applies a status patch to the fixture', async () => {
      const updated = await rolesService.updateStaff(VENDOR_ID, 'staff-1', {
        status: 'DISABLED',
      })
      expect(updated.status).toBe('DISABLED')
      // restore for other tests
      await rolesService.updateStaff(VENDOR_ID, 'staff-1', { status: 'ACTIVE' })
    })
  })

  describe('removeStaff', () => {
    it('returns a REMOVED summary', async () => {
      const result = await rolesService.removeStaff(VENDOR_ID, 'staff-2')
      expect(result.staffId).toBe('staff-2')
      expect(result.status).toBe('REMOVED')
      expect(typeof result.removedAt).toBe('string')
    })
  })

  describe('listSupplyLists (OQ-6 stub)', () => {
    it('returns supply-list options', async () => {
      const options = await rolesService.listSupplyLists(VENDOR_ID)
      expect(options.length).toBeGreaterThan(0)
      expect(options[0]).toHaveProperty('listId')
      expect(options[0]).toHaveProperty('name')
    })
  })

  describe('assignLists / unassignList (OQ-6 stub)', () => {
    it('assign merges listIds into assignedListIds deterministically', async () => {
      const before = await rolesService.getStaff(VENDOR_ID, 'staff-3')
      expect(before.assignedListIds).toEqual([])
      const assigned = await rolesService.assignLists(VENDOR_ID, 'staff-3', [
        'list-1',
        'list-2',
      ])
      expect(assigned.assignedListIds).toEqual(['list-1', 'list-2'])
      expect(assigned.assignedListCount).toBe(2)
      // assigning the same id again is idempotent (Set dedupe)
      const again = await rolesService.assignLists(VENDOR_ID, 'staff-3', ['list-1'])
      expect(again.assignedListIds).toEqual(['list-1', 'list-2'])
    })

    it('unassign removes a single listId', async () => {
      const updated = await rolesService.unassignList(VENDOR_ID, 'staff-3', 'list-1')
      expect(updated.assignedListIds).toEqual(['list-2'])
      expect(updated.assignedListCount).toBe(1)
    })
  })
})

describe('rolesService (real mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setMockMode(false)
  })

  afterAll(() => setMockMode(true))

  it('getRole hits the role path and unwraps { data }', async () => {
    const role = { role: 'owner', vendorId: VENDOR_ID, staffId: null, permissions: [] }
    mockedHttp.get.mockResolvedValueOnce({ data: { data: role } })
    const result = await rolesService.getRole(VENDOR_ID)
    expect(mockedHttp.get).toHaveBeenCalledWith(APIPath.Vendors.Role(VENDOR_ID))
    expect(result).toEqual(role)
  })

  it('listStaff hits the list path with page/limit params and unwraps data + meta', async () => {
    const meta = { page: 2, limit: 20, total: 40, totalPages: 2 }
    mockedHttp.get.mockResolvedValueOnce({ data: { data: [], meta } })
    const result = await rolesService.listStaff(VENDOR_ID, 2, 20)
    expect(mockedHttp.get).toHaveBeenCalledWith(APIPath.Staff.List(VENDOR_ID), {
      params: { page: 2, limit: 20 },
    })
    expect(result.meta).toEqual(meta)
    expect(result.staff).toEqual([])
  })

  it('inviteStaff posts the input body WITHOUT a vendorId field (multi-tenancy)', async () => {
    const input: InviteStaffInput = { phone: '+919876500009', assignedListIds: ['list-1'] }
    const staff = {} as StaffResponseDto
    mockedHttp.post.mockResolvedValueOnce({
      data: { data: { staff, inviteUrl: 'u', expiresAt: 'e' } },
    })
    await rolesService.inviteStaff(VENDOR_ID, input)
    expect(mockedHttp.post).toHaveBeenCalledWith(APIPath.Staff.Invite(VENDOR_ID), input)
    const body = mockedHttp.post.mock.calls[0]?.[1]
    expect(body).not.toHaveProperty('vendorId')
  })

  it('updateStaff patches the detail path', async () => {
    mockedHttp.patch.mockResolvedValueOnce({ data: { data: {} } })
    await rolesService.updateStaff(VENDOR_ID, 's1', { status: 'DISABLED' })
    expect(mockedHttp.patch).toHaveBeenCalledWith(APIPath.Staff.Detail(VENDOR_ID, 's1'), {
      status: 'DISABLED',
    })
  })

  it('removeStaff deletes the detail path', async () => {
    mockedHttp.delete.mockResolvedValueOnce({ data: { data: {} } })
    await rolesService.removeStaff(VENDOR_ID, 's1')
    expect(mockedHttp.delete).toHaveBeenCalledWith(APIPath.Staff.Detail(VENDOR_ID, 's1'))
  })

  it('assignLists posts listIds to the lists path (OQ-6 stub)', async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { data: {} } })
    await rolesService.assignLists(VENDOR_ID, 's1', ['list-1', 'list-2'])
    expect(mockedHttp.post).toHaveBeenCalledWith(APIPath.Staff.Lists(VENDOR_ID, 's1'), {
      listIds: ['list-1', 'list-2'],
    })
  })

  it('unassignList deletes the single-list path (OQ-6 stub)', async () => {
    mockedHttp.delete.mockResolvedValueOnce({ data: { data: {} } })
    await rolesService.unassignList(VENDOR_ID, 's1', 'list-1')
    expect(mockedHttp.delete).toHaveBeenCalledWith(
      APIPath.Staff.ListDetail(VENDOR_ID, 's1', 'list-1'),
    )
  })

  it('listSupplyLists hits the supply-lists path (OQ-6 stub)', async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { data: [] } })
    await rolesService.listSupplyLists(VENDOR_ID)
    expect(mockedHttp.get).toHaveBeenCalledWith(APIPath.Vendors.SupplyLists(VENDOR_ID))
  })
})
