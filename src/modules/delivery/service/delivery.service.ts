/**
 * Delivery Service (US-006)
 * Purpose: delivery API calls — mock in dev, real API via the shared httpClient.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data. No
 * `markedBy*`/`vendorId` fields ever go in a request body — the server derives the
 * actor + tenant from the JWT.
 *
 * Each method unwraps the global envelope `{ success, data }`. All ids are STRINGS.
 * Status enums are UPPERCASE. `revenue`/list-`revenue` fields are STRINGS (Prisma
 * Decimal) — callers parse via `parseRevenue`. `ratePerUnit`/`amount` are owner-only.
 * Errors bubble up; the store maps them via `mapApiError(_, 'delivery', action)`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type { PaginationMeta } from '../../../types/supplyLists'
import type {
  CalendarOptions,
  CalendarResultDto,
  CancelLeaveResultDto,
  CreateLeaveInput,
  CreateLeaveResultDto,
  DateDetailResultDto,
  ExtraChargeInput,
  ExtraChargeResultDto,
  ListDeliveriesOptions,
  ListDeliveriesResultDto,
  ListLeavesResultDto,
  MarkBulkInput,
  MarkBulkResultDto,
  MarkDeliveryInput,
  MarkDeliveryResultDto,
  TodayOptions,
  TodayResultDto,
} from '../../../types/delivery'
import {
  mockToday,
  mockListDeliveries,
  mockLeaves,
  mockCalendar,
  mockDateDetail,
  buildMarkResult,
} from './delivery.mock'

/** A paginated list-deliveries read: result plus the server pagination meta. */
export interface ListDeliveriesPaginated {
  result: ListDeliveriesResultDto
  meta: PaginationMeta | null
}

export const deliveryService = {
  /** GET /vendors/:vendorId/deliveries/today */
  async getToday(
    vendorId: string,
    opts: TodayOptions = {},
    signal?: AbortSignal,
  ): Promise<TodayResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockToday(opts)
    }
    const { data } = await httpClient.get(APIPath.Delivery.Today(vendorId), {
      params: { date: opts.date, listId: opts.listId, staffId: opts.staffId },
      signal,
    })
    return data.data as TodayResultDto
  },

  /** GET /vendors/:vendorId/supply-lists/:listId/deliveries */
  async getListDeliveries(
    vendorId: string,
    listId: string,
    opts: ListDeliveriesOptions = {},
    signal?: AbortSignal,
  ): Promise<ListDeliveriesPaginated> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { result: mockListDeliveries(listId, opts), meta: null }
    }
    const { data } = await httpClient.get(APIPath.Delivery.ListDeliveries(vendorId, listId), {
      params: {
        date: opts.date,
        status: opts.status,
        search: opts.search,
        page: opts.page,
        limit: opts.limit,
      },
      signal,
    })
    return {
      result: data.data as ListDeliveriesResultDto,
      meta: (data.meta as PaginationMeta | undefined) ?? null,
    }
  },

  /** PATCH /vendors/:vendorId/deliveries/:deliveryId/mark */
  async markDelivery(
    vendorId: string,
    deliveryId: string,
    body: MarkDeliveryInput,
    signal?: AbortSignal,
  ): Promise<MarkDeliveryResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMarkResult(deliveryId, body)
    }
    const { data } = await httpClient.patch(APIPath.Delivery.Mark(vendorId, deliveryId), body, {
      signal,
    })
    return data.data as MarkDeliveryResultDto
  },

  /** POST /vendors/:vendorId/deliveries/mark-bulk */
  async markBulk(
    vendorId: string,
    body: MarkBulkInput,
    signal?: AbortSignal,
  ): Promise<MarkBulkResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { updated: 0, excluded: body.excludeDeliveryIds?.length ?? 0 }
    }
    const { data } = await httpClient.post(APIPath.Delivery.MarkBulk(vendorId), body, { signal })
    return data.data as MarkBulkResultDto
  },

  /** POST /vendors/:vendorId/extra-charges */
  async addExtraCharge(
    vendorId: string,
    body: ExtraChargeInput,
    signal?: AbortSignal,
  ): Promise<ExtraChargeResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        id: `charge-mock-${Date.now()}`,
        dailySupplyId: body.dailySupplyId,
        amount: body.amount,
        comment: body.comment,
        addedBy: null,
        createdAt: new Date().toISOString(),
      }
    }
    const { data } = await httpClient.post(APIPath.Delivery.ExtraCharges(vendorId), body, { signal })
    return data.data as ExtraChargeResultDto
  },

  /** POST /vendors/:vendorId/leaves */
  async createLeave(
    vendorId: string,
    body: CreateLeaveInput,
    signal?: AbortSignal,
  ): Promise<CreateLeaveResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        created: body.supplyListIds.length,
        leaves: body.supplyListIds.map((listId, i) => ({
          id: `leave-mock-${Date.now()}-${i}`,
          customerId: body.customerId,
          supplyListId: listId,
          startDate: body.startDate,
          endDate: body.endDate,
          leaveType: 'VENDOR_MARKED' as const,
        })),
        affectedDeliveries: body.supplyListIds.length,
      }
    }
    const { data } = await httpClient.post(APIPath.Delivery.Leaves(vendorId), body, { signal })
    return data.data as CreateLeaveResultDto
  },

  /** GET /vendors/:vendorId/leaves */
  async getLeaves(
    vendorId: string,
    opts: { status?: 'today' | 'upcoming'; staffId?: string } = {},
    signal?: AbortSignal,
  ): Promise<ListLeavesResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockLeaves()
    }
    const { data } = await httpClient.get(APIPath.Delivery.Leaves(vendorId), {
      params: { status: opts.status, staffId: opts.staffId },
      signal,
    })
    return data.data as ListLeavesResultDto
  },

  /** DELETE /vendors/:vendorId/leaves/:leaveId */
  async cancelLeave(
    vendorId: string,
    leaveId: string,
    signal?: AbortSignal,
  ): Promise<CancelLeaveResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { revertedDeliveries: 1 }
    }
    const { data } = await httpClient.delete(APIPath.Delivery.LeaveDetail(vendorId, leaveId), {
      signal,
    })
    return data.data as CancelLeaveResultDto
  },

  /** GET /vendors/:vendorId/deliveries/calendar?month=YYYY-MM */
  async getCalendar(
    vendorId: string,
    month: string,
    opts: CalendarOptions = {},
    signal?: AbortSignal,
  ): Promise<CalendarResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockCalendar(month)
    }
    const { data } = await httpClient.get(APIPath.Delivery.Calendar(vendorId), {
      params: { month, listId: opts.listId, customerId: opts.customerId },
      signal,
    })
    return data.data as CalendarResultDto
  },

  /** GET /vendors/:vendorId/deliveries/date/:date */
  async getDateDetail(
    vendorId: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<DateDetailResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockDateDetail(date)
    }
    const { data } = await httpClient.get(APIPath.Delivery.DateDetail(vendorId, date), { signal })
    return data.data as DateDetailResultDto
  },
}

export default deliveryService
