/**
 * MyActivityScreen tests (US-007) — 4 states (loading, error, empty, data) + the
 * today/week/month stat tiles. Self-scoped: no owner guard. Store is mocked via a
 * selector function (same pattern as the customers screen tests).
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useFocusEffect: (cb: () => void) => cb(),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('../../store/audit.store', () => ({ useAuditStore: jest.fn() }))

import React from 'react'
import { render, act } from '@testing-library/react-native'
import MyActivityScreen from '../MyActivityScreen'
import { t } from '@locales/index'
import type { MyActivityEntryDto, MyActivitySummary } from '../../../../types/audit'

const { useAuditStore } = jest.requireMock('../../store/audit.store') as {
  useAuditStore: jest.Mock
}

const mockFetchMyActivity = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

function entry(id: string): MyActivityEntryDto {
  return {
    id,
    timestamp: '2026-06-12T06:15:00Z',
    actionType: 'delivery_marked',
    actionLabel: 'Delivery Marked',
    customer: { id: 'c1', name: 'Anil' },
    supplyList: { id: 'l1', name: 'Morning Milk' },
    details: { status: 'DELIVERED' },
  }
}

function mockStore(state: Record<string, unknown>) {
  useAuditStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      myActivity: [] as MyActivityEntryDto[],
      myActivitySummary: null as MyActivitySummary | null,
      isMyActivityLoading: false,
      myActivityError: null,
      fetchMyActivity: mockFetchMyActivity,
      clearError: mockClearError,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStore({})
})

describe('MyActivityScreen', () => {
  it('fetches activity on mount (focus)', async () => {
    await act(async () => render(<MyActivityScreen />))
    expect(mockFetchMyActivity).toHaveBeenCalled()
  })

  it('shows the loading skeleton on first load', async () => {
    mockStore({ isMyActivityLoading: true, myActivity: [], myActivitySummary: null })
    const screen = await act(async () => render(<MyActivityScreen />))
    expect(screen.getByTestId('my-activity-skeleton')).toBeTruthy()
  })

  it('shows the error state with retry', async () => {
    mockStore({ myActivityError: 'audit.error_load_failed', myActivity: [] })
    const screen = await act(async () => render(<MyActivityScreen />))
    expect(screen.getByText(t('audit.error_load_failed'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows the empty state', async () => {
    mockStore({ myActivity: [] })
    const screen = await act(async () => render(<MyActivityScreen />))
    expect(screen.getByText(t('audit.no_my_activity'))).toBeTruthy()
  })

  it('renders the stat tiles and activity rows in the data state', async () => {
    mockStore({
      myActivity: [entry('a1'), entry('a2')],
      myActivitySummary: { todayActions: 12, thisWeekActions: 64, thisMonthActions: 220 },
    })
    const screen = await act(async () => render(<MyActivityScreen />))
    expect(screen.getByTestId('my-stat-today')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('64')).toBeTruthy()
    expect(screen.getByTestId('my-activity-a1')).toBeTruthy()
  })
})
