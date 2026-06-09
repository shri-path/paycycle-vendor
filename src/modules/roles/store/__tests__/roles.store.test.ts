/**
 * Roles Store Tests (US-002)
 * Purpose: Unit tests for the roles store actions using a mocked rolesService.
 * Covers success + error (403/409/451) paths, the OQ-6 assign/unassign trio
 * updating the cached detail, clearRoles wiping state, and verifies the
 * persisted slice carries no tokens/PII.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: {
    baseUrl: 'http://localhost:3000/api',
    socketUrl: 'http://localhost:3000',
    timeout: 30000,
    mockDelay: 0,
  },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

// Mock the roles service — store tests exercise store logic, not the network.
jest.mock('../../service/roles.service', () => ({
  rolesService: {
    getRole: jest.fn(),
    listStaff: jest.fn(),
    getStaff: jest.fn(),
    inviteStaff: jest.fn(),
    updateStaff: jest.fn(),
    removeStaff: jest.fn(),
    listSupplyLists: jest.fn(),
    assignLists: jest.fn(),
    unassignList: jest.fn(),
  },
}))

import { rolesService } from '../../service/roles.service'
import { useRolesStore } from '../roles.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type {
  RoleContextDto,
  StaffResponseDto,
  StaffListMeta,
} from '../../../../types/roles'

const mockedService = rolesService as jest.Mocked<typeof rolesService>

const VENDOR_ID = 'v1'

function setActiveVendor(vendorId: string | null): void {
  useAuthStore.setState({
    vendorContext: vendorId
      ? { vendorId, vendorName: 'Test', role: 'vendor_owner' }
      : null,
  })
}

function makeStaff(overrides: Partial<StaffResponseDto> = {}): StaffResponseDto {
  return {
    staffId: 'staff-1',
    userId: 'u1',
    name: 'Ramesh',
    phone: '+919876500001',
    role: 'staff',
    status: 'ACTIVE',
    areaRouteLabel: 'Sector 15',
    permissions: ['mark_deliveries'],
    assignedListCount: 1,
    assignedListIds: ['list-1'],
    todayStats: null,
    invitedAt: null,
    joinedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function buildAxiosError(status: number, code?: string): unknown {
  return {
    isAxiosError: true,
    response: { status, data: code ? { error: { code } } : {} },
  }
}

describe('useRolesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setActiveVendor(VENDOR_ID)
    useRolesStore.getState().clearRoles()
  })

  describe('fetchRole', () => {
    it('stores the role context on success', async () => {
      const role: RoleContextDto = {
        role: 'owner',
        vendorId: VENDOR_ID,
        staffId: null,
        permissions: ['mark_deliveries'],
      }
      mockedService.getRole.mockResolvedValueOnce(role)

      await useRolesStore.getState().fetchRole()

      expect(useRolesStore.getState().roleContext).toEqual(role)
      expect(useRolesStore.getState().isRoleLoading).toBe(false)
      expect(useRolesStore.getState().roleError).toBeNull()
    })

    it('no-ops when there is no active vendor', async () => {
      setActiveVendor(null)
      await useRolesStore.getState().fetchRole()
      expect(mockedService.getRole).not.toHaveBeenCalled()
    })

    it('sets a roles i18n key on a 404 (no membership)', async () => {
      mockedService.getRole.mockRejectedValueOnce(buildAxiosError(404))
      await useRolesStore.getState().fetchRole()
      expect(useRolesStore.getState().roleError).toBe('roles.error_no_membership')
      expect(useRolesStore.getState().isRoleLoading).toBe(false)
    })
  })

  describe('fetchStaffList', () => {
    const meta: StaffListMeta = { page: 1, limit: 20, total: 1, totalPages: 1 }

    it('replaces the list on page 1', async () => {
      mockedService.listStaff.mockResolvedValueOnce({ staff: [makeStaff()], meta })
      await useRolesStore.getState().fetchStaffList(1)
      expect(useRolesStore.getState().staffList).toHaveLength(1)
      expect(useRolesStore.getState().staffListMeta).toEqual(meta)
    })

    it('appends on page > 1 (infinite scroll)', async () => {
      mockedService.listStaff.mockResolvedValueOnce({ staff: [makeStaff()], meta })
      await useRolesStore.getState().fetchStaffList(1)
      mockedService.listStaff.mockResolvedValueOnce({
        staff: [makeStaff({ staffId: 'staff-2' })],
        meta: { ...meta, page: 2 },
      })
      await useRolesStore.getState().fetchStaffList(2)
      expect(useRolesStore.getState().staffList).toHaveLength(2)
    })

    it('maps a 403 to roles.error_forbidden', async () => {
      mockedService.listStaff.mockRejectedValueOnce(buildAxiosError(403))
      await useRolesStore.getState().fetchStaffList()
      expect(useRolesStore.getState().staffError).toBe('roles.error_forbidden')
    })
  })

  describe('inviteStaff', () => {
    it('appends the new staff and returns the invite result', async () => {
      const staff = makeStaff({ staffId: 'staff-new', status: 'INVITED' })
      mockedService.inviteStaff.mockResolvedValueOnce({
        staff,
        inviteUrl: 'paycyclevendor://join/tok',
        expiresAt: '2026-07-01T00:00:00Z',
      })
      const result = await useRolesStore
        .getState()
        .inviteStaff({ phone: '+919876500099' })
      expect(result.inviteUrl).toContain('paycyclevendor://join/')
      expect(useRolesStore.getState().staffList.some((s) => s.staffId === 'staff-new')).toBe(
        true,
      )
    })

    it('maps a 409 to roles.error_already_staff and rethrows', async () => {
      mockedService.inviteStaff.mockRejectedValueOnce(buildAxiosError(409, 'CONFLICT'))
      await expect(
        useRolesStore.getState().inviteStaff({ phone: '+919876500099' }),
      ).rejects.toBeDefined()
      expect(useRolesStore.getState().staffError).toBe('roles.error_already_staff')
    })

    it('maps a 451 to roles.error_staff_limit', async () => {
      mockedService.inviteStaff.mockRejectedValueOnce(
        buildAxiosError(451, 'SUBSCRIPTION_LIMIT'),
      )
      await expect(
        useRolesStore.getState().inviteStaff({ phone: '+919876500099' }),
      ).rejects.toBeDefined()
      expect(useRolesStore.getState().staffError).toBe('roles.error_staff_limit')
    })
  })

  describe('updateStaff', () => {
    it('updates the cached detail and list entry', async () => {
      useRolesStore.setState({ staffList: [makeStaff()] })
      const updated = makeStaff({ status: 'DISABLED' })
      mockedService.updateStaff.mockResolvedValueOnce(updated)
      await useRolesStore.getState().updateStaff('staff-1', { status: 'DISABLED' })
      expect(useRolesStore.getState().staffDetail['staff-1']?.status).toBe('DISABLED')
      expect(useRolesStore.getState().staffList[0]?.status).toBe('DISABLED')
    })
  })

  describe('removeStaff', () => {
    it('removes the staff from list + detail cache', async () => {
      useRolesStore.setState({
        staffList: [makeStaff()],
        staffDetail: { 'staff-1': makeStaff() },
      })
      mockedService.removeStaff.mockResolvedValueOnce({
        staffId: 'staff-1',
        status: 'REMOVED',
        removedAt: '2026-06-09T00:00:00Z',
      })
      await useRolesStore.getState().removeStaff('staff-1')
      expect(useRolesStore.getState().staffList).toHaveLength(0)
      expect(useRolesStore.getState().staffDetail['staff-1']).toBeUndefined()
    })
  })

  describe('supply-list options (OQ-6)', () => {
    it('fetchSupplyListOptions fills supplyListOptions', async () => {
      mockedService.listSupplyLists.mockResolvedValueOnce([
        { listId: 'list-1', name: 'Morning Milk' },
      ])
      await useRolesStore.getState().fetchSupplyListOptions()
      expect(useRolesStore.getState().supplyListOptions).toHaveLength(1)
      expect(useRolesStore.getState().isSupplyListsLoading).toBe(false)
    })

    it('assignLists re-fetches detail so assignedListIds reflect server truth', async () => {
      useRolesStore.setState({ staffList: [makeStaff()] })
      mockedService.assignLists.mockResolvedValueOnce(makeStaff())
      mockedService.getStaff.mockResolvedValueOnce(
        makeStaff({ assignedListIds: ['list-1', 'list-2'], assignedListCount: 2 }),
      )
      await useRolesStore.getState().assignLists('staff-1', ['list-2'])
      expect(useRolesStore.getState().staffDetail['staff-1']?.assignedListIds).toEqual([
        'list-1',
        'list-2',
      ])
      expect(mockedService.getStaff).toHaveBeenCalledWith(VENDOR_ID, 'staff-1')
    })

    it('unassignList re-fetches detail with the list removed', async () => {
      useRolesStore.setState({ staffList: [makeStaff()] })
      mockedService.unassignList.mockResolvedValueOnce(makeStaff())
      mockedService.getStaff.mockResolvedValueOnce(
        makeStaff({ assignedListIds: [], assignedListCount: 0 }),
      )
      await useRolesStore.getState().unassignList('staff-1', 'list-1')
      expect(useRolesStore.getState().staffDetail['staff-1']?.assignedListIds).toEqual([])
    })
  })

  describe('clearRoles', () => {
    it('wipes role + staff state', async () => {
      useRolesStore.setState({
        roleContext: {
          role: 'owner',
          vendorId: VENDOR_ID,
          staffId: null,
          permissions: [],
        },
        assignedListIds: ['list-1'],
        staffList: [makeStaff()],
        supplyListOptions: [{ listId: 'list-1', name: 'X' }],
      })
      useRolesStore.getState().clearRoles()
      const state = useRolesStore.getState()
      expect(state.roleContext).toBeNull()
      expect(state.assignedListIds).toEqual([])
      expect(state.staffList).toEqual([])
      expect(state.supplyListOptions).toEqual([])
    })
  })

  describe('persistence (data residency)', () => {
    it('persists only roleContext + assignedListIds (no tokens/PII)', () => {
      // The partialize config is the contract; assert it omits staff PII caches.
      useRolesStore.setState({
        roleContext: {
          role: 'owner',
          vendorId: VENDOR_ID,
          staffId: null,
          permissions: [],
        },
        assignedListIds: ['list-1'],
        staffList: [makeStaff()],
      })
      const persistOptions = (
        useRolesStore as unknown as {
          persist: { getOptions: () => { partialize: (s: unknown) => object } }
        }
      ).persist.getOptions()
      const persisted = persistOptions.partialize(useRolesStore.getState())
      expect(Object.keys(persisted).sort()).toEqual(['assignedListIds', 'roleContext'])
      expect(JSON.stringify(persisted)).not.toContain('+9198765') // no phone PII
      expect(JSON.stringify(persisted)).not.toContain('accessToken')
    })
  })
})
