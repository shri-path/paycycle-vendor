/**
 * Referral Store Tests (US-014)
 * Tests: CQS discipline (query swallow / command rethrow), vendorId guard,
 * pagination append, redeemCredits balance + dashboard invalidation,
 * and clearReferral reset.
 */

import { act } from '@testing-library/react-native'
import { useReferralStore } from '../referral.store'

// Mock auth store
jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ vendorContext: { vendorId: 'vendor-1' } }),
  },
}))

// Mock error mapper
jest.mock('@utils/errorMapper', () => ({
  mapApiError: (_err: unknown, _ctx: string) => 'referral.error.generic',
}))

// Mock logger
jest.mock('@utils/logger', () => ({
  logError: jest.fn(),
}))

// Mock referral service — factory must NOT reference any  declared outside,
// because jest.mock is hoisted above all variable declarations (TDZ issue).
// Use jest.fn() inside the factory; retrieve via jest.requireMock() in tests.
jest.mock('../../service/referral.service', () => ({
  referralService: {
    getDashboard: jest.fn(),
    getVendorReferrals: jest.fn(),
    getCustomerReferrals: jest.fn(),
    getNearbyVendors: jest.fn(),
    getCreditBalance: jest.fn(),
    getCreditTransactions: jest.fn(),
    getLeaderboard: jest.fn(),
    createVendorReferral: jest.fn(),
    sendBulkInvite: jest.fn(),
    redeemCredits: jest.fn(),
  },
}))

// Typed reference to the mocked service — retrieved AFTER module is resolved
const mockService = (
  jest.requireMock('../../service/referral.service') as {
    referralService: {
      getDashboard: jest.Mock
      getVendorReferrals: jest.Mock
      getCustomerReferrals: jest.Mock
      getNearbyVendors: jest.Mock
      getCreditBalance: jest.Mock
      getCreditTransactions: jest.Mock
      getLeaderboard: jest.Mock
      createVendorReferral: jest.Mock
      sendBulkInvite: jest.Mock
      redeemCredits: jest.Mock
    }
  }
).referralService

// Fixtures
const makeDashboard = () => ({
  totalEarnings: { credits: 1500, revenueShare: 400, total: 1900 },
  availableBalance: 1500,
  vendorReferrals: [],
  customerGrowthFromReferrals: {
    newCustomersThisMonth: 5,
    totalFromReferrals: 20,
    additionalMonthlyRevenue: 5000,
    topReferrer: null,
  },
})

const makeCreditBalance = () => ({
  availableCredits: 1500,
  lifetimeEarned: 3000,
  lifetimeUsed: 1500,
  withdrawalEligible: false,
  withdrawalMinimum: 2000,
})

const makeRedeemResult = () => ({
  redemptionType: 'subscription' as const,
  amountApplied: 499,
  feeCharged: 0,
  newBalance: 1001,
  status: 'APPLIED' as const,
})

const makeReferralResult = () => ({
  referralId: '101',
  referralCode: 'KRISHNA2026',
  referralLink: 'https://paycycle.app/join/KRISHNA2026',
  message: 'Join PayCycle with code KRISHNA2026',
  status: 'PENDING' as const,
  createdAt: '2026-06-15T10:00:00.000Z',
})

const makePagination = (page = 1, total = 5) => ({
  page,
  limit: 20,
  total,
  totalPages: Math.ceil(total / 20),
})

describe('useReferralStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    void act(async () => {
      useReferralStore.getState().clearReferral()
    })
  })

  // ---------------------------------------------------------------------------
  // Query actions — CQS: swallow errors, set per-slice key
  // ---------------------------------------------------------------------------

  describe('fetchDashboard (query)', () => {
    it('sets dashboard on success', async () => {
      const dashboard = makeDashboard()
      mockService.getDashboard.mockResolvedValue(dashboard)

      await act(async () => {
        await useReferralStore.getState().fetchDashboard()
      })

      expect(useReferralStore.getState().dashboard).toEqual(dashboard)
      expect(useReferralStore.getState().isDashboardLoading).toBe(false)
      expect(useReferralStore.getState().dashboardError).toBeNull()
    })

    it('swallows errors and sets dashboardError key', async () => {
      mockService.getDashboard.mockRejectedValue(new Error('Network fail'))

      await act(async () => {
        await expect(
          useReferralStore.getState().fetchDashboard(),
        ).resolves.toBeUndefined() // does NOT rethrow
      })

      expect(useReferralStore.getState().dashboard).toBeNull()
      expect(useReferralStore.getState().dashboardError).toBe('referral.error.generic')
    })

    it('no-ops when vendorId is absent', async () => {
      // Override auth store to return no vendorId
      const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as {
        useAuthStore: { getState: () => { vendorContext: null } }
      }
      const original = useAuthStore.getState
      useAuthStore.getState = () => ({ vendorContext: null })

      await act(async () => {
        await useReferralStore.getState().fetchDashboard()
      })

      expect(mockService.getDashboard).not.toHaveBeenCalled()
      useAuthStore.getState = original
    })
  })

  describe('fetchVendorReferrals pagination append', () => {
    const makeRow = (id: string) => ({
      id,
      refereeName: `Vendor ${id}`,
      refereePhone: '9876543210',
      referralCode: 'CODE',
      status: 'QUALIFIED' as const,
      signupDate: null,
      customerCount: 5,
      totalEarned: 500,
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    it('replaces list on page 1', async () => {
      mockService.getVendorReferrals.mockResolvedValue({
        data: [makeRow('1'), makeRow('2')],
        meta: makePagination(1, 2),
      })

      await act(async () => {
        await useReferralStore.getState().fetchVendorReferrals(undefined, 1)
      })

      expect(useReferralStore.getState().vendorReferrals).toHaveLength(2)
    })

    it('appends on page 2', async () => {
      // First load page 1
      mockService.getVendorReferrals.mockResolvedValueOnce({
        data: [makeRow('1'), makeRow('2')],
        meta: makePagination(1, 4),
      })
      await act(async () => {
        await useReferralStore.getState().fetchVendorReferrals(undefined, 1)
      })

      // Then append page 2
      mockService.getVendorReferrals.mockResolvedValueOnce({
        data: [makeRow('3'), makeRow('4')],
        meta: makePagination(2, 4),
      })
      await act(async () => {
        await useReferralStore.getState().fetchVendorReferrals(undefined, 2)
      })

      expect(useReferralStore.getState().vendorReferrals).toHaveLength(4)
    })
  })

  describe('fetchCreditBalance (query)', () => {
    it('swallows errors with balanceError key', async () => {
      mockService.getCreditBalance.mockRejectedValue(new Error('Server error'))

      await act(async () => {
        await expect(
          useReferralStore.getState().fetchCreditBalance(),
        ).resolves.toBeUndefined()
      })

      expect(useReferralStore.getState().balanceError).toBe('referral.error.generic')
    })
  })

  // ---------------------------------------------------------------------------
  // Command actions — CQS: rethrow, set mutationError
  // ---------------------------------------------------------------------------

  describe('createVendorReferral (command)', () => {
    it('sets lastReferral on success and returns result', async () => {
      const result = makeReferralResult()
      mockService.createVendorReferral.mockResolvedValue(result)

      let returned: typeof result | undefined
      await act(async () => {
        returned = await useReferralStore
          .getState()
          .createVendorReferral({ phoneNumber: '9876543210' })
      })

      expect(returned).toEqual(result)
      expect(useReferralStore.getState().lastReferral).toEqual(result)
      expect(useReferralStore.getState().isMutating).toBe(false)
    })

    it('rethrows on failure and sets mutationError', async () => {
      mockService.createVendorReferral.mockRejectedValue(new Error('Rate limited'))

      await act(async () => {
        await expect(
          useReferralStore.getState().createVendorReferral({ phoneNumber: '9876543210' }),
        ).rejects.toThrow()
      })

      expect(useReferralStore.getState().mutationError).toBe('referral.error.generic')
    })
  })

  describe('redeemCredits (command)', () => {
    it('updates creditBalance.availableCredits from newBalance', async () => {
      mockService.getCreditBalance.mockResolvedValue(makeCreditBalance())
      await act(async () => {
        await useReferralStore.getState().fetchCreditBalance()
      })

      const redeemResult = makeRedeemResult()
      mockService.redeemCredits.mockResolvedValue(redeemResult)
      await act(async () => {
        await useReferralStore.getState().redeemCredits({ redemptionType: 'subscription', amount: 499 })
      })

      expect(useReferralStore.getState().creditBalance?.availableCredits).toBe(
        redeemResult.newBalance,
      )
    })

    it('invalidates dashboard (sets null) on success', async () => {
      // Pre-populate dashboard
      mockService.getDashboard.mockResolvedValue(makeDashboard())
      await act(async () => {
        await useReferralStore.getState().fetchDashboard()
      })
      expect(useReferralStore.getState().dashboard).not.toBeNull()

      // Redeem
      mockService.redeemCredits.mockResolvedValue(makeRedeemResult())
      await act(async () => {
        await useReferralStore.getState().redeemCredits({ redemptionType: 'subscription', amount: 499 })
      })

      // Dashboard should be invalidated (null)
      expect(useReferralStore.getState().dashboard).toBeNull()
    })

    it('rethrows on failure', async () => {
      mockService.redeemCredits.mockRejectedValue(new Error('Insufficient credits'))

      await act(async () => {
        await expect(
          useReferralStore.getState().redeemCredits({ redemptionType: 'subscription', amount: 999 }),
        ).rejects.toThrow()
      })

      expect(useReferralStore.getState().mutationError).toBe('referral.error.generic')
    })
  })

  describe('sendBulkInvite (command)', () => {
    it('returns result and clears mutating', async () => {
      const bulkResult = {
        totalSent: 18,
        delivered: 16,
        failed: 2,
        skippedAlreadyOnPaycycle: 4,
      }
      mockService.sendBulkInvite.mockResolvedValue(bulkResult)

      let returned: typeof bulkResult | undefined
      await act(async () => {
        returned = await useReferralStore.getState().sendBulkInvite({
          targetType: 'all_not_on_paycycle',
        })
      })

      expect(returned).toEqual(bulkResult)
      expect(useReferralStore.getState().isMutating).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // clearReferral
  // ---------------------------------------------------------------------------

  describe('clearReferral', () => {
    it('resets all slices to initial state', async () => {
      mockService.getDashboard.mockResolvedValue(makeDashboard())
      await act(async () => {
        await useReferralStore.getState().fetchDashboard()
      })
      expect(useReferralStore.getState().dashboard).not.toBeNull()

      act(() => {
        useReferralStore.getState().clearReferral()
      })

      const state = useReferralStore.getState()
      expect(state.dashboard).toBeNull()
      expect(state.creditBalance).toBeNull()
      expect(state.vendorReferrals).toHaveLength(0)
      expect(state.lastReferral).toBeNull()
    })
  })
})
