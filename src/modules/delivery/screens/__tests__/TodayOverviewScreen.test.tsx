/**
 * TodayOverviewScreen tests (US-006, owner) — 5 states + conflict banner + per-list
 * cards with revenue. Owner gate (useRequireOwner) is mocked to a no-op.
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))
jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))
jest.mock('../../store/delivery.store', () => ({ useDeliveryStore: jest.fn() }))

import React from 'react'
import { render } from '@testing-library/react-native'
import TodayOverviewScreen from '../TodayOverviewScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { TodayResultDto } from '../../../../types/delivery'

const { useDeliveryStore } = jest.requireMock('../../store/delivery.store') as { useDeliveryStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock
const mockFetch = jest.fn().mockResolvedValue(undefined)

const today: TodayResultDto = {
  date: '2026-06-12',
  summary: { totalDeliveries: 5, delivered: 1, onLeave: 1, pending: 3, autoMarked: 0, revenue: '250.00', conflicts: 1 },
  byList: [
    {
      listId: 'l1',
      listName: 'Milk',
      startTime: '06:00',
      staff: [{ staffId: 'u1', name: 'Ramesh' }],
      totalCustomers: 5,
      delivered: 1,
      onLeave: 1,
      pending: 3,
      revenue: '250.00',
    },
  ],
  conflicts: [{ deliveryId: 'd3', customerName: 'Chitra', listName: 'Milk', reason: 'on leave' }],
}

function setStore(state: Record<string, unknown>): void {
  useDeliveryStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ today, isTodayLoading: false, todayError: null, fetchToday: mockFetch, ...state }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
  setStore({})
})

describe('TodayOverviewScreen', () => {
  it('shows the loading skeleton with no cached today', async () => {
    setStore({ today: null, isTodayLoading: true })
    const screen = await render(<TodayOverviewScreen />)
    expect(screen.getByTestId('today-skeleton')).toBeTruthy()
  })

  it('shows the error state + retry with no cache', async () => {
    setStore({ today: null, todayError: 'delivery.error_load_failed' })
    const screen = await render(<TodayOverviewScreen />)
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('renders the per-list card and conflict banner (content)', async () => {
    const screen = await render(<TodayOverviewScreen />)
    expect(screen.getByTestId('today-list-l1')).toBeTruthy()
    expect(screen.getByTestId('conflict-banner')).toBeTruthy()
  })

  it('shows the empty state when no lists', async () => {
    setStore({ today: { ...today, byList: [], conflicts: [] } })
    const screen = await render(<TodayOverviewScreen />)
    expect(screen.getByText(t('delivery.empty_today'))).toBeTruthy()
  })

  it('shows the offline banner', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<TodayOverviewScreen />)
    expect(screen.getByText(t('common.offline_message'))).toBeTruthy()
  })
})
