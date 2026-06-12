/**
 * Dashboard Service (US-010)
 * Purpose: Dashboard API calls — mock in dev, real API via httpClient.
 *
 * NOTE: Backend US-010 endpoints do not exist yet (OQ-1 in FEATURE_PLAN). This
 * service is built mock-first with DTO contracts pinned in src/types/dashboard.ts.
 * Real-mode wiring stays behind `isMockMode`; re-verify when the US-010 backend
 * lands. See FEATURE_PLAN §6.1 for the full OQ-1 decision.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data.
 * `staffId` is also JWT-derived server-side (OQ-2) — the client does NOT pass it.
 *
 * Envelope handling (standard paycycle_api envelope):
 *   GET owner/staff/forecast/aging  → object-shaped `data.data`
 *   PATCH settings                  → object-shaped `data.data`
 *
 * All ids are STRINGS. Errors bubble up; the store maps them via
 * `mapApiError(_, 'dashboard', action)`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  OwnerDashboardDto,
  StaffDashboardDto,
  SupplyForecastDto,
  OutstandingAgingDto,
  VendorSettingsDto,
} from '../../../types/dashboard'
import {
  mockOwnerDashboard,
  mockStaffDashboard,
  mockForecast,
  mockOutstandingAging,
  mockVendorSettings,
} from './dashboard.mock'

export interface ForecastOptions {
  days: number
  supplyType?: string | null
}

export const dashboardService = {
  /**
   * GET /vendors/:vendorId/dashboard/owner
   * Owner-only. Returns full owner dashboard aggregate.
   */
  async getOwnerDashboard(vendorId: string, signal?: AbortSignal): Promise<OwnerDashboardDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockOwnerDashboard }
    }
    const { data } = await httpClient.get(APIPath.Dashboard.Owner(vendorId), { signal })
    const dto = data.data as OwnerDashboardDto & {
      todaySupplyLists?: Array<OwnerDashboardDto['todaySupplyLists'][number] & { id: number | string }>
    }
    // Coerce numeric ids to strings (API_SPEC returns numeric ids; client uses strings)
    return {
      ...dto,
      todaySupplyLists: (dto.todaySupplyLists ?? []).map((l) => ({
        ...l,
        id: String(l.id),
      })),
    }
  },

  /**
   * GET /vendors/:vendorId/dashboard/staff
   * Staff-only. staffId is JWT-derived on the server (OQ-2 — never passed by client).
   */
  async getStaffDashboard(vendorId: string, signal?: AbortSignal): Promise<StaffDashboardDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockStaffDashboard }
    }
    const { data } = await httpClient.get(APIPath.Dashboard.Staff(vendorId), { signal })
    const dto = data.data as StaffDashboardDto & {
      assignedLists?: Array<StaffDashboardDto['assignedLists'][number] & { id: number | string }>
    }
    return {
      ...dto,
      assignedLists: (dto.assignedLists ?? []).map((l) => ({
        ...l,
        id: String(l.id),
      })),
    }
  },

  /**
   * GET /vendors/:vendorId/supply-forecast?days=1|7&supplyType=<type>
   * Owner-only. `days=1` = tomorrow only; `days=7` = next 7 days.
   */
  async getSupplyForecast(
    vendorId: string,
    opts: ForecastOptions,
    signal?: AbortSignal,
  ): Promise<SupplyForecastDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const result = { ...mockForecast }
      // Filter by supplyType if provided
      if (opts.supplyType) {
        result.byList = result.byList.filter((r) => r.supplyType === opts.supplyType)
      }
      // For tomorrow only, omit next7Days
      if (opts.days === 1) {
        const { next7Days: _ignored, ...rest } = result
        return rest
      }
      return result
    }
    const params: Record<string, string | number> = { days: opts.days }
    if (opts.supplyType) params['supplyType'] = opts.supplyType
    const { data } = await httpClient.get(APIPath.Dashboard.Forecast(vendorId), {
      params,
      signal,
    })
    const dto = data.data as SupplyForecastDto & {
      byList?: Array<SupplyForecastDto['byList'][number] & { listId: number | string }>
    }
    return {
      ...dto,
      byList: (dto.byList ?? []).map((r) => ({
        ...r,
        listId: String(r.listId),
      })),
    }
  },

  /**
   * GET /vendors/:vendorId/outstanding-aging
   * Owner-only. Full aging breakdown with priority customers.
   */
  async getOutstandingAging(vendorId: string, signal?: AbortSignal): Promise<OutstandingAgingDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockOutstandingAging }
    }
    const { data } = await httpClient.get(APIPath.Dashboard.OutstandingAging(vendorId), { signal })
    const dto = data.data as OutstandingAgingDto
    // Coerce numeric customerId to string
    const coerceId = <T extends { customerId: number | string }>(arr: T[]) =>
      arr.map((c) => ({ ...c, customerId: String(c.customerId) }))
    return {
      ...dto,
      priorityCustomers: {
        high: coerceId(dto.priorityCustomers.high),
        medium: coerceId(dto.priorityCustomers.medium),
        low: coerceId(dto.priorityCustomers.low),
      },
      advanceCredit: {
        ...dto.advanceCredit,
        customers: coerceId(dto.advanceCredit.customers),
      },
    }
  },

  /**
   * PATCH /vendors/:vendorId/settings
   * Owner-only. Updates auto-mark and other vendor settings.
   * Body: { autoMarkEnabled: boolean }. Returns updated VendorSettingsDto.
   */
  async updateSettings(
    vendorId: string,
    payload: Partial<Pick<VendorSettingsDto, 'autoMarkEnabled' | 'autoSendBillsEnabled' | 'autoSendBillsTime'>>,
    signal?: AbortSignal,
  ): Promise<VendorSettingsDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockVendorSettings, ...payload }
    }
    const { data } = await httpClient.patch(APIPath.Dashboard.Settings(vendorId), payload, { signal })
    return data.data as VendorSettingsDto
  },
}

export default dashboardService
