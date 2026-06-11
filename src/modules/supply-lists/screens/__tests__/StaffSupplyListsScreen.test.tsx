/**
 * StaffSupplyListsScreen tests — loading, empty ("no lists assigned"), error+retry,
 * content (assigned lists), offline banner, and card→detail navigation. Read-only:
 * there are NO owner affordances (no +Add / create FAB) on this screen.
 */

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('../../store/supplyLists.store', () => ({ useSupplyListsStore: jest.fn() }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import StaffSupplyListsScreen from '../StaffSupplyListsScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { SupplyListListDto } from '../../../../types/supplyLists'

const { useSupplyListsStore } = jest.requireMock('../../store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchLists = jest.fn().mockResolvedValue(undefined)

const list: SupplyListListDto = {
  id: 'l1',
  name: 'Morning Milk',
  supplyType: 'milk',
  unit: 'ltr',
  defaultQuantity: 1,
  defaultRatePerUnit: 50,
  startTime: '06:00',
  frequency: 'DAILY',
  status: 'active',
  assignedStaff: [{ staffId: 's1', staffName: 'Raju', isPrimary: true }],
  customerCount: 12,
  todayStats: { date: '2026-06-11', delivered: 0, onLeave: 0, pending: 0, totalQuantity: 0 },
}

function mockStore(state: Record<string, unknown>) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      lists: [list],
      isListsLoading: false,
      listsError: null,
      fetchLists: mockFetchLists,
      ...state,
    }),
  )
}

describe('StaffSupplyListsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('shows the loading skeleton on first load', async () => {
    mockStore({ lists: [], isListsLoading: true })
    const screen = await render(<StaffSupplyListsScreen />)
    expect(screen.getByTestId('my-lists-skeleton')).toBeTruthy()
  })

  it('shows the empty state when no lists are assigned', async () => {
    mockStore({ lists: [] })
    const screen = await render(<StaffSupplyListsScreen />)
    expect(screen.getByText(t('supply.empty_my_lists'))).toBeTruthy()
  })

  it('shows the error state with retry when loading fails and no cache', async () => {
    mockStore({ lists: [], listsError: 'supply.error_not_found' })
    const screen = await render(<StaffSupplyListsScreen />)
    expect(screen.getByText(t('supply.error_not_found'))).toBeTruthy()
    fireEvent.press(screen.getByText(t('common.retry')))
    expect(mockFetchLists).toHaveBeenCalledWith('active', 1)
  })

  it('renders assigned lists and navigates to detail on tap', async () => {
    const screen = await render(<StaffSupplyListsScreen />)
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    fireEvent.press(screen.getByTestId('my-list-l1'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/supply-lists/l1')
  })

  it('shows the offline banner when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<StaffSupplyListsScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
  })
})
