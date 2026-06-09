/**
 * StaffDetailScreen tests — loading, 404 (no record), content, permission
 * toggle+save, assign sheet, unassign confirm, disable confirm, remove confirm,
 * and offline-disabled mutations. Mutation-success tests act-wrapped + last.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => {
  const ReactActual = require('react')
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
    useLocalSearchParams: () => ({ staffId: 's1' }),
    // Mimic react-navigation focus: run the effect callback once on mount.
    useFocusEffect: (cb: () => void | (() => void)) => ReactActual.useEffect(cb, [cb]),
  }
})

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('../../hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

jest.mock('../../store/roles.store', () => ({ useRolesStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import StaffDetailScreen from '../StaffDetailScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { StaffResponseDto } from '../../../../types/roles'

const { useRolesStore } = jest.requireMock('../../store/roles.store') as { useRolesStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchDetail = jest.fn().mockResolvedValue(undefined)
const mockFetchRole = jest.fn().mockResolvedValue(undefined)
const mockUpdate = jest.fn().mockResolvedValue(undefined)
const mockRemove = jest.fn().mockResolvedValue(undefined)
const mockAssign = jest.fn().mockResolvedValue(undefined)
const mockUnassign = jest.fn().mockResolvedValue(undefined)
const mockFetchOptions = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const staff: StaffResponseDto = {
  staffId: 's1',
  userId: 'u1',
  name: 'Raju',
  phone: '+91 98765 43210',
  role: 'staff',
  status: 'ACTIVE',
  areaRouteLabel: 'Sector 15',
  permissions: ['mark_deliveries'],
  assignedListCount: 1,
  assignedListIds: ['l1'],
  todayStats: null,
  invitedAt: null,
  joinedAt: '2026-01-15',
  createdAt: '2026-01-15',
  updatedAt: '2026-01-15',
}

function mockStore(state: Record<string, unknown>) {
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      staffDetail: { s1: staff },
      isStaffLoading: false,
      staffError: null,
      fetchRole: mockFetchRole,
      fetchStaffDetail: mockFetchDetail,
      updateStaff: mockUpdate,
      removeStaff: mockRemove,
      assignLists: mockAssign,
      unassignList: mockUnassign,
      supplyListOptions: [{ listId: 'l1', name: 'Morning Milk' }, { listId: 'l2', name: 'Morning Bread' }],
      isSupplyListsLoading: false,
      fetchSupplyListOptions: mockFetchOptions,
      clearStaffError: mockClearError,
      ...state,
    }),
  )
}

describe('StaffDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('shows the loading skeleton when no cached record yet', async () => {
    mockStore({ staffDetail: {}, isStaffLoading: true })
    const screen = await render(<StaffDetailScreen />)
    expect(screen.getByTestId('staff-detail-skeleton')).toBeTruthy()
  })

  it('shows the not-found state when the record is missing', async () => {
    mockStore({ staffDetail: {}, isStaffLoading: false })
    const screen = await render(<StaffDetailScreen />)
    expect(screen.getByText(t('roles.error_staff_not_found'))).toBeTruthy()
  })

  it('renders the profile, assigned list name, and management actions', async () => {
    const screen = await render(<StaffDetailScreen />)
    expect(screen.getByText('Raju')).toBeTruthy()
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    expect(screen.getByTestId('detail-remove')).toBeTruthy()
    expect(screen.getByTestId('detail-toggle-status')).toBeTruthy()
  })

  it('opens a confirm dialog before removing', async () => {
    const screen = await render(<StaffDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-remove'))
    expect(await screen.findByText(t('roles.remove_confirm_title'))).toBeTruthy()
  })

  it('opens a confirm dialog before disabling', async () => {
    const screen = await render(<StaffDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-toggle-status'))
    expect(await screen.findByText(t('roles.disable_confirm_title'))).toBeTruthy()
  })

  it('opens a confirm dialog before unassigning a list', async () => {
    const screen = await render(<StaffDetailScreen />)
    fireEvent.press(screen.getByTestId('unassign-l1'))
    expect(await screen.findByText(t('roles.unassign_confirm_title'))).toBeTruthy()
  })

  it('disables mutations and shows the offline banner when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<StaffDetailScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    // The remove button is disabled offline; tapping it does not open the dialog
    // and confirming is unreachable, so no mutation fires.
    fireEvent.press(screen.getByTestId('detail-remove'))
    expect(mockRemove).not.toHaveBeenCalled()
  })

  // NOTE: mutation-success tests are ordered LAST and each fully settles its async
  // submit inside an act() scope (testing-strategy "Async submit & act() hygiene").
  // A leaked async submit would commit a null tree into the NEXT test's render.
  it('assigns lists from the bottom sheet', async () => {
    const screen = await render(<StaffDetailScreen />)
    fireEvent.press(screen.getByTestId('assign-another'))
    // The multi-select rows live in the sheet Modal — wait for it to mount.
    const l2Row = await screen.findByTestId('assign-sheet-lists-l2')
    fireEvent.press(l2Row)
    // Wait for the selection re-render to flush before saving (otherwise the save
    // closure reads the pre-toggle pendingAssign).
    await waitFor(() =>
      expect(screen.getByTestId('assign-sheet-lists-l2').props.accessibilityState.checked).toBe(true),
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('assign-sheet-save'))
    })
    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith('s1', ['l1', 'l2'])
    })
  })

  it('saves permissions via updateStaff', async () => {
    const screen = await render(<StaffDetailScreen />)
    // Toggle mark_leaves on, waiting for the local-state re-render to flush before save.
    fireEvent.press(screen.getByTestId('detail-perms-mark_leaves'))
    await waitFor(() =>
      expect(screen.getByTestId('detail-perms-mark_leaves').props.accessibilityState.checked).toBe(true),
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-save-perms'))
    })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('s1', {
        permissions: ['mark_deliveries', 'mark_leaves'],
      })
    })
  })

  // Ordered ABSOLUTELY LAST — confirm-remove navigates back on success; any async
  // teardown it leaves open cannot corrupt a later render because none follows.
  it('confirms removal and calls removeStaff', async () => {
    const screen = await render(<StaffDetailScreen />)
    fireEvent.press(screen.getByTestId('detail-remove'))
    // "Remove Staff" labels both the screen button and the dialog confirm button;
    // wait for the dialog to mount, then press the confirm (last) instance.
    await screen.findByText(t('roles.remove_confirm_title'))
    const removeButtons = screen.getAllByText(t('roles.remove_staff'))
    const confirmButton = removeButtons[removeButtons.length - 1]!
    await act(async () => {
      fireEvent.press(confirmButton)
    })
    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith('s1')
    })
  })
})
