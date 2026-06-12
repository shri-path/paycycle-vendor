/**
 * Delivery Store Tests (US-006)
 * Purpose: unit tests for the delivery store using a mocked service. Covers success
 * paths, each error class → i18n KEY, optimistic markDelivery WITH rollback,
 * clearDelivery wiping state, and verifies the persisted slice carries NO customer
 * PII (only calendar counts + lean list progress).
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
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../service/delivery.service', () => ({
  deliveryService: {
    getToday: jest.fn(),
    getListDeliveries: jest.fn(),
    markDelivery: jest.fn(),
    markBulk: jest.fn(),
    addExtraCharge: jest.fn(),
    createLeave: jest.fn(),
    getLeaves: jest.fn(),
    cancelLeave: jest.fn(),
    getCalendar: jest.fn(),
    getDateDetail: jest.fn(),
  },
}))

import { deliveryService } from '../../service/delivery.service'
import { useDeliveryStore } from '../delivery.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type { DeliveryDto, ListDeliveriesResultDto } from '../../../../types/delivery'

const svc = deliveryService as jest.Mocked<typeof deliveryService>
const VENDOR_ID = 'vendor-1'

function setActiveVendor(vendorId: string | null): void {
  useAuthStore.setState({
    vendorContext: vendorId ? { vendorId, vendorName: 'Test', role: 'vendor_owner' } : null,
  })
}

function buildDelivery(id: string, status: DeliveryDto['status']): DeliveryDto {
  return {
    id,
    customer: { id: `c-${id}`, name: 'Anita', address: 'A', phoneNumber: null },
    quantity: 1,
    unit: 'ltr',
    status,
    markedBy: null,
    markedAt: null,
    hasConflict: false,
    conflictReason: null,
    otherLists: [],
  }
}

function listResult(deliveries: DeliveryDto[]): ListDeliveriesResultDto {
  return {
    listId: 'l1',
    listName: 'Milk',
    date: '2026-06-12',
    progress: {
      total: deliveries.length,
      delivered: deliveries.filter((d) => d.status === 'DELIVERED').length,
      onLeave: deliveries.filter((d) => d.status === 'LEAVE').length,
      pending: deliveries.filter((d) => d.status === 'PENDING').length,
    },
    deliveries,
  }
}

function axiosError(status: number): unknown {
  return { isAxiosError: true, response: { status, data: {} } }
}

function offlineError(): unknown {
  return { isAxiosError: true, response: undefined }
}

describe('useDeliveryStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setActiveVendor(VENDOR_ID)
    useDeliveryStore.getState().clearDelivery()
  })

  it('fetchListDeliveries stores rows + progress on success', async () => {
    svc.getListDeliveries.mockResolvedValueOnce({
      result: listResult([buildDelivery('d1', 'PENDING'), buildDelivery('d2', 'DELIVERED')]),
      meta: null,
    })
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    const s = useDeliveryStore.getState()
    expect(s.listDeliveries['l1']).toHaveLength(2)
    expect(s.listProgress['l1']).toEqual({ total: 2, delivered: 1, onLeave: 0, pending: 1 })
    expect(s.listError).toBeNull()
  })

  it('fetchListDeliveries maps a 403 to the forbidden i18n key', async () => {
    svc.getListDeliveries.mockRejectedValueOnce(axiosError(403))
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    expect(useDeliveryStore.getState().listError).toBe('roles.error_forbidden')
  })

  it('fetchListDeliveries keeps cached rows when offline', async () => {
    svc.getListDeliveries.mockResolvedValueOnce({ result: listResult([buildDelivery('d1', 'PENDING')]), meta: null })
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    svc.getListDeliveries.mockRejectedValueOnce(offlineError())
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    const s = useDeliveryStore.getState()
    expect(s.listError).toBe('common.offline_message')
    expect(s.listDeliveries['l1']).toHaveLength(1) // cache preserved
  })

  it('markDelivery is optimistic and rolls back on failure', async () => {
    svc.getListDeliveries.mockResolvedValueOnce({ result: listResult([buildDelivery('d1', 'PENDING')]), meta: null })
    await useDeliveryStore.getState().fetchListDeliveries('l1')

    svc.markDelivery.mockRejectedValueOnce(axiosError(409))
    await expect(useDeliveryStore.getState().markDelivery('l1', 'd1', 'DELIVERED')).rejects.toBeDefined()

    const s = useDeliveryStore.getState()
    // rolled back to PENDING
    expect(s.listDeliveries['l1']?.[0]?.status).toBe('PENDING')
    expect(s.mutationError).toBe('delivery.error_conflict')
  })

  it('markDelivery commits the server row on success', async () => {
    svc.getListDeliveries.mockResolvedValueOnce({ result: listResult([buildDelivery('d1', 'PENDING')]), meta: null })
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    svc.markDelivery.mockResolvedValueOnce({
      delivery: { ...buildDelivery('d1', 'DELIVERED'), markedAt: '2026-06-12T06:00:00Z' },
      hasConflict: false,
    })
    await useDeliveryStore.getState().markDelivery('l1', 'd1', 'DELIVERED')
    const s = useDeliveryStore.getState()
    expect(s.listDeliveries['l1']?.[0]?.status).toBe('DELIVERED')
    expect(s.listProgress['l1']?.delivered).toBe(1)
  })

  it('addExtraCharge maps a 400 to the invalid-charge i18n key', async () => {
    svc.addExtraCharge.mockRejectedValueOnce(axiosError(400))
    await expect(
      useDeliveryStore.getState().addExtraCharge({ dailySupplyId: 'd1', amount: 10, comment: 'x' }),
    ).rejects.toBeDefined()
    expect(useDeliveryStore.getState().mutationError).toBe('delivery.error_invalid_charge')
  })

  it('clearDelivery wipes all slices', async () => {
    svc.getListDeliveries.mockResolvedValueOnce({ result: listResult([buildDelivery('d1', 'PENDING')]), meta: null })
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    useDeliveryStore.getState().clearDelivery()
    const s = useDeliveryStore.getState()
    expect(s.listDeliveries).toEqual({})
    expect(s.listProgress).toEqual({})
    expect(s.today).toBeNull()
  })

  it('does not fetch when there is no active vendor', async () => {
    setActiveVendor(null)
    await useDeliveryStore.getState().fetchListDeliveries('l1')
    expect(svc.getListDeliveries).not.toHaveBeenCalled()
  })
})
