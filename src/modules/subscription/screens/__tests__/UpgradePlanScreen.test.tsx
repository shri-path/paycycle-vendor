/**
 * UpgradePlanScreen tests (US-009)
 * Covers: loading state, eligible-plan filtering, plan card rendering,
 * empty state for PRO plan, select plan calls upgrade + toast + back.
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({
  useRequireOwner: jest.fn(),
}))

// Alert.alert is spied on in beforeEach (after imports).
const mockAlertAlert = jest.fn()

jest.mock('../../store/subscription.store', () => ({ useSubscriptionStore: jest.fn() }))

import React from 'react'
import { Alert } from 'react-native'
import { render, act, fireEvent } from '@testing-library/react-native'
import UpgradePlanScreen from '../UpgradePlanScreen'
import { t } from '@locales/index'
import type { SubscriptionViewDto, PlanDto } from '../../../../types/subscription'

const { useSubscriptionStore } = jest.requireMock('../../store/subscription.store') as {
  useSubscriptionStore: jest.Mock
}

const mockFetchPlans = jest.fn().mockResolvedValue(undefined)
const mockFetchSubscription = jest.fn().mockResolvedValue(undefined)
const mockUpgrade = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const growthSub: SubscriptionViewDto = {
  currentPlan: {
    subscriptionId: '10',
    planId: '2',
    planCode: 'GROWTH',
    planName: 'Growth',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    startDate: '2026-04-01',
    endDate: null,
    nextBillingDate: '2026-05-01',
    autoRenewal: true,
    isTrial: false,
    limits: { maxCustomers: 150, maxStaff: 3, maxSupplyLists: 10 },
  },
  usage: { customers: 50, staff: 1, supplyLists: 3 },
  utilizationPercentage: { customers: 33, staff: 33, supplyLists: 30 },
  canAddMore: { customers: true, staff: true, supplyLists: true },
}

const allPlans: PlanDto[] = [
  {
    id: '1',
    planCode: 'STARTER',
    planName: 'Starter',
    maxCustomers: 20,
    maxStaff: 1,
    maxSupplyLists: 5,
    priceMonthly: 0,
    priceYearly: null,
    features: {},
  },
  {
    id: '2',
    planCode: 'GROWTH',
    planName: 'Growth',
    maxCustomers: 150,
    maxStaff: 3,
    maxSupplyLists: 10,
    priceMonthly: 499,
    priceYearly: 4990,
    features: {},
  },
  {
    id: '3',
    planCode: 'PRO',
    planName: 'Pro',
    maxCustomers: 0,
    maxStaff: 0,
    maxSupplyLists: 0,
    priceMonthly: 999,
    priceYearly: 9990,
    features: {},
  },
]

function mockStore(state: Record<string, unknown>) {
  useSubscriptionStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      plans: [],
      isPlansLoading: false,
      plansError: null,
      currentSubscription: null,
      isSubLoading: false,
      isMutating: false,
      mutationError: null,
      fetchPlans: mockFetchPlans,
      fetchSubscription: mockFetchSubscription,
      upgrade: mockUpgrade,
      clearError: mockClearError,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Alert, 'alert').mockImplementation(mockAlertAlert)
  mockStore({})
})

describe('UpgradePlanScreen', () => {
  it('fetches plans on mount', async () => {
    mockStore({ currentSubscription: growthSub, plans: allPlans })
    await act(async () => render(<UpgradePlanScreen />))
    expect(mockFetchPlans).toHaveBeenCalled()
  })

  it('shows loading spinner when plans empty and loading', async () => {
    mockStore({ isPlansLoading: true, plans: [] })
    const screen = await act(async () => render(<UpgradePlanScreen />))
    expect(screen.getByText(t('subscription.upgrade_plan'))).toBeTruthy()
  })

  it('renders only plans with higher priceMonthly than current (PRO only for GROWTH)', async () => {
    mockStore({ currentSubscription: growthSub, plans: allPlans })
    const screen = await act(async () => render(<UpgradePlanScreen />))
    // Pro plan should appear; Starter and Growth should not
    expect(screen.getByText('Pro')).toBeTruthy()
    expect(screen.queryByText('Starter')).toBeNull()
    // Growth card's select button uses planCode: plan-select-GROWTH
    expect(screen.queryByTestId('plan-select-GROWTH')).toBeNull()
  })

  it('shows empty state when already on PRO', async () => {
    const proSub: SubscriptionViewDto = {
      ...growthSub,
      currentPlan: { ...growthSub.currentPlan, planCode: 'PRO', limits: { maxCustomers: 0, maxStaff: 0, maxSupplyLists: 0 } },
    }
    mockStore({ currentSubscription: proSub, plans: allPlans })
    const screen = await act(async () => render(<UpgradePlanScreen />))
    // No plan cards to select (plan-select uses planCode)
    expect(screen.queryByTestId('plan-select-STARTER')).toBeNull()
    expect(screen.queryByTestId('plan-select-GROWTH')).toBeNull()
  })

  it('calls upgrade and navigates back on plan select', async () => {
    mockStore({ currentSubscription: growthSub, plans: allPlans })
    const screen = await act(async () => render(<UpgradePlanScreen />))
    await act(async () => {
      // PRO plan uses planCode: plan-select-PRO
      fireEvent.press(screen.getByTestId('plan-select-PRO'))
    })
    expect(mockUpgrade).toHaveBeenCalledWith('3', 'MONTHLY')
    expect(mockAlertAlert).toHaveBeenCalled()
    expect(mockBack).toHaveBeenCalled()
  })
})
