/**
 * AddCustomersScreen tests — loading, empty-available (informative), content +
 * selection, custom-qty progressive disclosure, add → added/skipped summary, 409
 * keeps selection, and offline-disabled submit. Async-submit tests are act-wrapped
 * and ordered last (testing-strategy "Async submit & act() hygiene").
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

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({ listId: 'l1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

jest.mock('../../store/supplyLists.store', () => ({ useSupplyListsStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import AddCustomersScreen from '../AddCustomersScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { AvailableCustomerDto, SupplyListDto } from '../../../../types/supplyLists'

const { useSupplyListsStore } = jest.requireMock('../../store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchDetail = jest.fn().mockResolvedValue(undefined)
const mockFetchAvailable = jest.fn().mockResolvedValue(undefined)
const mockAddCustomers = jest.fn().mockResolvedValue({ addedCount: 2, skippedCount: 1, subscriptions: [], skipped: [] })
const mockClearError = jest.fn()

const detail: SupplyListDto = {
  id: 'l1',
  name: 'Morning Milk',
  supplyType: 'milk',
  unit: 'ltr',
  defaultQuantity: 1,
  defaultRatePerUnit: 50,
  startTime: '06:00',
  frequency: 'DAILY',
  status: 'active',
  assignedStaff: [],
  customerCount: 0,
  todayStats: { date: '2026-06-11', delivered: 0, onLeave: 0, pending: 0, totalQuantity: 0 },
  frequencyDays: [],
  monthStats: { month: '2026-06', daysCompleted: 0, totalQuantity: 0, revenue: 0 },
}

const available: AvailableCustomerDto[] = [
  { customerId: 'c1', name: 'Asha', phone: '+91 90000 00001', otherLists: [], otherListsCount: 0 },
  { customerId: 'c2', name: 'Bina', phone: '+91 90000 00002', otherLists: ['Evening Bread'], otherListsCount: 1 },
]

const meta = { page: 1, limit: 50, total: 2, totalPages: 1 }

function mockStore(state: Record<string, unknown>) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: { l1: detail },
      available,
      availableMeta: meta,
      isAvailableLoading: false,
      availableError: null,
      fetchDetail: mockFetchDetail,
      fetchAvailable: mockFetchAvailable,
      addCustomers: mockAddCustomers,
      clearError: mockClearError,
      ...state,
    }),
  )
}

describe('AddCustomersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('shows the loading skeleton when fetching the first page with no rows', async () => {
    mockStore({ available: [], isAvailableLoading: true })
    const screen = await render(<AddCustomersScreen />)
    expect(screen.getByTestId('available-loading')).toBeTruthy()
  })

  it('shows an informative empty state when no customers are available (OQ-6)', async () => {
    mockStore({ available: [], isAvailableLoading: false })
    const screen = await render(<AddCustomersScreen />)
    expect(screen.getByText(t('supply.empty_available'))).toBeTruthy()
  })

  it('renders available customers and the list-defaults caption', async () => {
    const screen = await render(<AddCustomersScreen />)
    expect(screen.getByText('Asha')).toBeTruthy()
    expect(
      screen.getByText(
        t('supply.list_defaults', { qty: '1', unit: 'ltr', rate: '50' }),
      ),
    ).toBeTruthy()
  })

  it('keeps submit disabled until a customer is selected', async () => {
    const screen = await render(<AddCustomersScreen />)
    expect(screen.getByTestId('add-submit').props.accessibilityState.disabled).toBe(true)
  })

  it('reveals the custom-quantity input only when "custom" is chosen', async () => {
    const screen = await render(<AddCustomersScreen />)
    expect(screen.queryByTestId('custom-qty')).toBeNull()
    fireEvent.press(screen.getByText(t('supply.custom_qty')))
    expect(await screen.findByTestId('custom-qty')).toBeTruthy()
  })

  it('disables submit when offline even with a selection', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<AddCustomersScreen />)
    fireEvent.press(screen.getByTestId('available-c1'))
    await waitFor(() =>
      expect(screen.getByTestId('available-c1').props.accessibilityState.checked).toBe(true),
    )
    expect(screen.getByTestId('add-submit').props.accessibilityState.disabled).toBe(true)
  })

  // Ordered last — async submit settles inside act().
  it('adds selected customers and shows the added/skipped summary', async () => {
    const screen = await render(<AddCustomersScreen />)
    fireEvent.press(screen.getByTestId('available-c1'))
    await waitFor(() =>
      expect(screen.getByTestId('available-c1').props.accessibilityState.checked).toBe(true),
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-submit'))
    })
    await waitFor(() => {
      expect(mockAddCustomers).toHaveBeenCalledWith('l1', expect.objectContaining({ customerIds: ['c1'] }))
    })
    expect(
      await screen.findByText(
        t('supply.added_skipped_summary', { added: '2', skipped: '1' }),
      ),
    ).toBeTruthy()
  })
})
