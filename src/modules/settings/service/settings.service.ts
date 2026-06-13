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
    const { data } = await httpClient.post(APIPath.Settings.BulkMarkLeave(vendorId), input, {
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
    const { data } = await httpClient.post(APIPath.Settings.BulkAdjustRate(vendorId), input, {
      signal,
    })
    return data.data as BulkRateResultDto
  },

  /**
   * POST /vendors/:vendorId/bulk-operations/send-reminders
   * Owner-only. Bulk sends payment reminders to customers.
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
    const { data } = await httpClient.post(
      APIPath.Settings.BulkSendReminders(vendorId),
      input,
      { signal },
    )
    return data.data as BulkReminderResultDto
  },
}

export default settingsService
