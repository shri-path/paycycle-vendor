/**
 * Dashboard service tests (US-010)
 * Mock-mode: all methods return fixtures after a simulated delay.
 */

import { dashboardService } from '../dashboard.service'
import {
  mockOwnerDashboard,
  mockStaffDashboard,
  mockOutstandingAging,
  mockVendorSettings,
} from '../dashboard.mock'

// Mock config to always use mock mode
jest.mock('@services/config', () => ({
  isMockMode: true,
  simulateNetworkDelay: () => Promise.resolve(),
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', timeout: 30000 },
}))

// Mock http client so it is never actually created
jest.mock('@services/http', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@constants/apiPaths', () => ({
  APIPath: {
    Dashboard: {
      Owner: (v: string) => `/vendors/${v}/dashboard/owner`,
      Staff: (v: string) => `/vendors/${v}/dashboard/staff`,
      Forecast: (v: string) => `/vendors/${v}/supply-forecast`,
      OutstandingAging: (v: string) => `/vendors/${v}/outstanding-aging`,
      Settings: (v: string) => `/vendors/${v}/settings`,
    },
  },
}))

const VENDOR = 'vendor-123'

describe('dashboardService (mock mode)', () => {
  it('getOwnerDashboard returns fixture', async () => {
    const result = await dashboardService.getOwnerDashboard(VENDOR)
    expect(result.currentMonth).toBe(mockOwnerDashboard.currentMonth)
    expect(result.financial.totalRevenue).toBe(mockOwnerDashboard.financial.totalRevenue)
    expect(result.todaySupplyLists.length).toBeGreaterThan(0)
    // All IDs must be strings
    result.todaySupplyLists.forEach((l) => expect(typeof l.id).toBe('string'))
  })

  it('getStaffDashboard returns fixture with NO monetary fields', async () => {
    const result = await dashboardService.getStaffDashboard(VENDOR)
    expect(result.staffName).toBe(mockStaffDashboard.staffName)
    expect(result.todayProgress.total).toBeGreaterThan(0)
    // Monetary fields must not exist on the result
    const r = result as unknown as Record<string, unknown>
    expect(r['revenue']).toBeUndefined()
    expect(r['amount']).toBeUndefined()
    expect(r['collected']).toBeUndefined()
    expect(r['pending']).toBeUndefined()
  })

  it('getSupplyForecast returns fixture for days=1 without next7Days', async () => {
    const result = await dashboardService.getSupplyForecast(VENDOR, { days: 1 })
    expect(result.byList.length).toBeGreaterThan(0)
    expect(result.next7Days).toBeUndefined()
  })

  it('getSupplyForecast returns fixture for days=7 with next7Days', async () => {
    const result = await dashboardService.getSupplyForecast(VENDOR, { days: 7 })
    expect(result.next7Days).toBeDefined()
  })

  it('getSupplyForecast filters by supplyType', async () => {
    const result = await dashboardService.getSupplyForecast(VENDOR, { days: 7, supplyType: 'milk' })
    expect(result.byList.every((r) => r.supplyType === 'milk')).toBe(true)
  })

  it('getOutstandingAging returns fixture with string customer IDs', async () => {
    const result = await dashboardService.getOutstandingAging(VENDOR)
    expect(result.summary.totalOutstanding).toBe(mockOutstandingAging.summary.totalOutstanding)
    result.priorityCustomers.high.forEach((c) => expect(typeof c.customerId).toBe('string'))
    result.advanceCredit.customers.forEach((c) => expect(typeof c.customerId).toBe('string'))
  })

  it('updateSettings returns merged settings', async () => {
    const result = await dashboardService.updateSettings(VENDOR, { autoMarkEnabled: false })
    expect(result.autoMarkEnabled).toBe(false)
    // Other settings preserved from mock
    expect(result.autoSendBillsEnabled).toBe(mockVendorSettings.autoSendBillsEnabled)
  })
})
