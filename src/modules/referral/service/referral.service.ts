/**
 * Referral Service (US-014)
 * Purpose: API calls for the referral engine & credit management.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is
 * derived from the JWT on the server and never sent as user-controlled data.
 *
 * Envelope handling (standard paycycle_api envelope):
 *   Commands (POST) → `data.data`
 *   Queries (single) → `data.data`
 *   Queries (list/paginated) → `data.data` (array) + `data.meta`
 *
 * All ids are STRINGS. Numeric ids from the API are coerced: `String(id)`.
 * `distance` is left as-is (null in v1 — never rendered by the UI).
 * Errors bubble up; the store maps them via mapApiError(_, 'referral'|'vendor_credit').
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  CreateVendorReferralDto,
  CreateReferralResultDto,
  ReferralDashboardDto,
  VendorReferralListDto,
  CustomerReferralsDto,
  BulkInviteDto,
  BulkInviteResultDto,
  CreditBalanceDto,
  CreditTransactionDto,
  RedeemCreditsDto,
  RedeemResultDto,
  NearbyVendorsDto,
  LeaderboardRowDto,
  PaginationMeta,
  ReferralStatus,
  CreditTransactionType,
  LeaderboardPeriod,
} from '../../../types/referral'
import {
  mockCreateReferralResult,
  mockDashboard,
  mockVendorReferralList,
  mockVendorReferralListMeta,
  mockCustomerReferrals,
  mockCustomerReferralsMeta,
  mockBulkInviteResult,
  mockCreditBalance,
  mockCreditTransactions,
  mockCreditTransactionsMeta,
  mockRedeemSubscriptionResult,
  mockRedeemUpgradeResult,
  mockRedeemWithdrawResult,
  mockNearbyVendors,
  mockLeaderboard,
  mockLeaderboardMeta,
} from './referral.mock'

export const referralService = {
  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * POST /vendors/:v/referrals/vendor
   * Owner-only. Create a vendor-to-vendor referral.
   * Returns referralCode + referralLink + WhatsApp message.
   * Rate-limited: 10/day.
   */
  async createVendorReferral(
    vendorId: string,
    dto: CreateVendorReferralDto,
    signal?: AbortSignal,
  ): Promise<CreateReferralResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        ...mockCreateReferralResult,
        // simulate returning the entered phone in the message
        message: mockCreateReferralResult.message,
      }
    }
    const { data } = await httpClient.post(APIPath.Referral.CreateVendor(vendorId), dto, { signal })
    const result = data.data as CreateReferralResultDto
    return { ...result, referralId: String(result.referralId) }
  },

  /**
   * POST /vendors/:v/customers/bulk-invite
   * Owner-only. Send WhatsApp invites to customers not yet on PayCycle.
   * totalSent:0 is a success (not an error).
   */
  async sendBulkInvite(
    vendorId: string,
    dto: BulkInviteDto,
    signal?: AbortSignal,
  ): Promise<BulkInviteResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockBulkInviteResult }
    }
    const { data } = await httpClient.post(APIPath.Referral.BulkInvite(vendorId), dto, { signal })
    return data.data as BulkInviteResultDto
  },

  /**
   * POST /vendors/:v/credits/redeem
   * Owner-only. Redeem credits toward subscription, upgrade, or withdrawal.
   * Cash withdrawal returns status:'PENDING_PAYOUT' (no synchronous bank transfer in v1).
   */
  async redeemCredits(
    vendorId: string,
    dto: RedeemCreditsDto,
    signal?: AbortSignal,
  ): Promise<RedeemResultDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      if (dto.redemptionType === 'withdraw') return { ...mockRedeemWithdrawResult }
      if (dto.redemptionType === 'upgrade') return { ...mockRedeemUpgradeResult }
      return { ...mockRedeemSubscriptionResult }
    }
    const { data } = await httpClient.post(APIPath.VendorCredit.Redeem(vendorId), dto, { signal })
    return data.data as RedeemResultDto
  },

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * GET /vendors/:v/referrals/dashboard
   * Owner-only. Full referral dashboard — earnings, milestones, customer growth.
   */
  async getDashboard(vendorId: string, signal?: AbortSignal): Promise<ReferralDashboardDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockDashboard }
    }
    const { data } = await httpClient.get(APIPath.Referral.Dashboard(vendorId), { signal })
    const dto = data.data as ReferralDashboardDto
    return {
      ...dto,
      vendorReferrals: (dto.vendorReferrals ?? []).map((r) => ({
        ...r,
        id: String(r.id),
      })),
    }
  },

  /**
   * GET /vendors/:v/referrals/vendor
   * Owner-only. Paginated list of vendor referrals.
   */
  async getVendorReferrals(
    vendorId: string,
    params: { status?: ReferralStatus; page?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ data: VendorReferralListDto[]; meta: PaginationMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const filtered = params.status
        ? mockVendorReferralList.filter((r) => r.status === params.status)
        : mockVendorReferralList
      return {
        data: filtered.map((r) => ({ ...r })),
        meta: { ...mockVendorReferralListMeta },
      }
    }
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    }
    if (params.status) queryParams['status'] = params.status
    const { data } = await httpClient.get(APIPath.Referral.VendorList(vendorId), {
      params: queryParams,
      signal,
    })
    const list = (data.data ?? []) as VendorReferralListDto[]
    return {
      data: list.map((r) => ({ ...r, id: String(r.id) })),
      meta: (data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as PaginationMeta,
    }
  },

  /**
   * GET /vendors/:v/customer-referrals
   * Owner-only. Customer referral summary, top referrers, and paged recent additions.
   */
  async getCustomerReferrals(
    vendorId: string,
    params: { page?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ data: CustomerReferralsDto; meta: PaginationMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        data: { ...mockCustomerReferrals },
        meta: { ...mockCustomerReferralsMeta },
      }
    }
    const { data } = await httpClient.get(APIPath.Referral.CustomerReferrals(vendorId), {
      params: { page: params.page ?? 1, limit: params.limit ?? 20 },
      signal,
    })
    const dto = data.data as CustomerReferralsDto
    return {
      data: {
        ...dto,
        topReferrers: (dto.topReferrers ?? []).map((r) => ({
          ...r,
          customerId: String(r.customerId),
        })),
        recentAdditions: dto.recentAdditions ?? [],
      },
      meta: (data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as PaginationMeta,
    }
  },

  /**
   * GET /vendors/:v/credits
   * Owner-only. Credit balance summary.
   */
  async getCreditBalance(vendorId: string, signal?: AbortSignal): Promise<CreditBalanceDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockCreditBalance }
    }
    const { data } = await httpClient.get(APIPath.VendorCredit.Balance(vendorId), { signal })
    return data.data as CreditBalanceDto
  },

  /**
   * GET /vendors/:v/credits/transactions
   * Owner-only. Paginated immutable credit ledger.
   */
  async getCreditTransactions(
    vendorId: string,
    params: { type?: CreditTransactionType; page?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ data: CreditTransactionDto[]; meta: PaginationMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        data: mockCreditTransactions.map((t) => ({ ...t })),
        meta: { ...mockCreditTransactionsMeta },
      }
    }
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    }
    if (params.type) queryParams['type'] = params.type
    const { data } = await httpClient.get(APIPath.VendorCredit.Transactions(vendorId), {
      params: queryParams,
      signal,
    })
    const list = (data.data ?? []) as CreditTransactionDto[]
    return {
      data: list.map((t) => ({ ...t, id: String(t.id) })),
      meta: (data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as PaginationMeta,
    }
  },

  /**
   * GET /vendors/:v/nearby-vendors?radius=
   * Owner-only. Nearby vendors grouped by category.
   * `distance` is null in v1 — never rendered.
   */
  async getNearbyVendors(
    vendorId: string,
    params: { radius?: number },
    signal?: AbortSignal,
  ): Promise<NearbyVendorsDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { ...mockNearbyVendors }
    }
    const { data } = await httpClient.get(APIPath.Referral.NearbyVendors(vendorId), {
      params: { radius: params.radius ?? 2 },
      signal,
    })
    const dto = data.data as NearbyVendorsDto
    // Null-guard byCategory — must always be an object
    const byCategory: Record<string, NearbyVendorsDto['byCategory'][string]> = dto.byCategory ?? {}
    return { ...dto, byCategory }
  },

  /**
   * GET /vendors/:v/referrals/leaderboard
   * Owner-only. Pre-computed referral leaderboard.
   */
  async getLeaderboard(
    vendorId: string,
    params: { period?: LeaderboardPeriod; page?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ data: LeaderboardRowDto[]; meta: PaginationMeta }> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        data: mockLeaderboard.map((r) => ({ ...r })),
        meta: { ...mockLeaderboardMeta },
      }
    }
    const queryParams: Record<string, string | number> = {
      period: params.period ?? 'MONTHLY',
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    }
    const { data } = await httpClient.get(APIPath.Referral.Leaderboard(vendorId), {
      params: queryParams,
      signal,
    })
    const list = (data.data ?? []) as LeaderboardRowDto[]
    return {
      data: list.map((r) => ({ ...r, vendorId: String(r.vendorId) })),
      meta: (data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as PaginationMeta,
    }
  },
}

export default referralService
