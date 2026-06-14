/**
 * Credit Service (US-012)
 * Purpose: API calls for credit control & outstanding management.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is
 * derived from the JWT on the server and never sent as user-controlled data.
 *
 * Envelope handling (standard paycycle_api envelope):
 *   GET / PATCH / POST  → object-shaped `data.data`
 *   GET history         → `data.data` (body) + `data.meta` (pagination)
 *
 * All ids are STRINGS. Numeric ids from the API are coerced: `String(id)`.
 * Errors bubble up; the store maps them via `mapApiError(_, 'credit', action)`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  CollectionsDashboardDto,
  PriorityListDto,
  CollectionAnalyticsDto,
  AgingDto,
  UpdateCreditSettingsDto,
  CreditSettingsResultDto,
  EnablePrepaidDto,
  EnablePrepaidResultDto,
  SendReminderResultDto,
  ReminderHistoryDto,
  ReminderHistoryMeta,
  SendBulkRemindersDto,
  BulkReminderResultDto,
  ReminderConfigDto,
  UpdateReminderConfigDto,
  PrioritySort,
  CreditPriorityCustomer,
} from '../../../types/credit'
import {
  mockDashboard,
  mockPriorityList,
  mockAnalytics,
  mockAging,
  mockReminderConfig,
  mockReminderHistory,
  mockCreditSettingsResult,
  mockEnablePrepaidSuccess,
  mockSendReminderResult,
  mockBulkReminderResult,
} from './credit.mock'

/** Coerce a single priority customer's id fields to string. */
function coercePriorityCustomer(c: CreditPriorityCustomer & { customerId: number | string }): CreditPriorityCustomer {
  return { ...c, customerId: String(c.customerId) }
}

export const creditService = {
  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * GET /vendors/:v/collections/dashboard
   * Owner-only. Outstanding overview + advance credit + net receivable + month
   * progress + customers at/near their credit limit.
   */
  async getDashboard(vendorId: string, signal?: AbortSignal): Promise<CollectionsDashboardDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockDashboard }
    }
    const { data } = await httpClient.get(APIPath.Credit.Dashboard(vendorId), { signal })
    const dto = data.data as CollectionsDashboardDto & {
      customersAtLimit?: Array<{ customerId: number | string; name: string; utilizationPercentage: number }>
    }
    return {
      ...dto,
      customersAtLimit: (dto.customersAtLimit ?? []).map((c) => ({
        ...c,
        customerId: String(c.customerId),
      })),
    }
  },

  /**
   * GET /vendors/:v/collections/priority-list?sort=
   * Owner-only. Customers grouped by collection priority + advance-credit group.
   */
  async getPriorityList(
    vendorId: string,
    sort?: PrioritySort,
    signal?: AbortSignal,
  ): Promise<PriorityListDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockPriorityList }
    }
    const params: Record<string, string> = {}
    if (sort) params['sort'] = sort
    const { data } = await httpClient.get(APIPath.Credit.PriorityList(vendorId), { params, signal })
    const dto = data.data as PriorityListDto
    return {
      highPriority: (dto.highPriority ?? []).map(coercePriorityCustomer),
      mediumPriority: (dto.mediumPriority ?? []).map(coercePriorityCustomer),
      lowPriority: (dto.lowPriority ?? []).map(coercePriorityCustomer),
      advanceCredit: (dto.advanceCredit ?? []).map((c) => ({
        ...c,
        customerId: String(c.customerId),
      })),
    }
  },

  /**
   * GET /vendors/:v/collections/analytics?month=YYYY-MM
   * Owner-only. Monthly collection analytics.
   */
  async getAnalytics(
    vendorId: string,
    month?: string,
    signal?: AbortSignal,
  ): Promise<CollectionAnalyticsDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const result = { ...mockAnalytics }
      if (month) result.month = month
      return result
    }
    const params: Record<string, string> = {}
    if (month) params['month'] = month
    const { data } = await httpClient.get(APIPath.Credit.Analytics(vendorId), { params, signal })
    const dto = data.data as CollectionAnalyticsDto
    return {
      ...dto,
      topPayers: (dto.topPayers ?? []).map((c) => ({ ...c, customerId: String(c.customerId) })),
      defaulters: (dto.defaulters ?? []).map((c) => ({ ...c, customerId: String(c.customerId) })),
    }
  },

  /**
   * GET /vendors/:v/collections/aging
   * Owner-only. Standalone outstanding aging breakdown.
   */
  async getAging(vendorId: string, signal?: AbortSignal): Promise<AgingDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockAging }
    }
    const { data } = await httpClient.get(APIPath.Credit.Aging(vendorId), { signal })
    return data.data as AgingDto
  },

  /**
   * GET /vendors/:v/customers/:c/reminders?page=&limit=
   * Owner-only. Reminder history for one customer (paginated).
   */
  async getReminderHistory(
    vendorId: string,
    customerId: string,
    page = 1,
    limit = 20,
    signal?: AbortSignal,
  ): Promise<{ data: ReminderHistoryDto; meta: ReminderHistoryMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        data: { ...mockReminderHistory },
        meta: { page: 1, limit: 20, total: mockReminderHistory.reminders.length, totalPages: 1 },
      }
    }
    const { data } = await httpClient.get(APIPath.Credit.Reminders(vendorId, customerId), {
      params: { page, limit },
      signal,
    })
    const dto = data.data as ReminderHistoryDto
    return {
      data: {
        ...dto,
        reminders: (dto.reminders ?? []).map((r) => ({ ...r, id: String(r.id) })),
      },
      meta: (data.meta ?? { page, limit, total: 0, totalPages: 0 }) as ReminderHistoryMeta,
    }
  },

  /**
   * GET /vendors/:v/reminder-config
   * Owner-only. Vendor automated-reminder configuration.
   */
  async getReminderConfig(vendorId: string, signal?: AbortSignal): Promise<ReminderConfigDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockReminderConfig }
    }
    const { data } = await httpClient.get(APIPath.Credit.ReminderConfig(vendorId), { signal })
    const dto = data.data as ReminderConfigDto
    return {
      ...dto,
      excludedCustomerIds: (dto.excludedCustomerIds ?? []).map(String),
    }
  },

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * PATCH /vendors/:v/customers/:c/credit-settings
   * Owner-only. Set a customer's credit policy.
   */
  async updateCreditSettings(
    vendorId: string,
    customerId: string,
    patch: UpdateCreditSettingsDto,
    signal?: AbortSignal,
  ): Promise<CreditSettingsResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockCreditSettingsResult, customerId, ...patch }
    }
    const { data } = await httpClient.patch(
      APIPath.Credit.CreditSettings(vendorId, customerId),
      patch,
      { signal },
    )
    const dto = data.data as CreditSettingsResultDto
    return { ...dto, customerId: String(dto.customerId) }
  },

  /**
   * POST /vendors/:v/customers/:c/enable-prepaid
   * Owner-only. Switch a customer to prepaid mode (discriminated response).
   */
  async enablePrepaid(
    vendorId: string,
    customerId: string,
    dto: EnablePrepaidDto,
    signal?: AbortSignal,
  ): Promise<EnablePrepaidResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      // Mock: return blocked if clearOutstandingFirst=true and customer has outstanding
      if (dto.clearOutstandingFirst) return { ...mockEnablePrepaidSuccess }
      return { ...mockEnablePrepaidSuccess }
    }
    const { data } = await httpClient.post(
      APIPath.Credit.EnablePrepaid(vendorId, customerId),
      dto,
      { signal },
    )
    const result = data.data as EnablePrepaidResultDto
    return { ...result, customerId: String(result.customerId) }
  },

  /**
   * POST /vendors/:v/customers/:c/reminders
   * Owner-only. Send a single payment reminder.
   * Returns 201; `skipped=true` is a soft outcome (see business rule §6.6).
   */
  async sendReminder(
    vendorId: string,
    customerId: string,
    customMessage?: string,
    signal?: AbortSignal,
  ): Promise<SendReminderResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockSendReminderResult, customerId }
    }
    const body: { customMessage?: string } = {}
    if (customMessage) body.customMessage = customMessage
    const { data } = await httpClient.post(
      APIPath.Credit.Reminders(vendorId, customerId),
      body,
      { signal },
    )
    const dto = data.data as SendReminderResultDto
    return { ...dto, customerId: String(dto.customerId), reminderId: String(dto.reminderId) }
  },

  /**
   * POST /vendors/:v/reminders/send-bulk
   * Owner-only. Send reminders to many customers at once.
   */
  async sendBulkReminders(
    vendorId: string,
    dto: SendBulkRemindersDto,
    signal?: AbortSignal,
  ): Promise<BulkReminderResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockBulkReminderResult }
    }
    const { data } = await httpClient.post(APIPath.Credit.SendBulk(vendorId), dto, { signal })
    return data.data as BulkReminderResultDto
  },

  /**
   * PATCH /vendors/:v/reminder-config
   * Owner-only. Update vendor automated-reminder configuration.
   */
  async updateReminderConfig(
    vendorId: string,
    patch: UpdateReminderConfigDto,
    signal?: AbortSignal,
  ): Promise<ReminderConfigDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockReminderConfig, ...patch }
    }
    const { data } = await httpClient.patch(APIPath.Credit.ReminderConfig(vendorId), patch, { signal })
    const dto = data.data as ReminderConfigDto
    return {
      ...dto,
      excludedCustomerIds: (dto.excludedCustomerIds ?? []).map(String),
    }
  },
}

export default creditService
