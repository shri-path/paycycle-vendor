/**
 * SupplyListDetailScreen tests — loading skeleton, masked 404/not-found, content
 * (header + stub-zero "no data yet"), customer rows, owner overflow → assign/archive,
 * archive confirm, edit-subscription sheet (save/pause/remove confirm), status filter,
 * staff read-only gating, and offline-disabled writes. Async-submit tests are
 * act-wrapped and ordered last (testing-strategy "Async submit & act() hygiene").
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
  useLocalSearchParams: () => ({ listId: 'l1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('../../store/supplyLists.store', () => ({ useSupplyListsStore: jest.fn() }))
jest.mock('@modules/roles/store/roles.store', () => ({ useRolesStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import SupplyListDetailScreen from '../SupplyListDetailScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { SubscriptionDto, SupplyListDto } from '../../../../types/supplyLists'

const { useSupplyListsStore } = jest.requireMock('../../store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const { useRolesStore } = jest.requireMock('@modules/roles/store/roles.store') as {
  useRolesStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchDetail = jest.fn().mockResolvedValue(undefined)
const mockFetchCustomers = jest.fn().mockResolvedValue(undefined)
const mockAssignStaff = jest.fn().mockResolvedValue(undefined)
const mockUnassignStaff = jest.fn().mockResolvedValue(undefined)
const mockArchiveList = jest.fn().mockResolvedValue(undefined)
const mockUpdateSub = jest.fn().mockResolvedValue(undefined)
const mockEndSub = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()
const mockFetchStaffList = jest.fn().mockResolvedValue(undefined)

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
  assignedStaff: [{ staffId: 's1', staffName: 'Raju', isPrimary: true }],
  customerCount: 2,
  todayStats: { date: '2026-06-11', delivered: 0, onLeave: 0, pending: 0, totalQuantity: 0 },
  frequencyDays: [],
  monthStats: { month: '2026-06', daysCompleted: 0, totalQuantity: 0, revenue: 0 },
}

const subs: SubscriptionDto[] = [
  {
    subscriptionId: 'sub1',
    customerId: 'c1',
    customerName: 'Asha',
    phoneNumber: '+91 90000 00001',
    quantity: 1,
    ratePerUnit: 50,
    amount: 50,
    isCustomQuantity: false,
    isCustomRate: false,
    startDate: '2026-01-10',
    status: 'active',
    otherLists: [],
    otherListsCount: 0,
  },
]

const meta = { page: 1, limit: 50, total: 1, totalPages: 1 }

function mockSupply(state: Record<string, unknown>) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: { l1: detail },
      isDetailLoading: false,
      detailError: null,
      customers: { l1: subs },
      customersMeta: { l1: meta },
      isCustomersLoading: false,
      fetchDetail: mockFetchDetail,
      fetchCustomers: mockFetchCustomers,
      assignStaff: mockAssignStaff,
      unassignStaff: mockUnassignStaff,
      archiveList: mockArchiveList,
      updateSubscription: mockUpdateSub,
      endSubscription: mockEndSub,
      clearError: mockClearError,
      ...state,
    }),
  )
}

function mockRoles(role: 'owner' | 'staff') {
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      roleContext: { role, permissions: [] },
      assignedListIds: ['l1'],
      isRoleLoading: false,
      roleError: null,
      staffList: [
        { staffId: 's1', name: 'Raju', role: 'staff', status: 'ACTIVE' },
        { staffId: 's2', name: 'Suresh', role: 'staff', status: 'ACTIVE' },
      ],
      isStaffLoading: false,
      fetchStaffList: mockFetchStaffList,
    }),
  )
}

describe('SupplyListDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockSupply({})
    mockRoles('owner')
  })

  it('shows the loading skeleton when no cached detail yet', async () => {
    mockSupply({ detail: {}, isDetailLoading: true })
    const screen = await render(<SupplyListDetailScreen />)
    expect(screen.getByTestId('supply-detail-skeleton')).toBeTruthy()
  })

  it('masks a 404/missing detail as a not-found empty state', async () => {
    mockSupply({ detail: {}, isDetailLoading: false })
    const screen = await render(<SupplyListDetailScreen />)
    expect(screen.getByText(t('supply.error_not_found'))).toBeTruthy()
  })

  it('renders the header and stub-zero "no data yet" for today/month', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    expect(screen.getAllByText('Morning Milk').length).toBeGreaterThan(0)
    expect(screen.getByTestId('today-no-data')).toBeTruthy()
    expect(screen.getByTestId('month-no-data')).toBeTruthy()
  })

  it('renders customer rows', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    expect(screen.getByText('Asha')).toBeTruthy()
    expect(screen.getByTestId('customer-card-sub1')).toBeTruthy()
  })

  it('refetches customers when the status filter changes', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    mockFetchCustomers.mockClear()
    fireEvent.press(screen.getByText(t('supply.status_paused')))
    await waitFor(() =>
      expect(mockFetchCustomers).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({ status: 'paused', page: 1 }),
      ),
    )
  })

  it('opens the overflow sheet with assign + archive (owner)', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-overflow'))
    expect(await screen.findByTestId('overflow-assign-staff')).toBeTruthy()
    expect(screen.getByTestId('overflow-archive')).toBeTruthy()
  })

  it('opens the archive confirm dialog from the overflow sheet', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-overflow'))
    fireEvent.press(await screen.findByTestId('overflow-archive'))
    expect(await screen.findByText(t('supply.archive_confirm_title'))).toBeTruthy()
  })

  it('opens the edit-subscription sheet on customer tap (owner)', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('customer-card-sub1'))
    expect(await screen.findByTestId('edit-sub-save')).toBeTruthy()
  })

  it('hides owner affordances for staff (read-only)', async () => {
    mockRoles('staff')
    const screen = await render(<SupplyListDetailScreen />)
    expect(screen.queryByTestId('detail-overflow')).toBeNull()
    expect(screen.queryByTestId('detail-edit')).toBeNull()
    expect(screen.queryByTestId('add-customers')).toBeNull()
  })

  it('disables writes and shows the offline banner when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<SupplyListDetailScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    expect(screen.getByTestId('add-customers').props.accessibilityState.disabled).toBe(true)
  })

  it('navigates to edit on the header edit action (owner)', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-edit'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/supply-lists/l1/edit')
  })

  // Async-submit tests ordered last (act-wrapped settle).
  it('archives the list on confirm and navigates back', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-overflow'))
    fireEvent.press(await screen.findByTestId('overflow-archive'))
    await screen.findByText(t('supply.archive_confirm_title'))
    const archiveButtons = screen.getAllByText(t('supply.archive_list'))
    const confirm = archiveButtons[archiveButtons.length - 1]!
    await act(async () => {
      fireEvent.press(confirm)
    })
    await waitFor(() => expect(mockArchiveList).toHaveBeenCalledWith('l1'))
  })

  it('saves a subscription edit via updateSubscription', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('customer-card-sub1'))
    await screen.findByTestId('edit-sub-save')
    fireEvent.changeText(screen.getByTestId('edit-sub-qty'), '3')
    await waitFor(() =>
      expect(screen.getByTestId('edit-sub-qty').props.value).toBe('3'),
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-sub-save'))
    })
    await waitFor(() =>
      expect(mockUpdateSub).toHaveBeenCalledWith(
        'l1',
        'sub1',
        expect.objectContaining({ quantity: 3 }),
      ),
    )
  })

  it('removes a subscription after confirm', async () => {
    const screen = await render(<SupplyListDetailScreen />)
    fireEvent.press(screen.getByTestId('customer-card-sub1'))
    fireEvent.press(await screen.findByTestId('edit-sub-remove'))
    await screen.findByText(t('supply.remove_confirm_title'))
    const removeButtons = screen.getAllByText(t('supply.remove_customer'))
    const confirm = removeButtons[removeButtons.length - 1]!
    await act(async () => {
      fireEvent.press(confirm)
    })
    await waitFor(() => expect(mockEndSub).toHaveBeenCalledWith('l1', 'sub1'))
  })
})
