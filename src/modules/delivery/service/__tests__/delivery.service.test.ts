/**
 * Delivery Service Tests (US-006)
 * Purpose: verify the service returns the expected shapes in mock mode, with
 * UPPERCASE statuses and STRING revenue, and that ids are strings. Runs against the
 * mock branch (isMockMode true) so no real network is touched.
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { deliveryService } from '../delivery.service'

const VENDOR_ID = 'vendor-1'

describe('deliveryService (mock mode)', () => {
  it('getToday returns a TodayResultDto with STRING revenue + UPPERCASE-friendly shape', async () => {
    const res = await deliveryService.getToday(VENDOR_ID)
    expect(typeof res.date).toBe('string')
    expect(typeof res.summary.revenue).toBe('string')
    expect(Array.isArray(res.byList)).toBe(true)
    expect(Array.isArray(res.conflicts)).toBe(true)
  })

  it('getListDeliveries returns deliveries with UPPERCASE status + string ids', async () => {
    const { result } = await deliveryService.getListDeliveries(VENDOR_ID, 'l1')
    expect(typeof result.listId).toBe('string')
    for (const d of result.deliveries) {
      expect(typeof d.id).toBe('string')
      expect(['PENDING', 'DELIVERED', 'LEAVE', 'AUTO_MARKED', 'CANCELLED']).toContain(d.status)
    }
  })

  it('getListDeliveries filters by status', async () => {
    const { result } = await deliveryService.getListDeliveries(VENDOR_ID, 'l1', { status: 'PENDING' })
    expect(result.deliveries.every((d) => d.status === 'PENDING')).toBe(true)
  })

  it('markDelivery echoes the requested status', async () => {
    const res = await deliveryService.markDelivery(VENDOR_ID, 'd-1', { status: 'DELIVERED' })
    expect(res.delivery.status).toBe('DELIVERED')
    expect(res.delivery.markedBy).not.toBeNull()
  })

  it('createLeave creates one leave per supplyListId', async () => {
    const res = await deliveryService.createLeave(VENDOR_ID, {
      customerId: 'c1',
      supplyListIds: ['l1', 'l2'],
      startDate: '2026-06-12',
      endDate: '2026-06-12',
    })
    expect(res.created).toBe(2)
    expect(res.leaves).toHaveLength(2)
  })

  it('getCalendar keys days by YYYY-MM-DD and revenue is a string', async () => {
    const res = await deliveryService.getCalendar(VENDOR_ID, '2026-06')
    expect(typeof res.summary.revenue).toBe('string')
    for (const key of Object.keys(res.days)) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('getDateDetail returns by-list, extra charges and leaves', async () => {
    const res = await deliveryService.getDateDetail(VENDOR_ID, '2026-06-12')
    expect(Array.isArray(res.byList)).toBe(true)
    expect(Array.isArray(res.extraCharges)).toBe(true)
    expect(Array.isArray(res.leaves)).toBe(true)
  })
})
