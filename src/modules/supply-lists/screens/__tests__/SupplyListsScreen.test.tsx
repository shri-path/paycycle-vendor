/**
 * SupplyListsScreen tests — 5 states (loading skeleton, empty, error, content,
 * offline), the Active/Archived status filter, client-side search, card→detail
 * navigation, and the online-only +Add entry points (header + bottom).
 *
 * Assertions use i18n keys + testIDs (locale-independent).
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// Avoid expo-font async work from the vector-icon glyphs (per WS-0 note).
// SupplyTypeIcon (inside SupplyListCard) uses MaterialCommunityIcons; the screen
// itself uses Ionicons — both must be stubbed.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))
// RoleGate reads useRole — owner in these tests so owner controls render.
jest.mock('@modules/roles/hooks/useRole', () => ({
  useRole: () => ({ isOwner: true, hasPermission: () => true, canAccessList: () => true }),
}))

jest.mock('../../store/supplyLists.store', () => ({ useSupplyListsStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import SupplyListsScreen from '../SupplyListsScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { SupplyListListDto } from '../../../../types/supplyLists'

const { useSupplyListsStore } = jest.requireMock('../../store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchLists = jest.fn().mockResolvedValue(undefined)
const mockSetFilter = jest.fn()

function makeList(over: Partial<SupplyListListDto>): SupplyListListDto {
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
    ...over,
  }
}

function mockStore(state: Record<string, unknown>) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      lists: [],
      listStatusFilter: 'active',
      isListsLoading: false,
      listsError: null,
      setListStatusFilter: mockSetFilter,
      fetchLists: mockFetchLists,
      ...state,
    }),
  )
}

describe('SupplyListsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('shows the loading skeleton on first load', async () => {
    mockStore({ isListsLoading: true, lists: [] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    expect(screen.getByTestId('supply-lists-skeleton')).toBeTruthy()
  })

  it('shows the empty state with a create CTA', async () => {
    mockStore({ lists: [] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    expect(screen.getByText(t('supply.empty_lists'))).toBeTruthy()
    // "Create List" appears twice in the empty state: the empty-state action label
    // and the always-present bottom button (both are valid ≤2-tap entry points).
    expect(screen.getAllByText(t('supply.create_list')).length).toBeGreaterThanOrEqual(1)
  })

  it('shows an error state with retry when load fails and no cache', async () => {
    mockStore({ listsError: 'supply.error_not_found', lists: [] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    expect(screen.getByText(t('supply.error_not_found'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('renders cached lists with the active section count', async () => {
    mockStore({ lists: [makeList({ id: 'l1' }), makeList({ id: 'l2', name: 'Evening Bread' })] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    expect(screen.getByText(t('supply.active_lists', { count: 2 }))).toBeTruthy()
    expect(screen.getByTestId('supply-list-card-l1')).toBeTruthy()
  })

  it('navigates to detail when a card is tapped', async () => {
    mockStore({ lists: [makeList({ id: 'l9' })] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    fireEvent.press(screen.getByTestId('supply-list-card-l9'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/supply-lists/l9')
  })

  it('navigates to create from the header +Add', async () => {
    mockStore({ lists: [makeList({})] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    fireEvent.press(screen.getByTestId('supply-add-header'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/supply-lists/create')
  })

  it('switches the status filter to archived', async () => {
    mockStore({ lists: [makeList({})] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    // Segmented control: tap the "Archived" label (index 1).
    fireEvent.press(screen.getByText(t('supply.status_archived')))
    expect(mockSetFilter).toHaveBeenCalledWith('archived')
  })

  it('filters lists client-side by debounced search', async () => {
    mockStore({ lists: [makeList({ id: 'l1', name: 'Morning Milk' }), makeList({ id: 'l2', name: 'Evening Bread' })] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('supply-search'), 'bread')
    })
    await waitFor(() => {
      expect(screen.queryByTestId('supply-list-card-l1')).toBeNull()
      expect(screen.getByTestId('supply-list-card-l2')).toBeTruthy()
    })
  })

  it('disables the bottom create button offline and shows the offline banner', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ lists: [makeList({})] })
    const screen = await act(async () => render(<SupplyListsScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    fireEvent.press(screen.getByTestId('supply-create-bottom'))
    expect(mockPush).not.toHaveBeenCalledWith('/(app)/supply-lists/create')
  })
})
