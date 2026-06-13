/**
 * Settings Service Tests (US-011)
 * Runs against mock mode (isMockMode = true). Verifies correct shapes,
 * content, and mock-first fixtures for all service methods.
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { settingsService } from '../settings.service'

const VENDOR_ID = 'vendor-1'

describe('settingsService (mock mode)', () => {
  // ---------------------------------------------------------------------------
  // getSettings
  // ---------------------------------------------------------------------------
  describe('getSettings', () => {
    it('returns a VendorSettingsDto with correct shape', async () => {
      const settings = await settingsService.getSettings(VENDOR_ID)
      expect(typeof settings.autoMarkEnabled).toBe('boolean')
      expect(typeof settings.autoSendBillsEnabled).toBe('boolean')
      expect(typeof settings.autoSendBillsTime).toBe('string')
      expect(typeof settings.defaultCreditLimit).toBe('number')
      expect(['warn', 'pause', 'block']).toContain(settings.defaultCreditAction)
      expect(settings.notificationPreferences).toBeDefined()
    })

    it('returns notification preferences with all 4 categories', async () => {
      const settings = await settingsService.getSettings(VENDOR_ID)
      const { notificationPreferences: prefs } = settings
      expect(prefs.channels).toBeDefined()
      expect(prefs.payment).toBeDefined()
      expect(prefs.customer).toBeDefined()
      expect(prefs.operations).toBeDefined()
    })

    it('channels has push, whatsapp, sms booleans', async () => {
      const settings = await settingsService.getSettings(VENDOR_ID)
      const { channels } = settings.notificationPreferences
      expect(typeof channels.push).toBe('boolean')
      expect(typeof channels.whatsapp).toBe('boolean')
      expect(typeof channels.sms).toBe('boolean')
    })
  })

  // ---------------------------------------------------------------------------
  // updateSettings
  // ---------------------------------------------------------------------------
  describe('updateSettings', () => {
    it('merges the patch into returned settings', async () => {
      const result = await settingsService.updateSettings(VENDOR_ID, { autoMarkEnabled: false })
      expect(result.autoMarkEnabled).toBe(false)
    })

    it('does not change other fields when only autoMarkEnabled is patched', async () => {
      const original = await settingsService.getSettings(VENDOR_ID)
      const result = await settingsService.updateSettings(VENDOR_ID, { autoMarkEnabled: false })
      expect(result.defaultCreditLimit).toBe(original.defaultCreditLimit)
    })
  })

  // ---------------------------------------------------------------------------
  // updateNotificationPreferences
  // ---------------------------------------------------------------------------
  describe('updateNotificationPreferences', () => {
    it('returns updated settings with merged notif prefs', async () => {
      const original = await settingsService.getSettings(VENDOR_ID)
      const newPrefs = {
        ...original.notificationPreferences,
        channels: { push: false, whatsapp: false, sms: false },
      }
      const result = await settingsService.updateNotificationPreferences(VENDOR_ID, newPrefs)
      expect(result.notificationPreferences.channels.push).toBe(false)
      expect(result.notificationPreferences.channels.whatsapp).toBe(false)
      expect(result.notificationPreferences.channels.sms).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // getLeaveImpact
  // ---------------------------------------------------------------------------
  describe('getLeaveImpact', () => {
    it('returns a BulkLeaveImpactDto with correct shape', async () => {
      const impact = await settingsService.getLeaveImpact(VENDOR_ID, {
        startDate: '2026-06-20',
        endDate: '2026-06-20',
      })
      expect(typeof impact.customersAffected).toBe('number')
      expect(typeof impact.days).toBe('number')
      expect(typeof impact.totalLeaves).toBe('number')
      expect(typeof impact.revenueImpact).toBe('number')
    })

    it('computes days=1 for single day range', async () => {
      const impact = await settingsService.getLeaveImpact(VENDOR_ID, {
        startDate: '2026-06-20',
        endDate: '2026-06-20',
      })
      expect(impact.days).toBe(1)
    })

    it('computes days=3 for a 3-day range', async () => {
      const impact = await settingsService.getLeaveImpact(VENDOR_ID, {
        startDate: '2026-06-20',
        endDate: '2026-06-22',
      })
      expect(impact.days).toBe(3)
    })
  })

  // ---------------------------------------------------------------------------
  // bulkMarkLeave
  // ---------------------------------------------------------------------------
  describe('bulkMarkLeave', () => {
    it('returns a BulkLeaveResultDto with operationId string', async () => {
      const result = await settingsService.bulkMarkLeave(VENDOR_ID, {
        startDate: '2026-06-20',
        endDate: '2026-06-20',
      })
      expect(typeof result.operationId).toBe('string')
      expect(result.summary).toBeDefined()
      expect(typeof result.summary.customersAffected).toBe('number')
    })

    it('sends correct body including optional customerIds', async () => {
      const result = await settingsService.bulkMarkLeave(VENDOR_ID, {
        startDate: '2026-06-20',
        endDate: '2026-06-20',
        customerIds: ['c-1', 'c-2'],
        reason: 'Holiday',
      })
      expect(result.operationId).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // getRateImpact
  // ---------------------------------------------------------------------------
  describe('getRateImpact', () => {
    it('returns a BulkRateImpactDto with correct shape', async () => {
      const impact = await settingsService.getRateImpact(VENDOR_ID, {
        scope: 'single_list',
        supplyListId: 'list-1',
        newRate: 65,
        effectiveFrom: '2026-07-01',
        notifyCustomers: true,
      })
      expect(typeof impact.listsAffected).toBe('number')
      expect(typeof impact.customersAffected).toBe('number')
      expect(typeof impact.rateChange).toBe('number')
      expect(typeof impact.monthlyImpact).toBe('number')
    })

    it('reflects the requested newRate in rateChange', async () => {
      const impact = await settingsService.getRateImpact(VENDOR_ID, {
        scope: 'single_list',
        supplyListId: 'list-1',
        newRate: 70,
        effectiveFrom: '2026-07-01',
        notifyCustomers: false,
      })
      expect(impact.rateChange).toBe(70)
    })
  })

  // ---------------------------------------------------------------------------
  // bulkAdjustRate
  // ---------------------------------------------------------------------------
  describe('bulkAdjustRate', () => {
    it('returns a BulkRateResultDto with operationId', async () => {
      const result = await settingsService.bulkAdjustRate(VENDOR_ID, {
        scope: 'single_list',
        supplyListId: 'list-1',
        newRate: 65,
        effectiveFrom: '2026-07-01',
        notifyCustomers: true,
      })
      expect(typeof result.operationId).toBe('string')
      expect(result.summary).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // bulkSendReminders
  // ---------------------------------------------------------------------------
  describe('bulkSendReminders', () => {
    it('returns a BulkReminderResultDto with correct summary shape', async () => {
      const result = await settingsService.bulkSendReminders(VENDOR_ID, {
        targetType: 'overdue',
        sendVia: 'whatsapp',
      })
      expect(typeof result.operationId).toBe('string')
      expect(typeof result.summary.totalSent).toBe('number')
      expect(typeof result.summary.delivered).toBe('number')
      expect(typeof result.summary.failed).toBe('number')
    })

    it('totalSent = delivered + failed', async () => {
      const result = await settingsService.bulkSendReminders(VENDOR_ID, {
        targetType: 'overdue',
        sendVia: 'whatsapp',
      })
      expect(result.summary.totalSent).toBe(
        result.summary.delivered + result.summary.failed,
      )
    })
  })
})
