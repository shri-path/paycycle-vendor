/**
 * Customer Service (US-008)
 * Purpose: customer API calls — mock in dev, real API via the shared httpClient.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data. No
 * `vendorId` fields ever go in a request body — the server derives the actor +
 * tenant from the JWT.
 *
 * Envelope notes:
 *   - GET /customers  → NON-STANDARD shape: `data: { total, customers: [] }`, no `meta`.
 *     The service returns `{ total, customers }` directly from `data.data`.
 *   - GET /customers/:id/payments → STANDARD meta envelope: `{ data: [], meta: {...} }`.
 *     The service returns `{ data, meta }` from the response root.
 *   - All other endpoints → standard `{ success, data }` — return `data.data`.
 *
 * All ids are STRINGS. Money fields are plain numbers (INR). Errors bubble up;
 * the store maps them via `mapApiError(_, 'customer', action)`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  CustomerListItemDto,
  CustomerDetailDto,
  SubscriptionDto,
  MonthlyBillDto,
  CustomerCalendarDto,
  PaymentDto,
  PaginationMeta,
  CreateCustomerInput,
  UpdateCustomerInput,
  AddSubscriptionInput,
  RecordPaymentInput,
  SetCreditLimitResult,
  CustomerStatusFilter,
} from '../../../types/customer'
import {
  mockCustomerList,
  buildMockCustomerDetail,
  mockMonthlyBill,
  buildMockCalendar,
  mockPayments,
  buildMockSubscription,
  buildMockPayment,
} from './customers.mock'

// ---------------------------------------------------------------------------
// Options interfaces
// ---------------------------------------------------------------------------

/** Options for GET /customers list endpoint. */
export interface ListCustomersOptions {
  search?: string
  listId?: string
  /** Payment-status filter or 'all'. Defaults to 'all'. */
  status?: CustomerStatusFilter
  page?: number
  limit?: number
}

/** Options for GET /customers/:id/payments paginated list. */
export interface ListPaymentsOptions {
  page?: number
  limit?: number
}

/** Return shape for listCustomers — matches the non-standard server envelope. */
export interface ListCustomersResult {
  total: number
  customers: CustomerListItemDto[]
}

/** Return shape for listPayments — standard meta envelope. */
export interface ListPaymentsResult {
  data: PaymentDto[]
  meta: PaginationMeta
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const customersService = {
  /**
   * GET /vendors/:vendorId/customers
   * Non-standard envelope: `data: { total, customers }` — no `meta`.
   */
  async listCustomers(
    vendorId: string,
    opts: ListCustomersOptions = {},
    signal?: AbortSignal,
  ): Promise<ListCustomersResult> {
    if (isMockMode) {
      await simulateNetworkDelay()
      let customers = [...mockCustomerList]
      if (opts.search) {
        const q = opts.search.toLowerCase()
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phoneNumber.toLowerCase().includes(q),
        )
      }
      if (opts.listId) {
        customers = customers.filter((c) => c.supplyLists.length > 0)
      }
      if (opts.status && opts.status !== 'all') {
        customers = customers.filter((c) => c.paymentStatus === opts.status)
      }
      const page = opts.page ?? 1
      const limit = opts.limit ?? 20
      const start = (page - 1) * limit
      const paged = customers.slice(start, start + limit)
      return { total: customers.length, customers: paged }
    }
    const { data } = await httpClient.get(APIPath.Customers.List(vendorId), {
      params: {
        search: opts.search,
        listId: opts.listId,
        status: opts.status,
        page: opts.page,
        limit: opts.limit,
      },
      signal,
    })
    // Non-standard envelope: data.data = { total, customers }
    return data.data as ListCustomersResult
  },

  /**
   * GET /vendors/:vendorId/customers/:customerId
   * Standard `{ success, data }` envelope.
   */
  async getCustomer(
    vendorId: string,
    customerId: string,
    signal?: AbortSignal,
  ): Promise<CustomerDetailDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockCustomerDetail(customerId)
    }
    const { data } = await httpClient.get(
      APIPath.Customers.Detail(vendorId, customerId),
      { signal },
    )
    return data.data as CustomerDetailDto
  },

  /**
   * POST /vendors/:vendorId/customers
   * Returns CustomerDetailDto (201). Standard envelope.
   */
  async createCustomer(
    vendorId: string,
    input: CreateCustomerInput,
    signal?: AbortSignal,
  ): Promise<CustomerDetailDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const newId = `mock-${Date.now()}`
      return buildMockCustomerDetail(newId, {
        name: input.name,
        phoneNumber: `${input.phoneCountryCode ?? '+91'}${input.phone}`,
        email: input.email ?? null,
        address: input.address ?? null,
        area: input.area ?? null,
        language: input.language ?? null,
        creditLimit: input.creditLimit ?? 0,
        currentBalance: 0,
        paymentScore: 100,
        creditUtilization: 0,
        subscriptions: [],
        currentMonthBill: null,
        paymentHistory: [],
      })
    }
    const { data } = await httpClient.post(
      APIPath.Customers.List(vendorId),
      input,
      { signal },
    )
    return data.data as CustomerDetailDto
  },

  /**
   * PATCH /vendors/:vendorId/customers/:customerId
   * Returns updated CustomerDetailDto. Standard envelope.
   */
  async updateCustomer(
    vendorId: string,
    customerId: string,
    input: UpdateCustomerInput,
    signal?: AbortSignal,
  ): Promise<CustomerDetailDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockCustomerDetail(customerId, { ...input })
    }
    const { data } = await httpClient.patch(
      APIPath.Customers.Detail(vendorId, customerId),
      input,
      { signal },
    )
    return data.data as CustomerDetailDto
  },

  /**
   * DELETE /vendors/:vendorId/customers/:customerId
   * Soft-deactivate. Returns void (`{ success: true }`).
   */
  async deactivateCustomer(
    vendorId: string,
    customerId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return
    }
    await httpClient.delete(APIPath.Customers.Detail(vendorId, customerId), {
      signal,
    })
  },

  /**
   * GET /vendors/:vendorId/customers/:customerId/bill/:month
   * Owner-only. Standard envelope.
   */
  async getBill(
    vendorId: string,
    customerId: string,
    month: string,
    signal?: AbortSignal,
  ): Promise<MonthlyBillDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockMonthlyBill, customerId, month }
    }
    const { data } = await httpClient.get(
      APIPath.Customers.Bill(vendorId, customerId, month),
      { signal },
    )
    return data.data as MonthlyBillDto
  },

  /**
   * POST /vendors/:vendorId/customers/:customerId/payments
   * Returns PaymentDto (201). Standard envelope.
   */
  async recordPayment(
    vendorId: string,
    customerId: string,
    input: RecordPaymentInput,
    signal?: AbortSignal,
  ): Promise<PaymentDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockPayment(input.amount, input.paymentMethod, input.referenceNumber ?? null)
    }
    const { data } = await httpClient.post(
      APIPath.Customers.Payments(vendorId, customerId),
      input,
      { signal },
    )
    return data.data as PaymentDto
  },

  /**
   * GET /vendors/:vendorId/customers/:customerId/payments
   * Standard meta envelope: `{ data: PaymentDto[], meta: PaginationMeta }`.
   * Owner-only.
   */
  async listPayments(
    vendorId: string,
    customerId: string,
    opts: ListPaymentsOptions = {},
    signal?: AbortSignal,
  ): Promise<ListPaymentsResult> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const page = opts.page ?? 1
      const limit = opts.limit ?? 20
      const start = (page - 1) * limit
      const paged = mockPayments.slice(start, start + limit)
      return {
        data: paged,
        meta: {
          page,
          limit,
          total: mockPayments.length,
          totalPages: Math.ceil(mockPayments.length / limit),
        },
      }
    }
    const { data } = await httpClient.get(
      APIPath.Customers.Payments(vendorId, customerId),
      {
        params: { page: opts.page, limit: opts.limit },
        signal,
      },
    )
    // Standard meta envelope — data (array) and meta are at the response root
    return {
      data: data.data as PaymentDto[],
      meta: data.meta as PaginationMeta,
    }
  },

  /**
   * PATCH /vendors/:vendorId/customers/:customerId/credit-limit
   * Owner-only. Returns `{ creditLimit, creditUtilization }`. Standard envelope.
   */
  async setCreditLimit(
    vendorId: string,
    customerId: string,
    creditLimit: number,
    signal?: AbortSignal,
  ): Promise<SetCreditLimitResult> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const currentBalance = 4350
      return {
        creditLimit,
        creditUtilization: creditLimit > 0
          ? Math.round((currentBalance / creditLimit) * 100 * 10) / 10
          : 0,
      }
    }
    const { data } = await httpClient.patch(
      APIPath.Customers.CreditLimit(vendorId, customerId),
      { creditLimit },
      { signal },
    )
    return data.data as SetCreditLimitResult
  },

  /**
   * GET /vendors/:vendorId/customers/:customerId/calendar/:month
   * Available to owner + staff (staff gets amount=null). Standard envelope.
   */
  async getCalendar(
    vendorId: string,
    customerId: string,
    month: string,
    signal?: AbortSignal,
  ): Promise<CustomerCalendarDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockCalendar(month)
    }
    const { data } = await httpClient.get(
      APIPath.Customers.Calendar(vendorId, customerId, month),
      { signal },
    )
    return data.data as CustomerCalendarDto
  },

  /**
   * POST /vendors/:vendorId/customers/:customerId/subscriptions
   * Owner-only. Returns SubscriptionDto (201). Standard envelope.
   */
  async addSubscription(
    vendorId: string,
    customerId: string,
    input: AddSubscriptionInput,
    signal?: AbortSignal,
  ): Promise<SubscriptionDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockSubscription({ listId: input.supplyListId })
    }
    const { data } = await httpClient.post(
      APIPath.Customers.Subscriptions(vendorId, customerId),
      input,
      { signal },
    )
    return data.data as SubscriptionDto
  },

  /**
   * DELETE /vendors/:vendorId/customers/:customerId/subscriptions/:subscriptionId
   * Owner-only. Returns void (`{ success: true }`).
   */
  async removeSubscription(
    vendorId: string,
    customerId: string,
    subscriptionId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return
    }
    await httpClient.delete(
      APIPath.Customers.SubscriptionDetail(vendorId, customerId, subscriptionId),
      { signal },
    )
  },
}

export default customersService
