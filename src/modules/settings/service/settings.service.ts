/**
 * Settings Service (US-011)
 * Purpose: Vendor settings + bulk-operations API calls — mock in dev, real API via httpClient.
 *
 * NOTE: Backend US-011 endpoints do not exist yet (OQ-1 in FEATURE_PLAN). This
 * service is built mock-first with DTO contracts pinned in src/types/settings.ts.
 * Real-mode wiring stays behind `isMockMode`; re-verify when the US-011 backend lands.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data.
 *
 * Envelope handling (standard paycycle_api envelope):
 *   GET settings        → object-shaped `data.data` (VendorSettingsDto)
 *   PATCH settings      → object-shaped `data.data` (VendorSettingsDto)
 *   PATCH notif-prefs   → object-shaped `data.data` (VendorSettingsDto)
 *   GET impact previews → object-shaped `data.data` (BulkLeaveImpactDto | BulkRateImpactDto)
 *   POST bulk ops       → object-shaped `data.data` (result DTO)
 *
 * All ids are STRINGS. Errors bubble up; the store maps them via
 * `mapApiError(_, 'settings', action)`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  VendorSettingsDto,
  NotificationPreferencesDto,
  BulkLeaveInput,
  BulkLeaveImpactDto,
  BulkLeaveResultDto,
  BulkRateInput,
  BulkRateImpactDto,
  BulkRateResultDto,
  BulkReminderInput,
  BulkReminderResultDto,
} from '../../../types/settings'
import {
  mockVendorSettings,
  mockBulkLeaveImpact,
  mockBulkLeaveResult,
  mockBulkRateImpact,
  mockBulkRateResult,
  mockBulkReminderResult,
} from './settings.mock'

export const settingsService = {
  /**
   * GET /vendors/:vendorId/settings
   * Owner-only. Returns full vendor settings aggregate.
   */
  async getSettings(vendorId: string, signal?: AbortSignal): Promise<VendorSettingsDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockVendorSettings }
    }
    const { data } = await httpClient.get(APIPath.Settings.Get(vendorId), { signal })
    return data.data as VendorSettingsDto
  },

  /**
   * PATCH /vendors/:vendorId/settings
   * Owner-only. Updates vendor settings (sends only dirty fields).
   * Returns the updated VendorSettingsDto.
   */
  async updateSettings(
    vendorId: string,
    patch: Partial<VendorSettingsDto>,
    signal?: AbortSignal,
  ): Promise<VendorSettingsDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockVendorSettings, ...patch }
    }
    const { data } = await httpClient.patch(APIPath.Settings.Update(vendorId), patch, { signal })
    return data.data as VendorSettingsDto
  },

  /**
   * PATCH /vendors/:vendorId/notification-preferences
   * Owner-only. Updates notification preferences. Returns updated VendorSettingsDto.
   */
  async updateNotificationPreferences(
    vendorId: string,
    prefs: NotificationPreferencesDto,
    signal?: AbortSignal,
  ): Promise<VendorSettingsDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        ...mockVendorSettings,
        notificationPreferences: prefs,
      }
    }
    const { data } = await httpClient.patch(
      APIPath.Settings.NotifPrefs(vendorId),
      { notificationPreferences: prefs },
      { signal },
    )
    return data.data as VendorSettingsDto
  },

  /**
   * GET /vendors/:vendorId/bulk-operations/mark-leave/impact
   * Owner-only. Preview impact of a bulk leave before confirming.
   * Debounced by the calling hook.
   */
  async getLeaveImpact(
    vendorId: string,
    input: BulkLeaveInput,
    signal?: AbortSignal,
  ): Promise<BulkLeaveImpactDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const days =
        Math.max(
          1,
          Math.ceil(
            (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      return { ...mockBulkLeaveImpact, days, totalLeaves: mockBulkLeaveImpact.customersAffected * days }
    }
    const { data } = await httpClient.get(APIPath.Settings.LeaveImpact(vendorId), {
      params: input,
      signal,
    })
    return data.data as BulkLeaveImpactDto
  },

  /**
   * POST /vendors/:vendorId/bulk-operations/mark-leave
   * Owner-only. Bulk marks leave for selected subscriptions.
   *
   * API contract (§3 of API_SPEC.md):
   *   subscriptionIds: string[]  — when scope = single list / specific customers
   *   all: boolean               — true when scope = all lists / all customers
   *   date: "YYYY-MM-DD"         — single date (v1 only supports single-day leave)
   *   reason?: string
   *
   * The frontend `BulkLeaveInput` uses a richer multi-day UI shape (startDate/endDate,
   * supplyListId, customerIds). In real mode we map to the API wire shape. Mock mode
   * exercises the UI shape directly and does not need the mapping.
   */
  async bulkMarkLeave(
    vendorId: string,
    input: BulkLeaveInput,
    signal?: AbortSignal,
  ): Promise<BulkLeaveResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockBulkLeaveResult }
    }
    // Map UI shape → API wire shape (§3 API_SPEC.md)
    const hasSpecificIds =
      !input.supplyListId && input.customerIds && input.customerIds.length > 0
    const body: {
      subscriptionIds?: string[]
      all: boolean
      date: string
      reason?: string
    } = {
      // v1 only supports a single date; use startDate as the canonical date.
      date: input.startDate,
      // `all: true` when no explicit list or customer scope is provided.
      all: !input.supplyListId && !hasSpecificIds,
      ...(hasSpecificIds ? { subscriptionIds: input.customerIds } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
    }
    const { data } = await httpClient.post(APIPath.Settings.BulkMarkLeave(vendorId), body, {
      signal,
    })
    return data.data as BulkLeaveResultDto
  },

  /**
   * GET /vendors/:vendorId/bulk-operations/adjust-rate/impact
   * Owner-only. Preview impact of a bulk rate adjustment before confirming.
   */
  async getRateImpact(
    vendorId: string,
    input: BulkRateInput,
    signal?: AbortSignal,
  ): Promise<BulkRateImpactDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockBulkRateImpact, rateChange: input.newRate }
    }
    const { data } = await httpClient.get(APIPath.Settings.RateImpact(vendorId), {
      params: input,
      signal,
    })
    return data.data as BulkRateImpactDto
  },

  /**
   * POST /vendors/:vendorId/bulk-operations/adjust-rate
   * Owner-only. Bulk adjusts rate for selected subscriptions.
   *
   * API contract (§4 of API_SPEC.md):
   *   subscriptionIds: string[]  — when scope = single list
   *   all: boolean               — true when scope = all lists same supply
   *   newRate: number
   *   effectiveDate: "YYYY-MM-DD"   (NOT effectiveFrom — note the field name difference)
   *   notifyCustomers?: boolean
   *
   * The frontend `BulkRateInput` uses `effectiveFrom` and a `scope` discriminant.
   * In real mode we map to the API wire shape. Mock mode uses the UI shape directly.
   */
  async bulkAdjustRate(
    vendorId: string,
    input: BulkRateInput,
    signal?: AbortSignal,
  ): Promise<BulkRateResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockBulkRateResult }
    }
    // Map UI shape → API wire shape (§4 API_SPEC.md)
    const isAllScope = input.scope === 'all_lists_same_supply'
    const body: {
      subscriptionIds?: string[]
      all: boolean
      newRate: number
      effectiveDate: string
      notifyCustomers?: boolean
    } = {
      all: isAllScope,
      ...((!isAllScope && input.supplyListId) ? { subscriptionIds: [input.supplyListId] } : {}),
      newRate: input.newRate,
      // Map effectiveFrom → effectiveDate (API wire field name)
      effectiveDate: input.effectiveFrom,
      notifyCustomers: input.notifyCustomers,
    }
    const { data } = await httpClient.post(APIPath.Settings.BulkAdjustRate(vendorId), body, {
      signal,
    })
    return data.data as BulkRateResultDto
  },

  /**
   * POST /vendors/:vendorId/bulk-operations/send-reminders
   * Owner-only. Bulk sends payment reminders to customers.
   *
   * API contract (§5 of API_SPEC.md):
   *   customerIds: string[]  — when targeting specific customers
   *   all: boolean           — true for overdue / all_pending targets
   *   messageTemplate?: string   (NOT customMessage — note the field name difference)
   *
   * The frontend `BulkReminderInput` uses `targetType`/`customMessage`/`sendVia`.
   * `sendVia` is a UI-only concern (channel selection) not in the v1 API contract.
   * In real mode we map to the API wire shape. Mock mode uses the UI shape directly.
   */
  async bulkSendReminders(
    vendorId: string,
    input: BulkReminderInput,
    signal?: AbortSignal,
  ): Promise<BulkReminderResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockBulkReminderResult }
    }
    // Map UI shape → API wire shape (§5 API_SPEC.md)
    const isSpecific = input.targetType === 'specific_customers'
    const body: {
      customerIds?: string[]
      all: boolean
      messageTemplate?: string
    } = {
      // `all: true` for overdue/all_pending; customerIds for specific targets
      all: !isSpecific,
      ...(isSpecific && input.customerIds?.length
        ? { customerIds: input.customerIds }
        : {}),
      // Map customMessage → messageTemplate (API wire field name)
      ...(input.customMessage ? { messageTemplate: input.customMessage } : {}),
    }
    const { data } = await httpClient.post(
      APIPath.Settings.BulkSendReminders(vendorId),
      body,
      { signal },
    )
    return data.data as BulkReminderResultDto
  },
}

export default settingsService
