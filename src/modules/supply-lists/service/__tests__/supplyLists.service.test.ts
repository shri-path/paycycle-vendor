/**
 * Supply Lists Service Tests (US-005)
 * Purpose: Verify mock-mode fixtures + real-mode path/envelope-unwrap behaviour for all
 * 12 service methods. Asserts ids stay strings, no vendorId is sent in request bodies
 * (multi-tenancy), `{ success, data, meta }` is unwrapped, and meta is extracted on lists.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

// Mock mode is toggled per-describe via a getter backed by a mutable flag (same
// pattern as the roles service test — the service reads `isMockMode` live).
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
import { supplyListsService } from '../supplyLists.service'
import { APIPath } from '@constants/apiPaths'
import type {
  CreateSupplyListInput,
  PaginationMeta,
} from '../../../../types/supplyLists'

const VENDOR_ID = 'v1'
const LIST_ID = 'list-1'
const mockedHttp = httpClient as jest.Mocked<typeof httpClient>

function setMockMode(value: boolean): void {
  mockModeFlag = value
}

describe('supplyListsService (mock mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setMockMode(true)
  })

  it('list returns rows + meta, ids are strings', async () => {
    const { data, meta } = await supplyListsService.list(VENDOR_ID)
    expect(data.length).toBeGreaterThan(0)
    expect(typeof data[0]?.id).toBe('string')
    expect(meta.total).toBe(data.length)
  })

  it('list filters by status', async () => {
    const { data } = await supplyListsService.list(VENDOR_ID, { status: 'archived' })
    expect(data.every((l) => l.status === 'archived')).toBe(true)
  })

  it('getDetail returns the requested list id with frequencyDays + monthStats', async () => {
    const detail = await supplyListsService.getDetail(VENDOR_ID, LIST_ID)
    expect(detail.id).toBe(LIST_ID)
    expect(Array.isArray(detail.frequencyDays)).toBe(true)
    expect(detail.monthStats).toBeDefined()
  })

  it('create echoes the input into a new string-id list', async () => {
    const input: CreateSupplyListInput = {
      name: 'Test List',
      unit: 'ltr',
      frequency: 'WEEKLY',
      frequencyDays: [1, 3, 5],
    }
    const created = await supplyListsService.create(VENDOR_ID, input)
    expect(typeof created.id).toBe('string')
    expect(created.name).toBe('Test List')
    expect(created.frequency).toBe('WEEKLY')
    expect(created.frequencyDays).toEqual([1, 3, 5])
    expect(created.status).toBe('active')
  })

  it('update merges the patch', async () => {
    const updated = await supplyListsService.update(VENDOR_ID, LIST_ID, { name: 'Renamed' })
    expect(updated.id).toBe(LIST_ID)
    expect(updated.name).toBe('Renamed')
  })

  it('archive returns { id, status: archived }', async () => {
    const result = await supplyListsService.archive(VENDOR_ID, LIST_ID)
    expect(result).toEqual({ id: LIST_ID, status: 'archived' })
  })

  it('assignStaff / unassignStaff return the full detail dto', async () => {
    const assigned = await supplyListsService.assignStaff(VENDOR_ID, LIST_ID, {
      staffId: 'staff-1',
      isPrimary: true,
    })
    expect(assigned.id).toBe(LIST_ID)
    const unassigned = await supplyListsService.unassignStaff(VENDOR_ID, LIST_ID, 'staff-1')
    expect(unassigned.id).toBe(LIST_ID)
  })

  it('listCustomers returns subscriptions + meta and filters by status', async () => {
    const all = await supplyListsService.listCustomers(VENDOR_ID, LIST_ID)
    expect(all.data.length).toBeGreaterThan(0)
    expect(all.meta.total).toBe(all.data.length)
    const paused = await supplyListsService.listCustomers(VENDOR_ID, LIST_ID, {
      status: 'paused',
    })
    expect(paused.data.every((s) => s.status === 'paused')).toBe(true)
  })

  it('listAvailable returns available customers + meta', async () => {
    const { data, meta } = await supplyListsService.listAvailable(VENDOR_ID, LIST_ID)
    expect(data.length).toBeGreaterThan(0)
    expect(typeof data[0]?.customerId).toBe('string')
    expect(meta.page).toBe(1)
  })

  it('addCustomers returns an added/skipped summary', async () => {
    const result = await supplyListsService.addCustomers(VENDOR_ID, LIST_ID, {
      customerIds: ['cust-4', 'cust-5'],
    })
    expect(result.addedCount).toBe(2)
    expect(result.skippedCount).toBe(0)
  })

  it('updateSubscription recomputes amount from qty * rate', async () => {
    const updated = await supplyListsService.updateSubscription(
      VENDOR_ID,
      LIST_ID,
      'sub-1',
      { quantity: 3, ratePerUnit: 20 },
    )
    expect(updated.subscriptionId).toBe('sub-1')
    expect(updated.amount).toBe(60)
  })

  it('endSubscription returns { subscriptionId, status: ended, endDate }', async () => {
    const result = await supplyListsService.endSubscription(VENDOR_ID, LIST_ID, 'sub-1')
    expect(result.subscriptionId).toBe('sub-1')
    expect(result.status).toBe('ended')
    expect(typeof result.endDate).toBe('string')
  })
})

describe('supplyListsService (real mode)', () => {
  const meta: PaginationMeta = { page: 1, limit: 50, total: 0, totalPages: 1 }

  beforeEach(() => {
    jest.clearAllMocks()
    setMockMode(false)
  })

  afterAll(() => setMockMode(true))

  it('list hits the list path with params and unwraps data + meta', async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { data: [], meta } })
    const result = await supplyListsService.list(VENDOR_ID, { status: 'active', page: 2 })
    expect(mockedHttp.get).toHaveBeenCalledWith(APIPath.SupplyLists.List(VENDOR_ID), {
      params: { status: 'active', staffId: undefined, page: 2, limit: 50 },
    })
    expect(result.meta).toEqual(meta)
    expect(result.data).toEqual([])
  })

  it('getDetail hits the detail path and unwraps { data }', async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { data: { id: LIST_ID } } })
    const result = await supplyListsService.getDetail(VENDOR_ID, LIST_ID)
    expect(mockedHttp.get).toHaveBeenCalledWith(APIPath.SupplyLists.Detail(VENDOR_ID, LIST_ID))
    expect(result).toEqual({ id: LIST_ID })
  })

  it('create posts the body WITHOUT a vendorId field (multi-tenancy)', async () => {
    const input: CreateSupplyListInput = { name: 'X', unit: 'kg', frequency: 'DAILY' }
    mockedHttp.post.mockResolvedValueOnce({ data: { data: {} } })
    await supplyListsService.create(VENDOR_ID, input)
    expect(mockedHttp.post).toHaveBeenCalledWith(APIPath.SupplyLists.List(VENDOR_ID), input)
    const body = mockedHttp.post.mock.calls[0]?.[1]
    expect(body).not.toHaveProperty('vendorId')
  })

  it('update patches the detail path', async () => {
    mockedHttp.patch.mockResolvedValueOnce({ data: { data: {} } })
    await supplyListsService.update(VENDOR_ID, LIST_ID, { name: 'Y' })
    expect(mockedHttp.patch).toHaveBeenCalledWith(
      APIPath.SupplyLists.Detail(VENDOR_ID, LIST_ID),
      { name: 'Y' },
    )
  })

  it('archive deletes the detail path and unwraps { data }', async () => {
    mockedHttp.delete.mockResolvedValueOnce({
      data: { data: { id: LIST_ID, status: 'archived' } },
    })
    const result = await supplyListsService.archive(VENDOR_ID, LIST_ID)
    expect(mockedHttp.delete).toHaveBeenCalledWith(
      APIPath.SupplyLists.Detail(VENDOR_ID, LIST_ID),
    )
    expect(result.status).toBe('archived')
  })

  it('assignStaff posts to the staff path', async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { data: {} } })
    await supplyListsService.assignStaff(VENDOR_ID, LIST_ID, {
      staffId: 's1',
      isPrimary: false,
    })
    expect(mockedHttp.post).toHaveBeenCalledWith(
      APIPath.SupplyLists.Staff(VENDOR_ID, LIST_ID),
      { staffId: 's1', isPrimary: false },
    )
  })

  it('unassignStaff deletes the staff-detail path', async () => {
    mockedHttp.delete.mockResolvedValueOnce({ data: { data: {} } })
    await supplyListsService.unassignStaff(VENDOR_ID, LIST_ID, 's1')
    expect(mockedHttp.delete).toHaveBeenCalledWith(
      APIPath.SupplyLists.StaffDetail(VENDOR_ID, LIST_ID, 's1'),
    )
  })

  it('listCustomers hits the customers path with params and unwraps data + meta', async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { data: [], meta } })
    const result = await supplyListsService.listCustomers(VENDOR_ID, LIST_ID, {
      search: 'an',
      status: 'active',
      page: 1,
    })
    expect(mockedHttp.get).toHaveBeenCalledWith(
      APIPath.SupplyLists.Customers(VENDOR_ID, LIST_ID),
      { params: { search: 'an', status: 'active', page: 1, limit: 50 } },
    )
    expect(result.meta).toEqual(meta)
  })

  it('listAvailable hits the available path with params', async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { data: [], meta } })
    await supplyListsService.listAvailable(VENDOR_ID, LIST_ID, { search: 'pr', page: 3 })
    expect(mockedHttp.get).toHaveBeenCalledWith(
      APIPath.SupplyLists.Available(VENDOR_ID, LIST_ID),
      { params: { search: 'pr', page: 3, limit: 50 } },
    )
  })

  it('addCustomers posts to the customers path WITHOUT a vendorId field', async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { data: {} } })
    await supplyListsService.addCustomers(VENDOR_ID, LIST_ID, { customerIds: ['c1'] })
    expect(mockedHttp.post).toHaveBeenCalledWith(
      APIPath.SupplyLists.Customers(VENDOR_ID, LIST_ID),
      { customerIds: ['c1'] },
    )
    const body = mockedHttp.post.mock.calls[0]?.[1]
    expect(body).not.toHaveProperty('vendorId')
  })

  it('updateSubscription patches the subscription path', async () => {
    mockedHttp.patch.mockResolvedValueOnce({ data: { data: {} } })
    await supplyListsService.updateSubscription(VENDOR_ID, LIST_ID, 'sub-1', {
      status: 'paused',
    })
    expect(mockedHttp.patch).toHaveBeenCalledWith(
      APIPath.SupplyLists.Subscription(VENDOR_ID, LIST_ID, 'sub-1'),
      { status: 'paused' },
    )
  })

  it('endSubscription deletes the subscription path', async () => {
    mockedHttp.delete.mockResolvedValueOnce({
      data: { data: { subscriptionId: 'sub-1', status: 'ended', endDate: '2026-06-11' } },
    })
    const result = await supplyListsService.endSubscription(VENDOR_ID, LIST_ID, 'sub-1')
    expect(mockedHttp.delete).toHaveBeenCalledWith(
      APIPath.SupplyLists.Subscription(VENDOR_ID, LIST_ID, 'sub-1'),
    )
    expect(result.status).toBe('ended')
  })
})
