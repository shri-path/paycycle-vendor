/**
 * Referral Service Mock Fixtures (US-014)
 * Realistic data matching wireframe numbers for all GET responses.
 *
 * Key provisional items reflected here:
 * - `distance: null` on every NearbyVendorDto (no PostGIS in v1)
 * - `status: 'PENDING_PAYOUT'` on cash-withdrawal redeem result
 * - Includes an empty `byCategory` scenario for NearbyVendorsScreen empty-state
 */

import type {
  CreateReferralResultDto,
  ReferralDashboardDto,
  VendorReferralListDto,
  CustomerReferralsDto,
  BulkInviteResultDto,
  CreditBalanceDto,
  CreditTransactionDto,
  RedeemResultDto,
  NearbyVendorsDto,
  LeaderboardRowDto,
  PaginationMeta,
} from '../../../types/referral'

// ---------------------------------------------------------------------------
// POST /referrals/vendor — create referral
// ---------------------------------------------------------------------------

export const mockCreateReferralResult: CreateReferralResultDto = {
  referralId: '101',
  referralCode: 'KRISHNA2026',
  referralLink: 'https://paycycle.app/join/KRISHNA2026',
  message:
    'Join PayCycle — India\'s best daily-delivery management app! Use my referral code KRISHNA2026 to sign up: https://paycycle.app/join/KRISHNA2026',
  status: 'PENDING',
  createdAt: '2026-06-15T10:00:00.000Z',
}

// ---------------------------------------------------------------------------
// GET /referrals/dashboard
// ---------------------------------------------------------------------------

export const mockDashboard: ReferralDashboardDto = {
  totalEarnings: {
    credits: 3000,
    revenueShare: 900,
    total: 3900,
  },
  availableBalance: 1500,
  vendorReferrals: [
    {
      id: '201',
      referredVendorName: 'Sharma Dairy',
      referredDate: '2026-01-15T00:00:00.000Z',
      status: 'QUALIFIED',
      customerCount: 35,
      earned: {
        signup: 500,
        milestone10: 1000,
        milestone50: 0,
        revenueShare: 300,
        total: 1800,
      },
      nextMilestone: {
        type: '50_customers',
        reward: 5000,
        progress: 35,
        target: 50,
      },
    },
    {
      id: '202',
      referredVendorName: 'Patel Bakery',
      referredDate: '2026-03-10T00:00:00.000Z',
      status: 'SIGNED_UP',
      customerCount: 8,
      earned: {
        signup: 500,
        milestone10: 0,
        milestone50: 0,
        revenueShare: 0,
        total: 500,
      },
      nextMilestone: {
        type: '10_customers',
        reward: 1000,
        progress: 8,
        target: 10,
      },
    },
    {
      id: '203',
      referredVendorName: 'Verma Vegetables',
      referredDate: '2026-05-20T00:00:00.000Z',
      status: 'PENDING',
      customerCount: 0,
      earned: {
        signup: 0,
        milestone10: 0,
        milestone50: 0,
        revenueShare: 0,
        total: 0,
      },
      nextMilestone: {
        type: '10_customers',
        reward: 1000,
        progress: 0,
        target: 10,
      },
    },
    {
      id: '204',
      referredVendorName: 'Gupta News',
      referredDate: '2025-11-01T00:00:00.000Z',
      status: 'REWARDED',
      customerCount: 55,
      earned: {
        signup: 500,
        milestone10: 1000,
        milestone50: 5000,
        revenueShare: 600,
        total: 7100,
      },
      // null nextMilestone — all milestones achieved
      nextMilestone: null,
    },
  ],
  customerGrowthFromReferrals: {
    newCustomersThisMonth: 25,
    totalFromReferrals: 120,
    additionalMonthlyRevenue: 12500,
    topReferrer: {
      customerName: 'Priya Mehta',
      referralCount: 8,
    },
  },
}

// ---------------------------------------------------------------------------
// GET /referrals/vendor (paginated list)
// ---------------------------------------------------------------------------

export const mockVendorReferralList: VendorReferralListDto[] = [
  {
    id: '201',
    refereeName: 'Sharma Dairy',
    refereePhone: '9876543210',
    referralCode: 'KRISHNA2026',
    status: 'QUALIFIED',
    signupDate: '2026-01-20T00:00:00.000Z',
    customerCount: 35,
    totalEarned: 1800,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '202',
    refereeName: 'Patel Bakery',
    refereePhone: '9876543211',
    referralCode: 'KRISHNA2026',
    status: 'SIGNED_UP',
    signupDate: '2026-03-15T00:00:00.000Z',
    customerCount: 8,
    totalEarned: 500,
    createdAt: '2026-03-10T00:00:00.000Z',
  },
]

export const mockVendorReferralListMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 4,
  totalPages: 1,
}

// ---------------------------------------------------------------------------
// GET /customer-referrals
// ---------------------------------------------------------------------------

export const mockCustomerReferrals: CustomerReferralsDto = {
  summary: {
    newThisMonth: 8,
    totalFromReferrals: 25,
    percentageOfBase: 50,
  },
  topReferrers: [
    { customerId: '301', customerName: 'Priya Mehta', referralCount: 8 },
    { customerId: '302', customerName: 'Rahul Gupta', referralCount: 5 },
    { customerId: '303', customerName: 'Sunita Verma', referralCount: 3 },
  ],
  recentAdditions: [
    {
      referredCustomerName: 'Anil Kumar',
      referrerCustomerName: 'Priya Mehta',
      joinedDate: '2026-06-14T00:00:00.000Z',
    },
    {
      referredCustomerName: 'Meena Singh',
      referrerCustomerName: 'Rahul Gupta',
      joinedDate: '2026-06-10T00:00:00.000Z',
    },
    {
      referredCustomerName: 'Vijay Sharma',
      referrerCustomerName: 'Priya Mehta',
      joinedDate: '2026-06-05T00:00:00.000Z',
    },
  ],
}

export const mockCustomerReferralsMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 25,
  totalPages: 2,
}

// ---------------------------------------------------------------------------
// POST /customers/bulk-invite
// ---------------------------------------------------------------------------

export const mockBulkInviteResult: BulkInviteResultDto = {
  totalSent: 18,
  delivered: 16,
  failed: 2,
  skippedAlreadyOnPaycycle: 4,
}

export const mockBulkInviteResultZeroSent: BulkInviteResultDto = {
  totalSent: 0,
  delivered: 0,
  failed: 0,
  skippedAlreadyOnPaycycle: 22,
}

// ---------------------------------------------------------------------------
// GET /credits
// ---------------------------------------------------------------------------

export const mockCreditBalance: CreditBalanceDto = {
  availableCredits: 1500,
  lifetimeEarned: 3900,
  lifetimeUsed: 2400,
  withdrawalEligible: false,
  withdrawalMinimum: 2000,
}

export const mockCreditBalanceEligible: CreditBalanceDto = {
  availableCredits: 2500,
  lifetimeEarned: 5000,
  lifetimeUsed: 2500,
  withdrawalEligible: true,
  withdrawalMinimum: 2000,
}

// ---------------------------------------------------------------------------
// GET /credits/transactions
// ---------------------------------------------------------------------------

export const mockCreditTransactions: CreditTransactionDto[] = [
  {
    id: '401',
    transactionType: 'EARNED',
    rewardKind: 'SIGNUP_BONUS',
    amount: 500,
    balanceAfter: 500,
    sourceType: 'VENDOR_REFERRAL',
    description: 'Signup bonus for referring Sharma Dairy',
    createdAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: '402',
    transactionType: 'EARNED',
    rewardKind: 'MILESTONE_10',
    amount: 1000,
    balanceAfter: 1500,
    sourceType: 'VENDOR_REFERRAL',
    description: 'Milestone 10 customers bonus',
    createdAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '403',
    transactionType: 'USED',
    rewardKind: null,
    amount: -500,
    balanceAfter: 1000,
    sourceType: 'SUBSCRIPTION_PAYMENT',
    description: 'Applied to subscription',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
]

export const mockCreditTransactionsMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 3,
  totalPages: 1,
}

// ---------------------------------------------------------------------------
// POST /credits/redeem — subscription
// ---------------------------------------------------------------------------

export const mockRedeemSubscriptionResult: RedeemResultDto = {
  redemptionType: 'subscription',
  amountApplied: 499,
  feeCharged: 0,
  newBalance: 1001,
  status: 'APPLIED',
}

export const mockRedeemUpgradeResult: RedeemResultDto = {
  redemptionType: 'upgrade',
  amountApplied: 500,
  feeCharged: 0,
  newBalance: 1000,
  status: 'APPLIED',
}

export const mockRedeemWithdrawResult: RedeemResultDto = {
  redemptionType: 'withdraw',
  amountApplied: 2000,
  feeCharged: 200, // 10%
  newBalance: 0,
  status: 'PENDING_PAYOUT',
}

// ---------------------------------------------------------------------------
// GET /nearby-vendors
// ---------------------------------------------------------------------------

export const mockNearbyVendors: NearbyVendorsDto = {
  yourBusiness: {
    name: 'Krishna Dairy',
    customersOnPaycycle: 50,
    rankInArea: 3,
  },
  byCategory: {
    milk: [
      {
        name: 'Sharma Dairy',
        customersOnPaycycle: 65,
        distance: null, // provisional: no PostGIS
        yourReferral: true,
      },
      {
        name: 'Mehta Dairy',
        customersOnPaycycle: 45,
        distance: null,
        yourReferral: false,
      },
    ],
    newspaper: [
      {
        name: 'Patel News Agency',
        customersOnPaycycle: 120,
        distance: null,
        yourReferral: false,
      },
    ],
    bread: [
      {
        name: 'Patel Bakery',
        customersOnPaycycle: 30,
        distance: null,
        yourReferral: true,
      },
    ],
  },
  totalVendorsInRadius: 4,
  totalCustomersInRadius: 260,
  radius: 2,
}

export const mockNearbyVendorsEmpty: NearbyVendorsDto = {
  yourBusiness: {
    name: 'Krishna Dairy',
    customersOnPaycycle: 50,
    rankInArea: 0,
  },
  byCategory: {},
  totalVendorsInRadius: 0,
  totalCustomersInRadius: 0,
  radius: 2,
}

// ---------------------------------------------------------------------------
// GET /referrals/leaderboard
// ---------------------------------------------------------------------------

export const mockLeaderboard: LeaderboardRowDto[] = [
  {
    vendorId: '501',
    vendorName: 'Gupta Distributors',
    totalReferrals: 12,
    qualifiedReferrals: 8,
    rankPosition: 1,
    rewardEarned: 15000,
    isYou: false,
  },
  {
    vendorId: '502',
    vendorName: 'Mehta Supplies',
    totalReferrals: 10,
    qualifiedReferrals: 6,
    rankPosition: 2,
    rewardEarned: 12000,
    isYou: false,
  },
  {
    vendorId: '1',
    vendorName: 'Krishna Dairy',
    totalReferrals: 4,
    qualifiedReferrals: 3,
    rankPosition: 3,
    rewardEarned: 3900,
    isYou: true,
  },
]

export const mockLeaderboardMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 3,
  totalPages: 1,
}
