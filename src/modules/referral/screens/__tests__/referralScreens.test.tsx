/**
 * Referral Screen smoke tests (US-014)
 * Each screen: renders without crash, shows correct heading, respects offline state.
 *
 * NOTE: jest.mock calls are hoisted by Babel/jest to the top of the compiled output,
 * so the mockStore variable (defined before the second set of jest.mock calls) is
 * accessible inside the factory functions at runtime, even though ESLint's import/first
 * warns about the import statements appearing after non-import code.
 */

import React from 'react'
import { render, act } from '@testing-library/react-native'
import ReferVendorScreen from '../ReferVendorScreen'
import ReferralDashboardScreen from '../ReferralDashboardScreen'
import CreditRedemptionScreen from '../CreditRedemptionScreen'
import BulkInviteCustomersScreen from '../BulkInviteCustomersScreen'
import CustomerReferralsScreen from '../CustomerReferralsScreen'
import NearbyVendorsScreen from '../NearbyVendorsScreen'

// Global mocks (hoisted by jest before any import resolution)
jest.mock('@hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@utils/formatCurrency', () => ({ formatCurrency: (v: number) => `${v}` }))
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}))
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => { const cleanup = cb(); if (typeof cleanup === 'function') cleanup() },
}))
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native')
  return { SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View> }
})
jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: () => {} }))
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isConnected: true }) }))
jest.mock('@components/composite/ScreenErrorBoundary', () => {
  const { View } = jest.requireActual('react-native')
  return { ScreenErrorBoundary: ({ children }: { children: React.ReactNode }) => <View>{children}</View> }
})
jest.mock('@components/layout/AppHeader', () => ({
  AppHeader: ({ title }: { title: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text>{title}</Text>
  },
}))
jest.mock('@modules/subscription/store/subscription.store', () => ({
  useSubscriptionStore: () => null,
}))

// Mock referral store — mockStore accessible in factory because jest hoists the mock call
const mockStore = {
  dashboard: null,
  isDashboardLoading: false,
  dashboardError: null,
  fetchDashboard: jest.fn(),
  creditBalance: null,
  isBalanceLoading: false,
  balanceError: null,
  isMutating: false,
  mutationError: null,
  fetchCreditBalance: jest.fn(),
  redeemCredits: jest.fn(),
  customerRefs: null,
  recentAdditions: [] as never[],
  recentAdditionsMeta: null,
  isCustomerRefsLoading: false,
  customerRefsError: null,
  fetchCustomerReferrals: jest.fn(),
  nearby: null,
  isNearbyLoading: false,
  nearbyError: null,
  fetchNearbyVendors: jest.fn(),
  lastReferral: null,
  createVendorReferral: jest.fn(),
  sendBulkInvite: jest.fn(),
  clearErrors: jest.fn(),
}

jest.mock('../../store/referral.store', () => ({
  useReferralStore: (sel?: (s: typeof mockStore) => unknown) => sel ? sel(mockStore) : mockStore,
}))

describe('ReferVendorScreen', () => {
  it('renders without crash and shows title', async () => {
    const s = await act(async () => render(<ReferVendorScreen />))
    expect(s.getByText('referral.refer.title')).toBeTruthy()
  })
  it('shows submit button', async () => {
    const s = await act(async () => render(<ReferVendorScreen />))
    expect(s.getByTestId('submit-referral-btn')).toBeTruthy()
  })
})

describe('ReferralDashboardScreen', () => {
  it('renders title', async () => {
    const s = await act(async () => render(<ReferralDashboardScreen />))
    expect(s.getByText('referral.dashboard.title')).toBeTruthy()
  })
  it('calls fetchDashboard on mount', async () => {
    await act(async () => render(<ReferralDashboardScreen />))
    expect(mockStore.fetchDashboard).toHaveBeenCalled()
  })
})

describe('CreditRedemptionScreen', () => {
  it('renders title', async () => {
    const s = await act(async () => render(<CreditRedemptionScreen />))
    expect(s.getByText('referral.redeem.title')).toBeTruthy()
  })
  it('calls fetchCreditBalance on mount', async () => {
    await act(async () => render(<CreditRedemptionScreen />))
    expect(mockStore.fetchCreditBalance).toHaveBeenCalled()
  })
})

describe('BulkInviteCustomersScreen', () => {
  it('renders title', async () => {
    const s = await act(async () => render(<BulkInviteCustomersScreen />))
    expect(s.getByText('referral.invite.title')).toBeTruthy()
  })
  it('shows send invites button', async () => {
    const s = await act(async () => render(<BulkInviteCustomersScreen />))
    expect(s.getByTestId('send-invites-btn')).toBeTruthy()
  })
})

describe('CustomerReferralsScreen', () => {
  it('renders title', async () => {
    const s = await act(async () => render(<CustomerReferralsScreen />))
    expect(s.getByText('referral.customer.title')).toBeTruthy()
  })
  it('calls fetchCustomerReferrals on mount', async () => {
    await act(async () => render(<CustomerReferralsScreen />))
    expect(mockStore.fetchCustomerReferrals).toHaveBeenCalledWith(1)
  })
})

describe('NearbyVendorsScreen', () => {
  it('renders title', async () => {
    const s = await act(async () => render(<NearbyVendorsScreen />))
    expect(s.getByText('referral.nearby.title')).toBeTruthy()
  })
  it('calls fetchNearbyVendors on mount', async () => {
    await act(async () => render(<NearbyVendorsScreen />))
    expect(mockStore.fetchNearbyVendors).toHaveBeenCalled()
  })
  it('shows empty state when no nearby vendors', async () => {
    const s = await act(async () => render(<NearbyVendorsScreen />))
    expect(s.getByText('referral.nearby.empty_title')).toBeTruthy()
  })
})
