/**
 * EditSupplyListScreen tests — loading, not-found empty state, pre-population, the
 * price-override notice, partial PATCH (only changed fields), no-op back when
 * nothing changed, 409 duplicate-name banner, and the online-only submit.
 *
 * Assertions use i18n keys + testIDs (locale-independent). Async submit wrapped in
 * `await act(async …)` per @testing-library/react-native@14.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ listId: 'l1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

jest.mock('../../store/supplyLists.store', () => ({ useSupplyListsStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import EditSupplyListScreen from '../EditSupplyListScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { SupplyListDto } from '../../../../types/supplyLists'

const { useSupplyListsStore } = jest.requireMock('../../store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockUpdateList = jest.fn().mockResolvedValue(undefined)
const mockFetchDetail = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

function makeDetail(over: Partial<SupplyListDto> = {}): SupplyListDto {
  return {
    id: 'l1',
    name: 'Morning Milk',
    supplyType: 'milk',
    unit: 'ltr',
    defaultQuantity: 1,
    defaultRatePerUnit: 50,
    startTime: '06:30',
    frequency: 'DAILY',
    status: 'active',
    assignedStaff: [],
    customerCount: 10,
    todayStats: { date: '2026-06-11', delivered: 0, onLeave: 0, pending: 0, totalQuantity: 0 },
    frequencyDays: [],
    monthStats: { month: '2026-06', daysCompleted: 0, totalQuantity: 0, revenue: 0 },
    ...over,
  }
}

function mockStore(state: Record<string, unknown>) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: {},
      isDetailLoading: false,
      detailError: null,
      fetchDetail: mockFetchDetail,
      updateList: mockUpdateList,
      clearError: mockClearError,
      ...state,
    }),
  )
}

describe('EditSupplyListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('shows the loader while the detail is fetched', async () => {
    mockStore({ detail: {}, isDetailLoading: true })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    expect(screen.getByTestId('edit-loading')).toBeTruthy()
  })

  it('shows a not-found error state when the detail is missing', async () => {
    mockStore({ detail: {}, detailError: 'supply.error_not_found' })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    expect(screen.getByText(t('supply.error_not_found'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('pre-populates the form and shows the price-override notice', async () => {
    mockStore({ detail: { l1: makeDetail() } })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    expect(screen.getByTestId('edit-name').props.value).toBe('Morning Milk')
    expect(screen.getByText(t('supply.edit_price_notice'))).toBeTruthy()
  })

  it('PATCHes only the changed fields', async () => {
    mockStore({ detail: { l1: makeDetail() } })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('edit-rate'), '60')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(mockUpdateList).toHaveBeenCalledWith('l1', { defaultRatePerUnit: 60 })
    expect(mockBack).toHaveBeenCalled()
  })

  it('skips the API call and just goes back when nothing changed', async () => {
    mockStore({ detail: { l1: makeDetail() } })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(mockUpdateList).not.toHaveBeenCalled()
    expect(mockBack).toHaveBeenCalled()
  })

  it('shows the 409 duplicate-name error from the store as a banner', async () => {
    mockStore({ detail: { l1: makeDetail() }, detailError: 'supply.error_duplicate_name' })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    expect(screen.getByText(t('supply.error_duplicate_name'))).toBeTruthy()
  })

  it('disables submit offline and shows the offline banner', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ detail: { l1: makeDetail() } })
    const screen = await act(async () => render(<EditSupplyListScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('edit-rate'), '99')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(mockUpdateList).not.toHaveBeenCalled()
  })
})
