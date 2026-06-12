/**
 * Customers Service Tests (US-008, WS-4)
 * Purpose: verify the service returns the expected shapes in mock mode.
 * Covers:
 *   - Non-standard list envelope: `data: { total, customers }` — no meta.
 *     listCustomers() must return { total, customers } directly.
 *   - Standard meta envelope for listPayments: `{ data: PaymentDto[], meta }`.
 *   - All ids are strings.
 *   - Mock search + status filtering.
 *   - Mock pagination.
 *   - All other methods return the correct DTO shapes.
 *
 * Pattern: mirrors delivery.service.test.ts from US-006. Runs against the
 * mock branch (isMockMode true) — no real network is touched.
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { customersService } from '../customers.service'

const VENDOR_ID = 'vendor-1'
const CUSTOMER_ID = '10'
const MONTH = '2026-06'

describe('customersService (mock mode)', () => {
  // -------------------------------------------------------------------------
  // listCustomers — non-standard envelope
  // -------------------------------------------------------------------------

  describe('listCustomers', () => {
    it('returns { total, customers } directly (non-standard envelope — no meta)', async () => {
      const result = await customersService.listCustomers(VENDOR_ID)
      expect(typeof result.total).toBe('number')
      expect(Array.isArray(result.customers)).toBe(true)
      // The mock data has ≥30 customers in total (total reflects full count, not page size).
      expect(result.total).toBeGreaterThanOrEqual(30)
    })

    it('result does NOT have a meta property (non-standard shape)', async () => {
      const result = await customersService.listCustomers(VENDOR_ID) as unknown as Record<string, unknown>
      expect(result.meta).toBeUndefined()
    })

    it('all customer ids are strings', async () => {
      const { customers } = await customersService.listCustomers(VENDOR_ID)
      for (const c of customers) {
        expect(typeof c.id).toBe('string')
      }
    })

    it('all required fields are present on each customer row', async () => {
      const { customers } = await customersService.listCustomers(VENDOR_ID)
      for (const c of customers) {
        expect(typeof c.name).toBe('string')
        expect(typeof c.phoneNumber).toBe('string')
        expect(typeof c.customerSince).toBe('string')
        expect(typeof c.status).toBe('string')
        expect(Array.isArray(c.supplyLists)).toBe(true)
        // All status values are UPPERCASE.
        expect(['ACTIVE', 'INACTIVE']).toContain(c.status)
      }
    })

    it('owner-only financial fields (monthlyTotal, paymentStatus) are populated in mock', async () => {
      const { customers } = await customersService.listCustomers(VENDOR_ID)
      // Mock always returns owner view (financial fields non-null).
      const withTotal = customers.filter((c) => c.monthlyTotal !== null)
      expect(withTotal.length).toBeGreaterThan(0)
    })

    it('filters customers by search (name or phone contains)', async () => {
      // Customer "Anil Kumar" is in the mock list (id=1).
      const { customers } = await customersService.listCustomers(VENDOR_ID, { search: 'Anil' })
      expect(customers.length).toBeGreaterThan(0)
      for (const c of customers) {
        const matches =
          c.name.toLowerCase().includes('anil') ||
          c.phoneNumber.toLowerCase().includes('anil')
        expect(matches).toBe(true)
      }
    })

    it('filters customers by payment status', async () => {
      const { customers } = await customersService.listCustomers(VENDOR_ID, { status: 'paid' })
      for (const c of customers) {
        expect(c.paymentStatus).toBe('paid')
      }
    })

    it('paginates results: page 2 returns the next slice', async () => {
      const page1 = await customersService.listCustomers(VENDOR_ID, { page: 1, limit: 10 })
      const page2 = await customersService.listCustomers(VENDOR_ID, { page: 2, limit: 10 })
      expect(page1.customers.length).toBeLessThanOrEqual(10)
      expect(page2.customers.length).toBeLessThanOrEqual(10)
      // Pages should not overlap.
      const ids1 = new Set(page1.customers.map((c) => c.id))
      for (const c of page2.customers) {
        expect(ids1.has(c.id)).toBe(false)
      }
    })

    it('total reflects the full unfiltered count, not just the page', async () => {
      const result = await customersService.listCustomers(VENDOR_ID, { page: 1, limit: 5 })
      expect(result.total).toBeGreaterThan(5)
    })
  })

  // -------------------------------------------------------------------------
  // getCustomer
  // -------------------------------------------------------------------------

  describe('getCustomer', () => {
    it('returns a CustomerDetailDto with string id and correct structure', async () => {
      const detail = await customersService.getCustomer(VENDOR_ID, CUSTOMER_ID)
      expect(typeof detail.id).toBe('string')
      expect(typeof detail.name).toBe('string')
      expect(typeof detail.phoneNumber).toBe('string')
      expect(typeof detail.customerSince).toBe('string')
      expect(['ACTIVE', 'INACTIVE']).toContain(detail.status)
      expect(Array.isArray(detail.subscriptions)).toBe(true)
    })

    it('owner-only financial fields are present in mock (currentBalance, paymentScore, etc.)', async () => {
      const detail = await customersService.getCustomer(VENDOR_ID, CUSTOMER_ID)
      expect(typeof detail.currentBalance).toBe('number')
      expect(typeof detail.paymentScore).toBe('number')
      expect(typeof detail.creditUtilization).toBe('number')
    })

    it('paymentHistory is an array', async () => {
      const detail = await customersService.getCustomer(VENDOR_ID, CUSTOMER_ID)
      expect(Array.isArray(detail.paymentHistory)).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // createCustomer
  // -------------------------------------------------------------------------

  describe('createCustomer', () => {
    it('returns a CustomerDetailDto with a string id', async () => {
      const result = await customersService.createCustomer(VENDOR_ID, {
        name: 'New Customer',
        phone: '9000000001',
      })
      expect(typeof result.id).toBe('string')
      expect(result.name).toBe('New Customer')
    })

    it('reflects the provided phone in phoneNumber field (with country code)', async () => {
      const result = await customersService.createCustomer(VENDOR_ID, {
        name: 'Test',
        phone: '9876543210',
        phoneCountryCode: '+91',
      })
      expect(result.phoneNumber).toContain('9876543210')
    })
  })

  // -------------------------------------------------------------------------
  // updateCustomer
  // -------------------------------------------------------------------------

  describe('updateCustomer', () => {
    it('returns a CustomerDetailDto for the given customerId', async () => {
      const result = await customersService.updateCustomer(VENDOR_ID, CUSTOMER_ID, { name: 'Updated' })
      expect(typeof result.id).toBe('string')
    })
  })

  // -------------------------------------------------------------------------
  // deactivateCustomer
  // -------------------------------------------------------------------------

  describe('deactivateCustomer', () => {
    it('resolves void (no return value)', async () => {
      const result = await customersService.deactivateCustomer(VENDOR_ID, CUSTOMER_ID)
      expect(result).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // getBill
  // -------------------------------------------------------------------------

  describe('getBill', () => {
    it('returns a MonthlyBillDto with correct structure', async () => {
      const bill = await customersService.getBill(VENDOR_ID, CUSTOMER_ID, MONTH)
      expect(typeof bill.customerId).toBe('string')
      expect(typeof bill.month).toBe('string')
      expect(Array.isArray(bill.billDetails.byList)).toBe(true)
      expect(Array.isArray(bill.billDetails.extraCharges)).toBe(true)
      expect(typeof bill.billDetails.subtotal).toBe('number')
      expect(typeof bill.billDetails.totalDue).toBe('number')
      expect(['paid', 'pending', 'overdue']).toContain(bill.paymentStatus)
    })

    it('uses the passed customerId in the returned bill', async () => {
      const bill = await customersService.getBill(VENDOR_ID, 'c99', MONTH)
      expect(bill.customerId).toBe('c99')
    })

    it('uses the passed month in the returned bill', async () => {
      const bill = await customersService.getBill(VENDOR_ID, CUSTOMER_ID, '2025-12')
      expect(bill.month).toBe('2025-12')
    })
  })

  // -------------------------------------------------------------------------
  // recordPayment
  // -------------------------------------------------------------------------

  describe('recordPayment', () => {
    it('returns a PaymentDto with string id, number amount, UPPERCASE method', async () => {
      const payment = await customersService.recordPayment(VENDOR_ID, CUSTOMER_ID, {
        amount: 500,
        paymentDate: '2026-06-12',
        paymentMethod: 'UPI',
      })
      expect(typeof payment.id).toBe('string')
      expect(typeof payment.amount).toBe('number')
      expect(payment.amount).toBe(500)
      expect(payment.method).toBe('UPI')
      expect(typeof payment.date).toBe('string')
      expect(typeof payment.createdAt).toBe('string')
    })

    it('preserves the reference number when provided', async () => {
      const payment = await customersService.recordPayment(VENDOR_ID, CUSTOMER_ID, {
        amount: 100,
        paymentDate: '2026-06-12',
        paymentMethod: 'ONLINE',
        referenceNumber: 'REF-001',
      })
      expect(payment.reference).toBe('REF-001')
    })
  })

  // -------------------------------------------------------------------------
  // listPayments — STANDARD meta envelope
  // -------------------------------------------------------------------------

  describe('listPayments', () => {
    it('returns { data: PaymentDto[], meta } — standard meta envelope', async () => {
      const result = await customersService.listPayments(VENDOR_ID, CUSTOMER_ID)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.meta).toBeDefined()
      expect(typeof result.meta.page).toBe('number')
      expect(typeof result.meta.limit).toBe('number')
      expect(typeof result.meta.total).toBe('number')
      expect(typeof result.meta.totalPages).toBe('number')
    })

    it('all payment ids are strings', async () => {
      const { data } = await customersService.listPayments(VENDOR_ID, CUSTOMER_ID)
      for (const p of data) {
        expect(typeof p.id).toBe('string')
      }
    })

    it('paginates payments correctly', async () => {
      const page1 = await customersService.listPayments(VENDOR_ID, CUSTOMER_ID, { page: 1, limit: 2 })
      expect(page1.data.length).toBeLessThanOrEqual(2)
      expect(page1.meta.page).toBe(1)
      expect(page1.meta.limit).toBe(2)
    })

    it('payment methods are UPPERCASE', async () => {
      const { data } = await customersService.listPayments(VENDOR_ID, CUSTOMER_ID)
      const validMethods = ['CASH', 'ONLINE', 'UPI', 'OTHER']
      for (const p of data) {
        expect(validMethods).toContain(p.method)
      }
    })
  })

  // -------------------------------------------------------------------------
  // setCreditLimit
  // -------------------------------------------------------------------------

  describe('setCreditLimit', () => {
    it('returns { creditLimit, creditUtilization }', async () => {
      const result = await customersService.setCreditLimit(VENDOR_ID, CUSTOMER_ID, 8000)
      expect(result.creditLimit).toBe(8000)
      expect(typeof result.creditUtilization).toBe('number')
    })

    it('returns zero utilization when creditLimit is 0', async () => {
      const result = await customersService.setCreditLimit(VENDOR_ID, CUSTOMER_ID, 0)
      expect(result.creditUtilization).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // getCalendar
  // -------------------------------------------------------------------------

  describe('getCalendar', () => {
    it('returns a CustomerCalendarDto with month and days keyed by YYYY-MM-DD', async () => {
      const result = await customersService.getCalendar(VENDOR_ID, CUSTOMER_ID, MONTH)
      expect(result.month).toBe(MONTH)
      expect(typeof result.days).toBe('object')
      for (const key of Object.keys(result.days)) {
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })

    it('each day has a deliveries array', async () => {
      const result = await customersService.getCalendar(VENDOR_ID, CUSTOMER_ID, MONTH)
      for (const day of Object.values(result.days)) {
        expect(Array.isArray(day.deliveries)).toBe(true)
      }
    })

    it('delivery status is UPPERCASE', async () => {
      const result = await customersService.getCalendar(VENDOR_ID, CUSTOMER_ID, MONTH)
      const validStatuses = ['DELIVERED', 'LEAVE', 'PENDING', 'CANCELLED', 'AUTO_MARKED']
      for (const day of Object.values(result.days)) {
        for (const delivery of day.deliveries) {
          expect(validStatuses).toContain(delivery.status)
        }
      }
    })
  })

  // -------------------------------------------------------------------------
  // addSubscription
  // -------------------------------------------------------------------------

  describe('addSubscription', () => {
    it('returns a SubscriptionDto with string subscriptionId and listId', async () => {
      const result = await customersService.addSubscription(VENDOR_ID, CUSTOMER_ID, {
        supplyListId: 'l99',
      })
      expect(typeof result.subscriptionId).toBe('string')
      expect(typeof result.listId).toBe('string')
      expect(result.listId).toBe('l99')
    })

    it('returns a valid SubscriptionDto shape', async () => {
      const result = await customersService.addSubscription(VENDOR_ID, CUSTOMER_ID, {
        supplyListId: 'l1',
      })
      expect(typeof result.listName).toBe('string')
      expect(typeof result.quantity).toBe('number')
      expect(typeof result.unit).toBe('string')
      expect(typeof result.ratePerUnit).toBe('number')
      expect(typeof result.frequency).toBe('string')
      expect(typeof result.startDate).toBe('string')
      expect(typeof result.isActive).toBe('boolean')
      expect(typeof result.isCustomRate).toBe('boolean')
      expect(typeof result.isCustomQuantity).toBe('boolean')
    })
  })

  // -------------------------------------------------------------------------
  // removeSubscription
  // -------------------------------------------------------------------------

  describe('removeSubscription', () => {
    it('resolves void (no return value)', async () => {
      const result = await customersService.removeSubscription(VENDOR_ID, CUSTOMER_ID, 'sub1')
      expect(result).toBeUndefined()
    })
  })
})
