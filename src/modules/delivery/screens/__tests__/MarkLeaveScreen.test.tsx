/**
 * MarkLeaveScreen tests (US-006) — empty state (no customers), content (customer +
 * list selection), offline-disabled submit. Submit test act-wrapped & ordered last.
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
}))
jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))
jest.mock('@modules/roles/hooks/useRole', () => ({ useRole: jest.fn() }))
jest.mock('@modules/roles/store/roles.store', () => ({ useRolesStore: jest.fn() }))
jest.mock('../../store/delivery.store', () => ({ useDeliveryStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import MarkLeaveScreen from '../MarkLeaveScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useRole } from '@modules/roles/hooks/useRole'
import type { DeliveryDto } from '../../../../types/delivery'

const { useDeliveryStore } = jest.requireMock('../../store/delivery.store') as { useDeliveryStore: jest.Mock }
const { useRolesStore } = jest.requireMock('@modules/roles/store/roles.store') as { useRolesStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock
const useRoleMock = useRole as jest.Mock
const mockCreate = jest.fn().mockResolvedValue(undefined)

function delivery(): DeliveryDto {
  return {
    id: 'd1',
    customer: { id: 'c1', name: 'Anita', address: 'A', phoneNumber: null },
    quantity: 1, unit: 'ltr', status: 'PENDING', markedBy: null, markedAt: null,
    hasConflict: false, conflictReason: null, otherLists: [],
  }
}

function setStore(listDeliveries: Record<string, DeliveryDto[]>): void {
  useDeliveryStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      listDeliveries,
      isMutating: false,
      mutationError: null,
      createLeave: mockCreate,
      fetchListDeliveries: jest.fn().mockResolvedValue(undefined),
      clearError: jest.fn(),
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
  useRoleMock.mockReturnValue({ isOwner: true, hasPermission: () => true })
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ supplyListOptions: [{ listId: 'l1', name: 'Milk' }] }),
  )
  setStore({ l1: [delivery()] })
})

describe('MarkLeaveScreen', () => {
  it('shows the empty state when there are no customers', async () => {
    setStore({ l1: [] })
    const screen = await render(<MarkLeaveScreen />)
    expect(screen.getByText(t('delivery.empty_customers'))).toBeTruthy()
  })

  it('renders the customer selector (content)', async () => {
    const screen = await render(<MarkLeaveScreen />)
    expect(screen.getByText(t('delivery.select_customer'))).toBeTruthy()
  })

  it('disables submit when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<MarkLeaveScreen />)
    expect(screen.getByText(t('common.needs_connection'))).toBeTruthy()
  })

  // --- submit-driven test last ---
  it('creates a leave for the selected customer + pre-checked list', async () => {
    const screen = await render(<MarkLeaveScreen />)
    await act(async () => {
      fireEvent.press(screen.getByText('Anita'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-leave-btn'))
    })
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'c1', supplyListIds: ['l1'] }),
      ),
    )
  })
})
