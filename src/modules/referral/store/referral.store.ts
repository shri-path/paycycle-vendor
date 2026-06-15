/**
 * Referral Store (US-014)
 * Purpose: Referral engine & vendor credit state for the active vendor.
 *
 * - NO persistence: financial + customer PII data is live/ephemeral.
 * - `error` fields hold i18n KEYS (never raw messages); failures go through the
 *   shared logger (correlationId, no PII) + mapApiError(_, 'referral'|'vendor_credit').
 * - Command actions RETHROW so screens can fire haptics + show contextual UI.
 * - Query actions swallow errors and set per-slice error keys.
 * - Paged actions (vendorReferrals, recentAdditions, creditTxns, leaderboard):
 *   page > 1 → append; page === 1 → replace (credit-store history pattern).
 * - `clearReferral()` wipes all slices; called by auth.store.logout() via lazy-require.
 * - `redeemCredits` on success: updates creditBalance.availableCredits from newBalance
 *   and invalidates the dashboard (sets dashboard:null; lazy re-fetch on focus).
 *
 * Security: vendorId always from auth.store.vendorContext (JWT-derived) — never from
 * route params or user input.
 */

import { create } from 'zustand'
import { referralService } from '../service/referral.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  ReferralDashboardDto,
  VendorReferralListDto,
  CustomerReferralsDto,
  RecentAdditionDto,
  CreditBalanceDto,
  CreditTransactionDto,
  NearbyVendorsDto,
  LeaderboardRowDto,
  CreateReferralResultDto,
  PaginationMeta,
  ReferralStatus,
  CreditTransactionType,
  LeaderboardPeriod,
  CreateVendorReferralDto,
  BulkInviteDto,
  BulkInviteResultDto,
  RedeemCreditsDto,
  RedeemResultDto,
} from '../../../types/referral'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getActiveVendorId(): string | null {
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface ReferralState {
  // --- Dashboard slice ---
  dashboard: ReferralDashboardDto | null
  isDashboardLoading: boolean
  dashboardError: string | null

  // --- Vendor referral list slice (paginated) ---
  vendorReferrals: VendorReferralListDto[]
  vendorReferralsMeta: PaginationMeta | null
  isListLoading: boolean
  listError: string | null
  listStatusFilter: ReferralStatus | undefined

  // --- Customer referrals slice (paged recentAdditions) ---
  customerRefs: CustomerReferralsDto | null
  recentAdditions: RecentAdditionDto[]
  recentAdditionsMeta: PaginationMeta | null
  isCustomerRefsLoading: boolean
  customerRefsError: string | null

  // --- Nearby vendors slice ---
  nearby: NearbyVendorsDto | null
  isNearbyLoading: boolean
  nearbyError: string | null
  nearbyRadius: number

  // --- Credit balance slice ---
  creditBalance: CreditBalanceDto | null
  isBalanceLoading: boolean
  balanceError: string | null

  // --- Credit transactions slice (paginated) ---
  creditTxns: CreditTransactionDto[]
  creditTxnsMeta: PaginationMeta | null
  isTxnsLoading: boolean
  txnsError: string | null
  txnTypeFilter: CreditTransactionType | undefined

  // --- Leaderboard slice (paginated) ---
  leaderboard: LeaderboardRowDto[]
  leaderboardMeta: PaginationMeta | null
  isLeaderboardLoading: boolean
  leaderboardError: string | null
  leaderboardPeriod: LeaderboardPeriod

  // --- Last referral create result (feeds ReferralCodeCard on ReferVendorScreen) ---
  lastReferral: CreateReferralResultDto | null

  // --- Global mutation flags ---
  isMutating: boolean
  mutationError: string | null

  // --- Query actions (swallow errors, set per-slice error keys) ---
  fetchDashboard(): Promise<void>
  fetchVendorReferrals(status?: ReferralStatus, page?: number): Promise<void>
  fetchCustomerReferrals(page?: number): Promise<void>
  fetchNearbyVendors(radius?: number): Promise<void>
  fetchCreditBalance(): Promise<void>
  fetchCreditTransactions(type?: CreditTransactionType, page?: number): Promise<void>
  fetchLeaderboard(period?: LeaderboardPeriod, page?: number): Promise<void>

  // --- Command actions (rethrow so screens can haptic + route) ---
  createVendorReferral(dto: CreateVendorReferralDto): Promise<CreateReferralResultDto>
  sendBulkInvite(dto: BulkInviteDto): Promise<BulkInviteResultDto>
  redeemCredits(dto: RedeemCreditsDto): Promise<RedeemResultDto>

  // --- Lifecycle ---
  clearErrors(): void
  clearReferral(): void
}

// ---------------------------------------------------------------------------
// Initial state (no persistence)
// ---------------------------------------------------------------------------

const initialState = {
  dashboard: null as ReferralDashboardDto | null,
  isDashboardLoading: false,
  dashboardError: null as string | null,

  vendorReferrals: [] as VendorReferralListDto[],
  vendorReferralsMeta: null as PaginationMeta | null,
  isListLoading: false,
  listError: null as string | null,
  listStatusFilter: undefined as ReferralStatus | undefined,

  customerRefs: null as CustomerReferralsDto | null,
  recentAdditions: [] as RecentAdditionDto[],
  recentAdditionsMeta: null as PaginationMeta | null,
  isCustomerRefsLoading: false,
  customerRefsError: null as string | null,

  nearby: null as NearbyVendorsDto | null,
  isNearbyLoading: false,
  nearbyError: null as string | null,
  nearbyRadius: 2,

  creditBalance: null as CreditBalanceDto | null,
  isBalanceLoading: false,
  balanceError: null as string | null,

  creditTxns: [] as CreditTransactionDto[],
  creditTxnsMeta: null as PaginationMeta | null,
  isTxnsLoading: false,
  txnsError: null as string | null,
  txnTypeFilter: undefined as CreditTransactionType | undefined,

  leaderboard: [] as LeaderboardRowDto[],
  leaderboardMeta: null as PaginationMeta | null,
  isLeaderboardLoading: false,
  leaderboardError: null as string | null,
  leaderboardPeriod: 'MONTHLY' as LeaderboardPeriod,

  lastReferral: null as CreateReferralResultDto | null,

  isMutating: false,
  mutationError: null as string | null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReferralStore = create<ReferralState>()((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  clearErrors: () =>
    set({
      dashboardError: null,
      listError: null,
      customerRefsError: null,
      nearbyError: null,
      balanceError: null,
      txnsError: null,
      leaderboardError: null,
      mutationError: null,
    }),

  clearReferral: () => set({ ...initialState }),

  // -------------------------------------------------------------------------
  // Queries (CQS: swallow, set per-slice error key)
  // -------------------------------------------------------------------------

  fetchDashboard: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isDashboardLoading: true, dashboardError: null })
    try {
      const result = await referralService.getDashboard(vendorId)
      set({ dashboard: result, isDashboardLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'ReferralDashboardScreen',
        action: 'fetchDashboard',
        endpoint: 'GET /vendors/:v/referrals/dashboard',
      })
      set({ isDashboardLoading: false, dashboardError: mapApiError(err, 'referral') })
    }
  },

  fetchVendorReferrals: async (status, page = 1) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    const resolvedStatus = status ?? get().listStatusFilter
    set({ isListLoading: true, listError: null, listStatusFilter: resolvedStatus })
    try {
      const { data, meta } = await referralService.getVendorReferrals(vendorId, {
        status: resolvedStatus,
        page,
        limit: 20,
      })
      set((state) => ({
        isListLoading: false,
        vendorReferrals:
          page > 1 ? [...state.vendorReferrals, ...data] : data,
        vendorReferralsMeta: meta,
      }))
    } catch (err) {
      void logError(err, {
        screen: 'ReferralDashboardScreen',
        action: 'fetchVendorReferrals',
        endpoint: 'GET /vendors/:v/referrals/vendor',
      })
      set({ isListLoading: false, listError: mapApiError(err, 'referral') })
    }
  },

  fetchCustomerReferrals: async (page = 1) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isCustomerRefsLoading: true, customerRefsError: null })
    try {
      const { data, meta } = await referralService.getCustomerReferrals(vendorId, { page, limit: 20 })
      set((state) => ({
        isCustomerRefsLoading: false,
        customerRefs: data,
        recentAdditions:
          page > 1
            ? [...state.recentAdditions, ...data.recentAdditions]
            : data.recentAdditions,
        recentAdditionsMeta: meta,
      }))
    } catch (err) {
      void logError(err, {
        screen: 'CustomerReferralsScreen',
        action: 'fetchCustomerReferrals',
        endpoint: 'GET /vendors/:v/customer-referrals',
      })
      set({ isCustomerRefsLoading: false, customerRefsError: mapApiError(err, 'referral') })
    }
  },

  fetchNearbyVendors: async (radius) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    const resolvedRadius = radius ?? get().nearbyRadius
    set({ isNearbyLoading: true, nearbyError: null, nearbyRadius: resolvedRadius })
    try {
      const result = await referralService.getNearbyVendors(vendorId, { radius: resolvedRadius })
      set({ nearby: result, isNearbyLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'NearbyVendorsScreen',
        action: 'fetchNearbyVendors',
        endpoint: 'GET /vendors/:v/nearby-vendors',
      })
      set({ isNearbyLoading: false, nearbyError: mapApiError(err, 'referral') })
    }
  },

  fetchCreditBalance: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isBalanceLoading: true, balanceError: null })
    try {
      const result = await referralService.getCreditBalance(vendorId)
      set({ creditBalance: result, isBalanceLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'CreditRedemptionScreen',
        action: 'fetchCreditBalance',
        endpoint: 'GET /vendors/:v/credits',
      })
      set({ isBalanceLoading: false, balanceError: mapApiError(err, 'vendor_credit') })
    }
  },

  fetchCreditTransactions: async (type, page = 1) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    const resolvedType = type ?? get().txnTypeFilter
    set({ isTxnsLoading: true, txnsError: null, txnTypeFilter: resolvedType })
    try {
      const { data, meta } = await referralService.getCreditTransactions(vendorId, {
        type: resolvedType,
        page,
        limit: 20,
      })
      set((state) => ({
        isTxnsLoading: false,
        creditTxns: page > 1 ? [...state.creditTxns, ...data] : data,
        creditTxnsMeta: meta,
      }))
    } catch (err) {
      void logError(err, {
        screen: 'CreditRedemptionScreen',
        action: 'fetchCreditTransactions',
        endpoint: 'GET /vendors/:v/credits/transactions',
      })
      set({ isTxnsLoading: false, txnsError: mapApiError(err, 'vendor_credit') })
    }
  },

  fetchLeaderboard: async (period, page = 1) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    const resolvedPeriod = period ?? get().leaderboardPeriod
    set({ isLeaderboardLoading: true, leaderboardError: null, leaderboardPeriod: resolvedPeriod })
    try {
      const { data, meta } = await referralService.getLeaderboard(vendorId, {
        period: resolvedPeriod,
        page,
        limit: 20,
      })
      set((state) => ({
        isLeaderboardLoading: false,
        leaderboard: page > 1 ? [...state.leaderboard, ...data] : data,
        leaderboardMeta: meta,
      }))
    } catch (err) {
      void logError(err, {
        screen: 'ReferralDashboardScreen',
        action: 'fetchLeaderboard',
        endpoint: 'GET /vendors/:v/referrals/leaderboard',
      })
      set({ isLeaderboardLoading: false, leaderboardError: mapApiError(err, 'referral') })
    }
  },

  // -------------------------------------------------------------------------
  // Commands (CQS: rethrow on failure)
  // -------------------------------------------------------------------------

  createVendorReferral: async (dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await referralService.createVendorReferral(vendorId, dto)
      set({ isMutating: false, lastReferral: result })
      return result
    } catch (err) {
      void logError(err, {
        screen: 'ReferVendorScreen',
        action: 'createVendorReferral',
        endpoint: 'POST /vendors/:v/referrals/vendor',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'referral') })
      throw err
    }
  },

  sendBulkInvite: async (dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await referralService.sendBulkInvite(vendorId, dto)
      set({ isMutating: false })
      return result
    } catch (err) {
      void logError(err, {
        screen: 'BulkInviteCustomersScreen',
        action: 'sendBulkInvite',
        endpoint: 'POST /vendors/:v/customers/bulk-invite',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'referral') })
      throw err
    }
  },

  redeemCredits: async (dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await referralService.redeemCredits(vendorId, dto)
      set((state) => ({
        isMutating: false,
        // Update available balance from the authoritative newBalance
        creditBalance: state.creditBalance
          ? { ...state.creditBalance, availableCredits: result.newBalance }
          : null,
        // Invalidate dashboard — availableBalance has changed; re-fetch on focus
        dashboard: null,
      }))
      return result
    } catch (err) {
      void logError(err, {
        screen: 'CreditRedemptionScreen',
        action: 'redeemCredits',
        endpoint: 'POST /vendors/:v/credits/redeem',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'vendor_credit') })
      throw err
    }
  },
}))

export default useReferralStore
