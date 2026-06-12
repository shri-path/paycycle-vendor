/**
 * Subscription Service Tests (US-009)
 * Runs against mock mode (isMockMode = true). Verifies correct shapes and
 * content for all 7 service methods.
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { subscriptionService } from '../subscription.service'

const VENDOR_ID = 'vendor-1'

describe('subscriptionService (mock mode)', () => {
  describe('getPlans', () => {
    it('returns an array of PlanDtos', async () => {
      const plans = await subscriptionService.getPlans()
      expect(Array.isArray(plans)).toBe(true)
      expect(plans.length).toBeGreaterThan(0)
    })

    it('all plan ids are strings', async () => {
      const plans = await subscriptionService.getPlans()
      for (const p of plans) {
        expect(typeof p.id).toBe('string')
        expect(typeof p.planCode).toBe('string')
        expect(typeof p.planName).toBe('string')
        expect(typeof p.priceMonthly).toBe('number')
      }
    })

    it('PRO plan has maxCustomers = 0 (unlimited)', async () => {
      const plans = await subscriptionService.getPlans()
      const pro = plans.find((p) => p.planCode === 'PRO')
      expect(pro).toBeDefined()
      expect(pro!.maxCustomers).toBe(0)
      expect(pro!.maxStaff).toBe(0)
      expect(pro!.maxSupplyLists).toBe(0)
    })

    it('STARTER plan has priceMonthly = 0', async () => {
      const plans = await subscriptionService.getPlans()
      const starter = plans.find((p) => p.planCode === 'STARTER')
      expect(starter).toBeDefined()
      expect(starter!.priceMonthly).toBe(0)
      expect(starter!.priceYearly).toBeNull()
    })
  })

  describe('getSubscription', () => {
    it('returns a SubscriptionViewDto with the expected shape', async () => {
      const sub = await subscriptionService.getSubscription(VENDOR_ID)
      expect(typeof sub.currentPlan.subscriptionId).toBe('string')
      expect(typeof sub.currentPlan.planCode).toBe('string')
      expect(typeof sub.currentPlan.status).toBe('string')
      expect(typeof sub.usage.customers).toBe('number')
      expect(typeof sub.utilizationPercentage.customers).toBe('number')
      expect(typeof sub.canAddMore.customers).toBe('boolean')
    })
  })

  describe('upgradeSubscription', () => {
    it('returns UpgradeResultDto with subscription + invoice', async () => {
      const result = await subscriptionService.upgradeSubscription(VENDOR_ID, '3', 'MONTHLY')
      expect(typeof result.subscription.subscriptionId).toBe('string')
      expect(typeof result.invoice.id).toBe('string')
      expect(typeof result.invoice.totalAmount).toBe('number')
    })
  })

  describe('renewSubscription', () => {
    it('returns RenewResultDto with subscription + invoice', async () => {
      const result = await subscriptionService.renewSubscription(VENDOR_ID, 'MONTHLY')
      expect(typeof result.subscription.subscriptionId).toBe('string')
      expect(typeof result.invoice.id).toBe('string')
    })
  })

  describe('cancelSubscription', () => {
    it('returns CancelResultDto with CANCELLED status', async () => {
      const result = await subscriptionService.cancelSubscription(VENDOR_ID)
      expect(result.status).toBe('CANCELLED')
      expect(result.autoRenewal).toBe(false)
      expect(typeof result.subscriptionId).toBe('string')
    })
  })

  describe('toggleAutoRenewal', () => {
    it('returns AutoRenewalResultDto with the requested value', async () => {
      const on = await subscriptionService.toggleAutoRenewal(VENDOR_ID, true)
      expect(on.autoRenewal).toBe(true)

      const off = await subscriptionService.toggleAutoRenewal(VENDOR_ID, false)
      expect(off.autoRenewal).toBe(false)
    })
  })

  describe('getInvoices', () => {
    it('returns { data: InvoiceDto[], meta: PaginationMeta }', async () => {
      const result = await subscriptionService.getInvoices(VENDOR_ID)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length).toBeGreaterThan(0)
      expect(typeof result.meta.total).toBe('number')
      expect(typeof result.meta.page).toBe('number')
    })

    it('all invoice ids are strings', async () => {
      const { data } = await subscriptionService.getInvoices(VENDOR_ID)
      for (const inv of data) {
        expect(typeof inv.id).toBe('string')
        expect(typeof inv.invoiceNumber).toBe('string')
        expect(typeof inv.totalAmount).toBe('number')
        expect(typeof inv.paymentStatus).toBe('string')
      }
    })
  })

  describe('getHistory', () => {
    it('returns { data: HistoryEventDto[], meta: PaginationMeta }', async () => {
      const result = await subscriptionService.getHistory(VENDOR_ID)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length).toBeGreaterThan(0)
      expect(typeof result.data[0]!.id).toBe('string')
      expect(typeof result.data[0]!.eventType).toBe('string')
    })
  })
})
