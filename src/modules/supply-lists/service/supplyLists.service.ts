/**
 * Supply Lists Service (US-005)
 * Purpose: Supply-list API calls — mock in dev, real API via the shared httpClient.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data.
 * Every method unwraps the global envelope `{ success, data, meta? }` — list reads
 * return `{ data, meta }`, single reads/writes return `data`. Errors bubble up; the
 * store maps them via `mapApiError(_, 'supply', action)` and logs them.
 *
 * All ids are STRINGS (R1). `frequency` is UPPERCASE (R3); `status` is lowercase (R4).
 * Backend response shapes are pinned in FEATURE_PLAN → API Integration / Backend
 * Reconciliation (the live paycycle_api source, not the story doc).
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import {
  mockSupplyLists,
  mockSupplyListDetail,
  mockSubscriptions,
  mockAvailableCustomers,
} from '@services/mocks'
import type {
  AddCustomersInput,
  AddCustomersResultDto,
  ArchiveListResultDto,
  AvailableCustomerDto,
  CreateSupplyListInput,
  EndSubscriptionResultDto,
  PaginationMeta,
  SubscriptionDto,
  SupplyListDto,
  SupplyListListDto,
  SupplyListStatus,
  SubscriptionStatus,
  UpdateSubscriptionInput,
  UpdateSupplyListInput,
} from '../../../types/supplyLists'

/** A paginated list read: rows plus the server pagination meta. */
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

/** Query options for the supply-list listing. */
export interface ListListsOptions {
  status?: SupplyListStatus
  staffId?: string
  page?: number
  limit?: number
}

/** Query options for the subscriptions listing. */
export interface ListCustomersOptions {
  search?: string
  status?: SubscriptionStatus
  page?: number
  limit?: number
}

/** Query options for the available-customers listing. */
export interface ListAvailableOptions {
  search?: string
  page?: number
  limit?: number
}

const DEFAULT_LIMIT = 50

/** Mock paginate helper — keeps the mock meta in sync with the requested page/limit. */
function mockMeta(total: number, page = 1, limit = DEFAULT_LIMIT): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

export const supplyListsService = {
  /** GET /vendors/:vendorId/supply-lists?status&staffId&page&limit */
  async list(
    vendorId: string,
    opts: ListListsOptions = {},
  ): Promise<PaginatedResult<SupplyListListDto>> {
    const { status, staffId, page = 1, limit = DEFAULT_LIMIT } = opts
    if (isMockMode) {
      await simulateNetworkDelay()
      const rows = status
        ? mockSupplyLists.filter((l) => l.status === status)
        : [...mockSupplyLists]
      return { data: rows, meta: mockMeta(rows.length, page, limit) }
    }
    const { data } = await httpClient.get(APIPath.SupplyLists.List(vendorId), {
      params: { status, staffId, page, limit },
    })
    return {
      data: data.data as SupplyListListDto[],
      meta: data.meta as PaginationMeta,
    }
  },

  /** GET /vendors/:vendorId/supply-lists/:listId */
  async getDetail(vendorId: string, listId: string): Promise<SupplyListDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockSupplyListDetail, id: listId }
    }
    const { data } = await httpClient.get(APIPath.SupplyLists.Detail(vendorId, listId))
    return data.data as SupplyListDto
  },

  /** POST /vendors/:vendorId/supply-lists */
  async create(vendorId: string, input: CreateSupplyListInput): Promise<SupplyListDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const now = Date.now()
      return {
        ...mockSupplyListDetail,
        id: `list-mock-${now}`,
        name: input.name,
        supplyType: input.supplyType ?? null,
        unit: input.unit,
        defaultQuantity: input.defaultQuantity ?? null,
        defaultRatePerUnit: input.defaultRatePerUnit ?? null,
        startTime: input.startTime ?? null,
        frequency: input.frequency,
        frequencyDays: input.frequencyDays ?? [],
        status: 'active',
        assignedStaff: [],
        customerCount: 0,
      }
    }
    const { data } = await httpClient.post(APIPath.SupplyLists.List(vendorId), input)
    return data.data as SupplyListDto
  },

  /** PATCH /vendors/:vendorId/supply-lists/:listId (partial — sends only changed fields) */
  async update(
    vendorId: string,
    listId: string,
    patch: UpdateSupplyListInput,
  ): Promise<SupplyListDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockSupplyListDetail, id: listId, ...patch }
    }
    const { data } = await httpClient.patch(
      APIPath.SupplyLists.Detail(vendorId, listId),
      patch,
    )
    return data.data as SupplyListDto
  },

  /** DELETE /vendors/:vendorId/supply-lists/:listId → { id, status:'archived' } */
  async archive(vendorId: string, listId: string): Promise<ArchiveListResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { id: listId, status: 'archived' }
    }
    const { data } = await httpClient.delete(APIPath.SupplyLists.Detail(vendorId, listId))
    return data.data as ArchiveListResultDto
  },

  /** POST /vendors/:vendorId/supply-lists/:listId/staff → full SupplyListDto (R9) */
  async assignStaff(
    vendorId: string,
    listId: string,
    body: { staffId: string; isPrimary: boolean },
  ): Promise<SupplyListDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockSupplyListDetail, id: listId }
    }
    const { data } = await httpClient.post(APIPath.SupplyLists.Staff(vendorId, listId), body)
    return data.data as SupplyListDto
  },

  /** DELETE /vendors/:vendorId/supply-lists/:listId/staff/:staffId → full SupplyListDto (R9) */
  async unassignStaff(
    vendorId: string,
    listId: string,
    staffId: string,
  ): Promise<SupplyListDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockSupplyListDetail, id: listId }
    }
    const { data } = await httpClient.delete(
      APIPath.SupplyLists.StaffDetail(vendorId, listId, staffId),
    )
    return data.data as SupplyListDto
  },

  /** GET /vendors/:vendorId/supply-lists/:listId/customers?search&status&page&limit */
  async listCustomers(
    vendorId: string,
    listId: string,
    opts: ListCustomersOptions = {},
  ): Promise<PaginatedResult<SubscriptionDto>> {
    const { search, status, page = 1, limit = DEFAULT_LIMIT } = opts
    if (isMockMode) {
      await simulateNetworkDelay()
      const rows = status
        ? mockSubscriptions.filter((s) => s.status === status)
        : [...mockSubscriptions]
      return { data: rows, meta: mockMeta(rows.length, page, limit) }
    }
    const { data } = await httpClient.get(
      APIPath.SupplyLists.Customers(vendorId, listId),
      { params: { search, status, page, limit } },
    )
    return {
      data: data.data as SubscriptionDto[],
      meta: data.meta as PaginationMeta,
    }
  },

  /** GET /vendors/:vendorId/supply-lists/:listId/available-customers?search&page&limit */
  async listAvailable(
    vendorId: string,
    listId: string,
    opts: ListAvailableOptions = {},
  ): Promise<PaginatedResult<AvailableCustomerDto>> {
    const { search, page = 1, limit = DEFAULT_LIMIT } = opts
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        data: [...mockAvailableCustomers],
        meta: mockMeta(mockAvailableCustomers.length, page, limit),
      }
    }
    const { data } = await httpClient.get(
      APIPath.SupplyLists.Available(vendorId, listId),
      { params: { search, page, limit } },
    )
    return {
      data: data.data as AvailableCustomerDto[],
      meta: data.meta as PaginationMeta,
    }
  },

  /** POST /vendors/:vendorId/supply-lists/:listId/customers → AddCustomersResultDto (R5) */
  async addCustomers(
    vendorId: string,
    listId: string,
    input: AddCustomersInput,
  ): Promise<AddCustomersResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        addedCount: input.customerIds.length,
        skippedCount: 0,
        subscriptions: [],
        skipped: [],
      }
    }
    const { data } = await httpClient.post(
      APIPath.SupplyLists.Customers(vendorId, listId),
      input,
    )
    return data.data as AddCustomersResultDto
  },

  /** PATCH /vendors/:vendorId/supply-lists/:listId/customers/:subscriptionId */
  async updateSubscription(
    vendorId: string,
    listId: string,
    subscriptionId: string,
    patch: UpdateSubscriptionInput,
  ): Promise<SubscriptionDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const base: SubscriptionDto =
        mockSubscriptions.find((s) => s.subscriptionId === subscriptionId) ?? {
          subscriptionId,
          customerId: 'cust-mock',
          customerName: null,
          quantity: 1,
          ratePerUnit: 0,
          amount: 0,
          isCustomQuantity: false,
          isCustomRate: false,
          startDate: null,
          status: 'active',
          otherLists: [],
          otherListsCount: 0,
        }
      const quantity = patch.quantity ?? base.quantity
      const ratePerUnit = patch.ratePerUnit ?? base.ratePerUnit
      return {
        ...base,
        subscriptionId,
        quantity,
        ratePerUnit,
        amount: quantity * ratePerUnit,
        status: patch.status ?? base.status,
      }
    }
    const { data } = await httpClient.patch(
      APIPath.SupplyLists.Subscription(vendorId, listId, subscriptionId),
      patch,
    )
    return data.data as SubscriptionDto
  },

  /** DELETE /vendors/:vendorId/supply-lists/:listId/customers/:subscriptionId → end (R10) */
  async endSubscription(
    vendorId: string,
    listId: string,
    subscriptionId: string,
  ): Promise<EndSubscriptionResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        subscriptionId,
        status: 'ended',
        endDate: new Date().toISOString().slice(0, 10),
      }
    }
    const { data } = await httpClient.delete(
      APIPath.SupplyLists.Subscription(vendorId, listId, subscriptionId),
    )
    return data.data as EndSubscriptionResultDto
  },
}

export default supplyListsService
