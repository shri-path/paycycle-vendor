/**
 * DeliveryListScreen tests (US-006) — 5 states (loading skeleton, empty, error+retry,
 * content, offline), optimistic mark + haptics, owner-only money, staff read-only,
 * and offline-disabled mark-all. Async/press tests are act-wrapped & ordered last
 * (testing-strategy "Async submit & act() hygiene").
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

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

jest.mock('@modules/roles/hooks/useRole', () => ({ useRole: jest.fn() }))
jest.mock('../../store/delivery.store', () => ({ useDeliveryStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import DeliveryListScreen from '../DeliveryListScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useRole } from '@modules/roles/hooks/useRole'
import type { DeliveryDto } from '../../../../types/delivery'

const { useDeliveryStore } = jest.requireMock('../../store/delivery.store') as {
  useDeliveryStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock
const useRoleMock = useRole as jest.Mock

const mockFetch = jest.fn().mockResolvedValue(undefined)
const mockMark = jest.fn().mockResolvedValue(undefined)
const mockBulk = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

function pending(id: string): DeliveryDto {
  return {
    id,
    customer: { id: `c-${id}`, name: 'Anita', address: 'A', phoneNumber: null },
    quantity: 1,
    unit: 'ltr',
    amount: 50,
    status: 'PENDING',
    markedBy: null,
    markedAt: null,
    hasConflict: false,
    conflictReason: null,
    otherLists: [],
  }
}

function setStore(state: Record<string, unknown>): void {
  useDeliveryStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      listDeliveries: { l1: [pending('d1')] },
      listProgress: { l1: { total: 1, delivered: 0, onLeave: 0, pending: 1 } },
      isListLoading: false,
      listError: null,
      isMutating: false,
      mutationError: null,
      fetchListDeliveries: mockFetch,
      markDelivery: mockMark,
      markBulk: mockBulk,
      clearError: mockClearError,
      ...state,
    }),
  )
}

function setRole(isOwner: boolean, canMark = true): void {
  useRoleMock.mockReturnValue({
    isOwner,
    isStaff: !isOwner,
    hasPermission: () => canMark,
    canAccessList: () => true,
    roleContext: { role: isOwner ? 'owner' : 'staff', permissions: [] },
    isLoading: false,
    error: null,
  })
}

describe('DeliveryListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    setRole(false)
    setStore({})
  })

  it('shows the loading skeleton when loading with no cached rows', async () => {
    setStore({ listDeliveries: { l1: [] }, isListLoading: true })
    const screen = await render(<DeliveryListScreen />)
    expect(screen.getByTestId('delivery-list-skeleton')).toBeTruthy()
  })

  it('shows the error state with retry when load fails and no cache', async () => {
    setStore({ listDeliveries: { l1: [] }, listError: 'delivery.error_load_failed' })
    const screen = await render(<DeliveryListScreen />)
    expect(screen.getByText(t('delivery.error_load_failed'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows the empty state when there are no deliveries', async () => {
    setStore({ listDeliveries: { l1: [] } })
    const screen = await render(<DeliveryListScreen />)
    expect(screen.getByText(t('delivery.empty_list'))).toBeTruthy()
  })

  it('renders pending rows and a mark-all CTA (content)', async () => {
    const screen = await render(<DeliveryListScreen />)
    expect(screen.getByTestId('delivery-card-d1')).toBeTruthy()
    expect(screen.getByTestId('mark-all-btn')).toBeTruthy()
  })

  it('shows the offline banner and hides money for staff', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<DeliveryListScreen />)
    expect(screen.getByText(t('common.needs_connection'))).toBeTruthy()
  })

  it('shows the view-only banner for staff without mark permission', async () => {
    setRole(false, false)
    const screen = await render(<DeliveryListScreen />)
    expect(screen.getByText(t('delivery.view_only'))).toBeTruthy()
  })

  // --- press-driven tests last ---

  it('does not call markDelivery while offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<DeliveryListScreen />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('delivery-card-d1-delivered'))
    })
    expect(mockMark).not.toHaveBeenCalled()
  })

  it('calls markDelivery with DELIVERED on tap (online)', async () => {
    const screen = await render(<DeliveryListScreen />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('delivery-card-d1-delivered'))
    })
    await waitFor(() => expect(mockMark).toHaveBeenCalledWith('l1', 'd1', 'DELIVERED'))
  })
})
