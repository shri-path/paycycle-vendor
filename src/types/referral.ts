/**
 * Referral Engine Type Definitions (US-014)
 *
 * All shapes frozen against the US-014 API contract in
 * `paycycle_api/docs/features/us-014-referral-engine/API_SPEC.md`.
 *
 * Conventions:
 * - All ids are strings (coerce numeric ids from API: `String(id)`).
 * - Money fields are plain `number` (INR, 2-decimal).
 * - Dates are ISO8601.
 * - `distance` is `null` in v1 (no PostGIS); never render a distance value.
 *
 * Security: vendorId is NEVER held on the client as a type field —
 * it appears only in request URL paths (JWT-derived on the server).
 */

// ---------------------------------------------------------------------------
// Referral status unions
// ---------------------------------------------------------------------------

export type ReferralStatus = 'PENDING' | 'SIGNED_UP' | 'QUALIFIED' | 'REWARDED'

export type NextMilestoneType = '10_customers' | '50_customers' | null

export type CreditTransactionType = 'EARNED' | 'USED' | 'EXPIRED' | 'ADJUSTMENT'

export type RewardKind =
  | 'SIGNUP_BONUS'
  | 'MILESTONE_10'
  | 'MILESTONE_50'
  | 'REVENUE_SHARE'
  | 'CUSTOMER_REFERRAL'
  | null

export type CreditSourceType =
  | 'VENDOR_REFERRAL'
  | 'CUSTOMER_REFERRAL'
  | 'SUBSCRIPTION_PAYMENT'
  | 'MANUAL'
  | null

export type RedemptionType = 'subscription' | 'upgrade' | 'withdraw'

export type RedemptionStatus = 'APPLIED' | 'PENDING_PAYOUT'

export type LeaderboardPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'

export type BulkInviteTargetType = 'all_not_on_paycycle' | 'specific'

export type InviteLanguage = 'hi' | 'en' | 'customer-pref'

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface CreateVendorReferralDto {
  vendorName?: string
  phoneNumber: string
}

export interface BulkInviteDto {
  targetType: BulkInviteTargetType
  customerIds?: string[]
  messageLanguage?: InviteLanguage
  customMessage?: string
  autoResend?: boolean
  maxAttempts?: 1 | 2 | 3
}

export interface RedeemCreditsDto {
  redemptionType: RedemptionType
  amount: number
}

// ---------------------------------------------------------------------------
// Response DTOs — POST /referrals/vendor
// ---------------------------------------------------------------------------

export interface CreateReferralResultDto {
  referralId: string
  referralCode: string
  referralLink: string
  message: string
  status: 'PENDING'
  createdAt: string
}

// ---------------------------------------------------------------------------
// Dashboard — GET /referrals/dashboard
// ---------------------------------------------------------------------------

export interface NextMilestoneDto {
  type: NextMilestoneType
  reward: number
  progress: number
  target: number
}

export interface VendorReferralEarned {
  signup: number
  milestone10: number
  milestone50: number
  revenueShare: number
  total: number
}

export interface DashboardVendorReferral {
  id: string
  referredVendorName: string
  referredDate: string
  status: ReferralStatus
  customerCount: number
  earned: VendorReferralEarned
  nextMilestone: NextMilestoneDto | null
}

export interface TopReferrerSummary {
  customerName: string
  referralCount: number
}

export interface CustomerGrowthFromReferrals {
  newCustomersThisMonth: number
  totalFromReferrals: number
  additionalMonthlyRevenue: number
  topReferrer: TopReferrerSummary | null
}

export interface TotalEarnings {
  credits: number
  revenueShare: number
  total: number
}

export interface ReferralDashboardDto {
  totalEarnings: TotalEarnings
  availableBalance: number
  vendorReferrals: DashboardVendorReferral[]
  customerGrowthFromReferrals: CustomerGrowthFromReferrals
}

// ---------------------------------------------------------------------------
// Vendor referral list — GET /referrals/vendor (paginated)
// ---------------------------------------------------------------------------

export interface VendorReferralListDto {
  id: string
  refereeName: string
  refereePhone: string
  referralCode: string
  status: ReferralStatus
  signupDate: string | null
  customerCount: number
  totalEarned: number
  createdAt: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Customer referrals — GET /customer-referrals
// ---------------------------------------------------------------------------

export interface CustomerReferralSummary {
  newThisMonth: number
  totalFromReferrals: number
  percentageOfBase: number
}

export interface TopReferrerDto {
  customerId: string
  customerName: string
  referralCount: number
}

export interface RecentAdditionDto {
  referredCustomerName: string
  referrerCustomerName: string
  joinedDate: string
}

export interface CustomerReferralsDto {
  summary: CustomerReferralSummary
  topReferrers: TopReferrerDto[]
  recentAdditions: RecentAdditionDto[]
}

// ---------------------------------------------------------------------------
// Bulk invite — POST /customers/bulk-invite
// ---------------------------------------------------------------------------

export interface BulkInviteResultDto {
  totalSent: number
  delivered: number
  failed: number
  skippedAlreadyOnPaycycle: number
}

// ---------------------------------------------------------------------------
// Credits — GET /credits
// ---------------------------------------------------------------------------

export interface CreditBalanceDto {
  availableCredits: number
  lifetimeEarned: number
  lifetimeUsed: number
  withdrawalEligible: boolean
  withdrawalMinimum: number
}

// ---------------------------------------------------------------------------
// Credit transactions — GET /credits/transactions (paginated)
// ---------------------------------------------------------------------------

export interface CreditTransactionDto {
  id: string
  transactionType: CreditTransactionType
  rewardKind: RewardKind
  amount: number
  balanceAfter: number
  sourceType: CreditSourceType
  description: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Redeem credits — POST /credits/redeem
// ---------------------------------------------------------------------------

export interface RedeemResultDto {
  redemptionType: RedemptionType
  amountApplied: number
  feeCharged: number
  newBalance: number
  status: RedemptionStatus
}

// ---------------------------------------------------------------------------
// Nearby vendors — GET /nearby-vendors
// ---------------------------------------------------------------------------

export interface NearbyVendorDto {
  name: string
  customersOnPaycycle: number
  /** null in v1 — no PostGIS; never render a distance value */
  distance: number | null
  yourReferral: boolean
}

export interface YourBusinessDto {
  name: string
  customersOnPaycycle: number
  rankInArea: number
}

export interface NearbyVendorsDto {
  yourBusiness: YourBusinessDto
  /** Dynamic-key object; iterate Object.entries */
  byCategory: Record<string, NearbyVendorDto[]>
  totalVendorsInRadius: number
  totalCustomersInRadius: number
  radius: number
}

// ---------------------------------------------------------------------------
// Leaderboard — GET /referrals/leaderboard (paginated)
// ---------------------------------------------------------------------------

export interface LeaderboardRowDto {
  vendorId: string
  vendorName: string
  totalReferrals: number
  qualifiedReferrals: number
  rankPosition: number
  rewardEarned: number
  isYou: boolean
}
