/**
 * Credit Service Tests — T-27 (US-012)
 * Runs entirely in mock mode (isMockMode = true). Verifies:
 *   - mock-mode returns for all 11 methods
 *   - correct shapes and id coercion (string, not number)
 *   - envelope parsing (data.data, data.meta)
 *   - discriminated union for enablePrepaid two-outcome
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

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
    Credit: {
      Dashboard: (v: string) => `/vendors/${v}/collections/dashboard`,
      PriorityList: (v: string) => `/vendors/${v}/collections/priority-list`,
      Analytics: (v: string) => `/vendors/${v}/collections/analytics`,
      Aging: (v: string) => `/vendors/${v}/collections/aging`,
      CreditSettings: (v: string, c: string) => `/vendors/${v}/customers/${c}/credit-settings`,
      EnablePrepaid: (v: string, c: string) => `/vendors/${v}/customers/${c}/enable-prepaid`,
      Reminders: (v: string, c: string) => `/vendors/${v}/customers/${c}/reminders`,
      SendBulk: (v: string) => `/vendors/${v}/reminders/send-bulk`,
      ReminderConfig: (v: string) => `/vendors/${v}/reminder-config`,
    },
  },
}))

import { creditService } from '../credit.service'

const VENDOR = 'vendor-1'
const CUSTOMER = 'customer-11'

describe('creditService (mock mode)', () => {
  // -------------------------------------------------------------------------
  // getDashboard
  // -------------------------------------------------------------------------
  describe('getDashboard', () => {
    it('returns CollectionsDashboardDto with correct shape', async () => {
      const result = await creditService.getDashboard(VENDOR)
      expect(typeof result.netReceivable).toBe('number')
      expect(result.outstandingOverview).toBeDefined()
      expect(typeof result.outstandingOverview.totalOutstanding).toBe('number')
      expect(result.thisMonthProgress).toBeDefined()
      expect(result.customersAtLimit).toBeDefined()
    })

    it('coerces customersAtLimit customer IDs to strings', async () => {
      const result = await creditService.getDashboard(VENDOR)
      result.customersAtLimit.forEach((c) => {
        expect(typeof c.customerId).toBe('string')
      })
    })
  })

  // -------------------------------------------------------------------------
  // getPriorityList
  // -------------------------------------------------------------------------
  describe('getPriorityList', () => {
    it('returns PriorityListDto with all four groups', async () => {
      const result = await creditService.getPriorityList(VENDOR)
      expect(Array.isArray(result.highPriority)).toBe(true)
      expect(Array.isArray(result.mediumPriority)).toBe(true)
      expect(Array.isArray(result.lowPriority)).toBe(true)
      expect(Array.isArray(result.advanceCredit)).toBe(true)
    })

    it('high priority customers have string IDs', async () => {
      const result = await creditService.getPriorityList(VENDOR)
      result.highPriority.forEach((c) => expect(typeof c.customerId).toBe('string'))
    })

    it('advance credit entries have string IDs', async () => {
      const result = await creditService.getPriorityList(VENDOR)
      result.advanceCredit.forEach((c) => expect(typeof c.customerId).toBe('string'))
    })

    it('high priority customers have phoneNumber', async () => {
      const result = await creditService.getPriorityList(VENDOR, 'oldest_first')
      const hp = result.highPriority[0]
      expect(hp).toBeDefined()
      expect(typeof hp!.phoneNumber).toBe('string')
    })
  })

  // -------------------------------------------------------------------------
  // getAnalytics
  // -------------------------------------------------------------------------
  describe('getAnalytics', () => {
    it('returns CollectionAnalyticsDto with correct shape', async () => {
      const result = await creditService.getAnalytics(VENDOR)
      expect(typeof result.month).toBe('string')
      expect(result.monthlySummary).toBeDefined()
      expect(result.paymentModeBreakdown).toBeDefined()
      expect(Array.isArray(result.collectionTrend)).toBe(true)
      expect(Array.isArray(result.topPayers)).toBe(true)
      expect(Array.isArray(result.defaulters)).toBe(true)
    })

    it('overrides month when provided', async () => {
      const result = await creditService.getAnalytics(VENDOR, '2026-01')
      expect(result.month).toBe('2026-01')
    })

    it('coerces topPayer customer IDs to strings', async () => {
      const result = await creditService.getAnalytics(VENDOR)
      result.topPayers.forEach((c) => expect(typeof c.customerId).toBe('string'))
    })

    it('coerces defaulter customer IDs to strings', async () => {
      const result = await creditService.getAnalytics(VENDOR)
      result.defaulters.forEach((c) => expect(typeof c.customerId).toBe('string'))
    })
  })

  // -------------------------------------------------------------------------
  // getAging
  // -------------------------------------------------------------------------
  describe('getAging', () => {
    it('returns AgingDto with three buckets', async () => {
      const result = await creditService.getAging(VENDOR)
      expect(typeof result.totalOutstanding).toBe('number')
      expect(result.fresh_0_30).toBeDefined()
      expect(result.overdue_30_60).toBeDefined()
      expect(result.critical_60_plus).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // getReminderHistory
  // -------------------------------------------------------------------------
  describe('getReminderHistory', () => {
    it('returns data + meta envelope', async () => {
      const result = await creditService.getReminderHistory(VENDOR, CUSTOMER)
      expect(result.data).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(typeof result.meta.page).toBe('number')
      expect(typeof result.meta.limit).toBe('number')
      expect(typeof result.meta.total).toBe('number')
      expect(typeof result.meta.totalPages).toBe('number')
    })

    it('reminder IDs are strings', async () => {
      const { data } = await creditService.getReminderHistory(VENDOR, CUSTOMER)
      data.reminders.forEach((r) => expect(typeof r.id).toBe('string'))
    })

    it('data has totalReminders and successRate', async () => {
      const { data } = await creditService.getReminderHistory(VENDOR, CUSTOMER)
      expect(typeof data.totalReminders).toBe('number')
      expect(typeof data.successRate).toBe('number')
    })
  })

  // -------------------------------------------------------------------------
  // getReminderConfig
  // -------------------------------------------------------------------------
  describe('getReminderConfig', () => {
    it('returns ReminderConfigDto with boolean flags', async () => {
      const result = await creditService.getReminderConfig(VENDOR)
      expect(typeof result.autoRemindersEnabled).toBe('boolean')
      expect(typeof result.schedule3Days).toBe('boolean')
      expect(typeof result.schedule15Days).toBe('boolean')
      expect(typeof result.schedule30Days).toBe('boolean')
      expect(Array.isArray(result.excludedCustomerIds)).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // updateCreditSettings
  // -------------------------------------------------------------------------
  describe('updateCreditSettings', () => {
    it('returns CreditSettingsResultDto with patched values', async () => {
      const patch = { creditType: 'normal' as const, warningThreshold: 70 }
      const result = await creditService.updateCreditSettings(VENDOR, CUSTOMER, patch)
      expect(typeof result.customerId).toBe('string')
      expect(typeof result.breached).toBe('boolean')
    })

    it('customerId is a string on return', async () => {
      const result = await creditService.updateCreditSettings(VENDOR, CUSTOMER, {})
      expect(typeof result.customerId).toBe('string')
    })
  })

  // -------------------------------------------------------------------------
  // enablePrepaid — two-outcome (SHOULD-FIX-1 in service review: both branches)
  // -------------------------------------------------------------------------
  describe('enablePrepaid', () => {
    it('returns success outcome when clearOutstandingFirst=false', async () => {
      const result = await creditService.enablePrepaid(VENDOR, CUSTOMER, { clearOutstandingFirst: false })
      expect(result.clearOutstandingRequired).toBe(false)
      expect(typeof result.customerId).toBe('string')
    })

    it('returns blocked outcome when clearOutstandingFirst=true', async () => {
      const result = await creditService.enablePrepaid(VENDOR, CUSTOMER, { clearOutstandingFirst: true })
      expect(result.clearOutstandingRequired).toBe(true)
      // outstanding must be present in blocked outcome
      const blocked = result as Extract<typeof result, { clearOutstandingRequired: true }>
      expect(typeof blocked.outstanding).toBe('number')
    })

    it('returns distinct outcomes for the two branches (discriminated union)', async () => {
      const success = await creditService.enablePrepaid(VENDOR, CUSTOMER, { clearOutstandingFirst: false })
      const blocked = await creditService.enablePrepaid(VENDOR, CUSTOMER, { clearOutstandingFirst: true })
      expect(success.clearOutstandingRequired).toBe(false)
      expect(blocked.clearOutstandingRequired).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // sendReminder
  // -------------------------------------------------------------------------
  describe('sendReminder', () => {
    it('returns SendReminderResultDto with string IDs', async () => {
      const result = await creditService.sendReminder(VENDOR, CUSTOMER)
      expect(typeof result.reminderId).toBe('string')
      expect(typeof result.customerId).toBe('string')
      expect(typeof result.skipped).toBe('boolean')
    })
  })

  // -------------------------------------------------------------------------
  // sendBulkReminders
  // -------------------------------------------------------------------------
  describe('sendBulkReminders', () => {
    it('returns BulkReminderResultDto with sent/skipped/failed counts', async () => {
      const result = await creditService.sendBulkReminders(VENDOR, { target: 'all_overdue' })
      expect(typeof result.sent).toBe('number')
      expect(typeof result.skipped).toBe('number')
      expect(typeof result.failed).toBe('number')
    })
  })

  // -------------------------------------------------------------------------
  // updateReminderConfig
  // -------------------------------------------------------------------------
  describe('updateReminderConfig', () => {
    it('merges patch into returned config', async () => {
      const result = await creditService.updateReminderConfig(VENDOR, { autoRemindersEnabled: true })
      expect(result.autoRemindersEnabled).toBe(true)
    })

    it('excludedCustomerIds is an array of strings', async () => {
      const result = await creditService.updateReminderConfig(VENDOR, {})
      expect(Array.isArray(result.excludedCustomerIds)).toBe(true)
      result.excludedCustomerIds.forEach((id) => expect(typeof id).toBe('string'))
    })
  })
})
