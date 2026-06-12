/**
 * Subscription Service (US-009)
 * Purpose: Subscription & pricing API calls — mock in dev, real API via httpClient.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data.
 *
 * Envelope handling:
 * - GET /subscription-plans → object-shaped `data.data.plans` (array inside the object)
 * - GET .../subscription   → object-shaped `data.data` (SubscriptionViewDto)
 * - POST upgrade/renew     → object-shaped `data.data` (UpgradeResultDto/RenewResultDto)
 * - POST cancel            → object-shaped `data.data` (CancelResultDto)
 * - PATCH auto-renewal     → object-shaped `data.data` (AutoRenewalResultDto)
 * - GET invoices/history   → list envelope `data.data` + `data.meta`
 *
 * All ids are STRINGS. Errors bubble up; the store maps them via
 * `mapApiError(_, 'subscription', action)`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  PlanDto,
  SubscriptionViewDto,
  UpgradeResultDto,
  RenewResultDto,
  CancelResultDto,
  AutoRenewalResultDto,
  InvoiceDto,
  HistoryEventDto,
  PaginationMeta,
  ListInvoicesOptions,
  BillingCycle,
} from '../../../types/subscription'
import {
  mockPlans,
  mockSubscriptionView,
  mockInvoices,
  mockInvoicesMeta,
  mockHistoryEvents,
  mockHistoryMeta,
  buildUpgradeResult,
  buildRenewResult,
  buildCancelResult,
  buildAutoRenewalResult,
} from './subscription.mock'

export const subscriptionService = {
  /**
   * GET /subscription-plans
   * Not vendor-scoped. Object-shaped envelope: `data.data.plans`.
   */
  async getPlans(signal?: AbortSignal): Promise<PlanDto[]> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return [...mockPlans]
    }
    const { data } = await httpClient.get(APIPath.Subscription.Plans(), { signal })
    return (data.data as { plans: PlanDto[] }).plans
  },

  /**
   * GET /vendors/:vendorId/subscription
   * Object-shaped envelope: `data.data` is SubscriptionViewDto.
   */
  async getSubscription(vendorId: string, signal?: AbortSignal): Promise<SubscriptionViewDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockSubscriptionView }
    }
    const { data } = await httpClient.get(APIPath.Subscription.View(vendorId), { signal })
    return data.data as SubscriptionViewDto
  },

  /**
   * POST /vendors/:vendorId/subscription/upgrade
   * Body: { newPlanId, billingCycle }. Object-shaped result.
   */
  async upgradeSubscription(
    vendorId: string,
    newPlanId: string,
    billingCycle: BillingCycle,
    signal?: AbortSignal,
  ): Promise<UpgradeResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildUpgradeResult()
    }
    const { data } = await httpClient.post(
      APIPath.Subscription.Upgrade(vendorId),
      { newPlanId, billingCycle },
      { signal },
    )
    return data.data as UpgradeResultDto
  },

  /**
   * POST /vendors/:vendorId/subscription/renew
   * Body: { billingCycle }. Object-shaped result.
   */
  async renewSubscription(
    vendorId: string,
    billingCycle: BillingCycle,
    signal?: AbortSignal,
  ): Promise<RenewResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildRenewResult()
    }
    const { data } = await httpClient.post(
      APIPath.Subscription.Renew(vendorId),
      { billingCycle },
      { signal },
    )
    return data.data as RenewResultDto
  },

  /**
   * POST /vendors/:vendorId/subscription/cancel
   * Body: {} (empty). Object-shaped result.
   */
  async cancelSubscription(vendorId: string, signal?: AbortSignal): Promise<CancelResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildCancelResult()
    }
    const { data } = await httpClient.post(
      APIPath.Subscription.Cancel(vendorId),
      {},
      { signal },
    )
    return data.data as CancelResultDto
  },

  /**
   * PATCH /vendors/:vendorId/subscription/auto-renewal
   * Body: { autoRenewal: boolean }. Object-shaped result.
   */
  async toggleAutoRenewal(
    vendorId: string,
    enabled: boolean,
    signal?: AbortSignal,
  ): Promise<AutoRenewalResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildAutoRenewalResult(enabled)
    }
    const { data } = await httpClient.patch(
      APIPath.Subscription.AutoRenewal(vendorId),
      { autoRenewal: enabled },
      { signal },
    )
    return data.data as AutoRenewalResultDto
  },

  /**
   * GET /vendors/:vendorId/subscription/invoices
   * List envelope: `data.data` array + `data.meta`.
   */
  async getInvoices(
    vendorId: string,
    opts: ListInvoicesOptions = {},
    signal?: AbortSignal,
  ): Promise<{ data: InvoiceDto[]; meta: PaginationMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { data: [...mockInvoices], meta: { ...mockInvoicesMeta } }
    }
    const { data } = await httpClient.get(APIPath.Subscription.Invoices(vendorId), {
      params: { page: opts.page, limit: opts.limit },
      signal,
    })
    return { data: data.data as InvoiceDto[], meta: data.meta as PaginationMeta }
  },

  /**
   * GET /vendors/:vendorId/subscription/history
   * List envelope: `data.data` array + `data.meta`.
   * Not surfaced in MVP UI (OQ-9) — shipped for API parity.
   */
  async getHistory(
    vendorId: string,
    opts: ListInvoicesOptions = {},
    signal?: AbortSignal,
  ): Promise<{ data: HistoryEventDto[]; meta: PaginationMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { data: [...mockHistoryEvents], meta: { ...mockHistoryMeta } }
    }
    const { data } = await httpClient.get(APIPath.Subscription.History(vendorId), {
      params: { page: opts.page, limit: opts.limit },
      signal,
    })
    return { data: data.data as HistoryEventDto[], meta: data.meta as PaginationMeta }
  },
}

export default subscriptionService
