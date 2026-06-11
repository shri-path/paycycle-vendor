/**
 * Supply Lists Store Tests (US-005)
 * Purpose: Unit tests for the supply-lists store using a mocked service. Covers
 * success + each error class (404 / 409 create / 422 sub-transition / offline),
 * optimistic archive/remove/pause WITH rollback, clearSupplyLists wiping state, and
 * verifies the persisted slice carries no customer PII (phone/name/address).
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

jest.mock('../../service/supplyLists.service', () => ({
  supplyListsService: {
    list: jest.fn(),
    getDetail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    assignStaff: jest.fn(),
    unassignStaff: jest.fn(),
    listCustomers: jest.fn(),
    listAvailable: jest.fn(),
    addCustomers: jest.fn(),
    updateSubscription: jest.fn(),
    endSubscription: jest.fn(),
  },
}))

import { supplyListsService } from '../../service/supplyLists.service'
import { useSupplyListsStore } from '../supplyLists.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type {
  PaginationMeta,
  SubscriptionDto,
  SupplyListDto,
  SupplyListListDto,
} from '../../../../types/supplyLists'

const mockedService = supplyListsService as jest.Mocked<typeof supplyListsService>
const VENDOR_ID = 'v1'
const META: PaginationMeta = { page: 1, limit: 50, total: 1, totalPages: 1 }

function setActiveVendor(vendorId: string | null): void {
  useAuthStore.setState({
    vendorContext: vendorId
      ? { vendorId, vendorName: 'Test', role: 'vendor_owner' }
      : null,
  })
}

function makeList(overrides: Partial<SupplyListListDto> = {}): SupplyListListDto {
  return {
    id: 'list-1',
    name: 'Morning Milk',
    supplyType: 'milk',
    unit: 'ltr',
    defaultQuantity: 1,
    defaultRatePerUnit: 60,
    startTime: '06:30',
    frequency: 'DAILY',
    status: 'active',
    assignedStaff: [],
    customerCount: 5,
    todayStats: { date: '2026-06-11', delivered: 0, onLeave: 0, pending: 0, totalQuantity: 0 },
    ...overrides,
  }
}

function makeDetail(overrides: Partial<SupplyListDto> = {}): SupplyListDto {
  return {
    ...makeList(),
    frequencyDays: [],
    monthStats: { month: '2026-06', daysCompleted: 0, totalQuantity: 0, revenue: 0 },
    ...overrides,
  }
}

function makeSub(overrides: Partial<SubscriptionDto> = {}): SubscriptionDto {
  return {
    subscriptionId: 'sub-1',
    customerId: 'cust-1',
    customerName: 'Anita Sharma',
    phoneNumber: '+919876500011',
    address: 'A-101',
    quantity: 1,
    ratePerUnit: 60,
    amount: 60,
    isCustomQuantity: false,
    isCustomRate: false,
    startDate: '2026-05-01',
    status: 'active',
    otherLists: [],
    otherListsCount: 0,
    ...overrides,
  }
}

function axiosError(status: number, code?: string): unknown {
  return {
    isAxiosError: true,
    response: { status, data: code ? { error: { code } } : {} },
  }
}

function offlineError(): unknown {
  return { isAxiosError: true, response: undefined }
}

describe('useSupplyListsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setActiveVendor(VENDOR_ID)
    useSupplyListsStore.getState().clearSupplyLists()
  })

  describe('fetchLists', () => {
    it('replaces the lists on page 1 and stores meta', async () => {
      mockedService.list.mockResolvedValueOnce({ data: [makeList()], meta: META })
      await useSupplyListsStore.getState().fetchLists('active')
      expect(useSupplyListsStore.getState().lists).toHaveLength(1)
      expect(useSupplyListsStore.getState().listsMeta).toEqual(META)
      expect(useSupplyListsStore.getState().listStatusFilter).toBe('active')
    })

    it('appends on page > 1 (infinite scroll)', async () => {
      mockedService.list.mockResolvedValueOnce({ data: [makeList()], meta: META })
      await useSupplyListsStore.getState().fetchLists('active', 1)
      mockedService.list.mockResolvedValueOnce({
        data: [makeList({ id: 'list-2' })],
        meta: { ...META, page: 2 },
      })
      await useSupplyListsStore.getState().fetchLists('active', 2)
      expect(useSupplyListsStore.getState().lists).toHaveLength(2)
    })

    it('no-ops without an active vendor', async () => {
      setActiveVendor(null)
      await useSupplyListsStore.getState().fetchLists()
      expect(mockedService.list).not.toHaveBeenCalled()
    })

    it('maps a no-response error to common.offline_message', async () => {
      mockedService.list.mockRejectedValueOnce(offlineError())
      await useSupplyListsStore.getState().fetchLists()
      expect(useSupplyListsStore.getState().listsError).toBe('common.offline_message')
      expect(useSupplyListsStore.getState().isListsLoading).toBe(false)
    })
  })

  describe('fetchDetail / fetchCustomers', () => {
    it('caches detail by listId', async () => {
      mockedService.getDetail.mockResolvedValueOnce(makeDetail())
      await useSupplyListsStore.getState().fetchDetail('list-1')
      expect(useSupplyListsStore.getState().detail['list-1']?.id).toBe('list-1')
    })

    it('maps a 404 to supply.error_not_found', async () => {
      mockedService.getDetail.mockRejectedValueOnce(axiosError(404))
      await useSupplyListsStore.getState().fetchDetail('list-1')
      expect(useSupplyListsStore.getState().detailError).toBe('supply.error_not_found')
    })

    it('caches customers by listId with meta', async () => {
      mockedService.listCustomers.mockResolvedValueOnce({ data: [makeSub()], meta: META })
      await useSupplyListsStore.getState().fetchCustomers('list-1')
      expect(useSupplyListsStore.getState().customers['list-1']).toHaveLength(1)
      expect(useSupplyListsStore.getState().customersMeta['list-1']).toEqual(META)
    })
  })

  describe('createList', () => {
    it('prepends the created list and caches its detail', async () => {
      const created = makeDetail({ id: 'list-new', name: 'New' })
      mockedService.create.mockResolvedValueOnce(created)
      const result = await useSupplyListsStore
        .getState()
        .createList({ name: 'New', unit: 'ltr', frequency: 'DAILY' })
      expect(result.id).toBe('list-new')
      expect(useSupplyListsStore.getState().lists[0]?.id).toBe('list-new')
      expect(useSupplyListsStore.getState().detail['list-new']).toBeDefined()
    })

    it('maps a 409 to supply.error_duplicate_name and rethrows', async () => {
      mockedService.create.mockRejectedValueOnce(axiosError(409, 'CONFLICT'))
      await expect(
        useSupplyListsStore.getState().createList({ name: 'Dup', unit: 'ltr', frequency: 'DAILY' }),
      ).rejects.toBeDefined()
      expect(useSupplyListsStore.getState().listsError).toBe('supply.error_duplicate_name')
    })
  })

  describe('archiveList (optimistic + rollback)', () => {
    it('removes the list optimistically on success', async () => {
      useSupplyListsStore.setState({ lists: [makeList(), makeList({ id: 'list-2' })] })
      mockedService.archive.mockResolvedValueOnce({ id: 'list-1', status: 'archived' })
      await useSupplyListsStore.getState().archiveList('list-1')
      expect(useSupplyListsStore.getState().lists.map((l) => l.id)).toEqual(['list-2'])
    })

    it('rolls back the optimistic removal on failure', async () => {
      const lists = [makeList(), makeList({ id: 'list-2' })]
      useSupplyListsStore.setState({ lists })
      mockedService.archive.mockRejectedValueOnce(axiosError(404))
      await expect(useSupplyListsStore.getState().archiveList('list-1')).rejects.toBeDefined()
      expect(useSupplyListsStore.getState().lists.map((l) => l.id)).toEqual(['list-1', 'list-2'])
      expect(useSupplyListsStore.getState().detailError).toBe('supply.error_not_found')
    })
  })

  describe('updateSubscription (optimistic pause + rollback)', () => {
    it('applies the pause optimistically and confirms with the server row', async () => {
      useSupplyListsStore.setState({ customers: { 'list-1': [makeSub()] } })
      mockedService.updateSubscription.mockResolvedValueOnce(makeSub({ status: 'paused' }))
      await useSupplyListsStore
        .getState()
        .updateSubscription('list-1', 'sub-1', { status: 'paused' })
      expect(useSupplyListsStore.getState().customers['list-1']?.[0]?.status).toBe('paused')
    })

    it('rolls back to the prior row on a 422 invalid transition', async () => {
      useSupplyListsStore.setState({ customers: { 'list-1': [makeSub()] } })
      mockedService.updateSubscription.mockRejectedValueOnce(axiosError(422))
      await expect(
        useSupplyListsStore.getState().updateSubscription('list-1', 'sub-1', { status: 'paused' }),
      ).rejects.toBeDefined()
      expect(useSupplyListsStore.getState().customers['list-1']?.[0]?.status).toBe('active')
      expect(useSupplyListsStore.getState().detailError).toBe(
        'supply.error_invalid_sub_transition',
      )
    })
  })

  describe('endSubscription (optimistic remove + rollback)', () => {
    it('removes the subscription optimistically on success', async () => {
      useSupplyListsStore.setState({
        customers: { 'list-1': [makeSub(), makeSub({ subscriptionId: 'sub-2' })] },
      })
      mockedService.endSubscription.mockResolvedValueOnce({
        subscriptionId: 'sub-1',
        status: 'ended',
        endDate: '2026-06-11',
      })
      await useSupplyListsStore.getState().endSubscription('list-1', 'sub-1')
      expect(
        useSupplyListsStore.getState().customers['list-1']?.map((s) => s.subscriptionId),
      ).toEqual(['sub-2'])
    })

    it('rolls back the removal on failure', async () => {
      useSupplyListsStore.setState({ customers: { 'list-1': [makeSub()] } })
      mockedService.endSubscription.mockRejectedValueOnce(offlineError())
      await expect(
        useSupplyListsStore.getState().endSubscription('list-1', 'sub-1'),
      ).rejects.toBeDefined()
      expect(useSupplyListsStore.getState().customers['list-1']).toHaveLength(1)
      expect(useSupplyListsStore.getState().detailError).toBe('common.offline_message')
    })
  })

  describe('assignStaff', () => {
    it('replaces detail + list entry from the returned dto', async () => {
      useSupplyListsStore.setState({ lists: [makeList()] })
      const updated = makeDetail({
        assignedStaff: [{ staffId: 's1', staffName: 'R', isPrimary: true }],
      })
      mockedService.assignStaff.mockResolvedValueOnce(updated)
      await useSupplyListsStore.getState().assignStaff('list-1', 's1', true)
      expect(useSupplyListsStore.getState().detail['list-1']?.assignedStaff).toHaveLength(1)
    })

    it('maps a 422 to supply.error_staff_not_assignable', async () => {
      mockedService.assignStaff.mockRejectedValueOnce(axiosError(422))
      await expect(
        useSupplyListsStore.getState().assignStaff('list-1', 's1', true),
      ).rejects.toBeDefined()
      expect(useSupplyListsStore.getState().detailError).toBe(
        'supply.error_staff_not_assignable',
      )
    })
  })

  describe('clearSupplyLists', () => {
    it('wipes lists + detail + customers + available', () => {
      useSupplyListsStore.setState({
        lists: [makeList()],
        detail: { 'list-1': makeDetail() },
        customers: { 'list-1': [makeSub()] },
        available: [{ customerId: 'c1', name: 'X', phone: null, otherLists: [], otherListsCount: 0 }],
      })
      useSupplyListsStore.getState().clearSupplyLists()
      const s = useSupplyListsStore.getState()
      expect(s.lists).toEqual([])
      expect(s.detail).toEqual({})
      expect(s.customers).toEqual({})
      expect(s.available).toEqual([])
      expect(s.listStatusFilter).toBe('active')
    })
  })

  describe('persistence (data residency)', () => {
    it('persists only lean lists + filter — no customer PII', () => {
      useSupplyListsStore.setState({
        lists: [makeList()],
        detail: { 'list-1': makeDetail() },
        customers: { 'list-1': [makeSub()] },
      })
      const persistOptions = (
        useSupplyListsStore as unknown as {
          persist: { getOptions: () => { partialize: (s: unknown) => object } }
        }
      ).persist.getOptions()
      const persisted = persistOptions.partialize(useSupplyListsStore.getState())
      expect(Object.keys(persisted).sort()).toEqual(['listStatusFilter', 'lists'])
      // No customer PII (phone/name/address) reaches AsyncStorage.
      expect(JSON.stringify(persisted)).not.toContain('+9198765')
      expect(JSON.stringify(persisted)).not.toContain('Anita Sharma')
      expect(JSON.stringify(persisted)).not.toContain('A-101')
    })
  })
})
