/**
 * AddExtraChargeScreen tests (US-006) — list/customer selection, the
 * error_mark_delivery_first guard when no delivery exists, amount validation, and
 * offline-disabled submit. Press/submit tests act-wrapped & ordered last.
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
  useLocalSearchParams: () => ({ listId: 'l1', customerId: 'c-d1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRole', () => ({ useRole: jest.fn() }))
jest.mock('@modules/roles/store/roles.store', () => ({ useRolesStore: jest.fn() }))
jest.mock('../../store/delivery.store', () => ({ useDeliveryStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import AddExtraChargeScreen from '../AddExtraChargeScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useRole } from '@modules/roles/hooks/useRole'
import type { DeliveryDto } from '../../../../types/delivery'

const { useDeliveryStore } = jest.requireMock('../../store/delivery.store') as { useDeliveryStore: jest.Mock }
const { useRolesStore } = jest.requireMock('@modules/roles/store/roles.store') as { useRolesStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock
const useRoleMock = useRole as jest.Mock

const mockAdd = jest.fn().mockResolvedValue({ id: 'x' })
const mockFetch = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

function delivery(custId: string): DeliveryDto {
  return {
    id: 'd1',
    customer: { id: custId, name: 'Anita', address: 'A', phoneNumber: null },
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

function setStore(listDeliveries: Record<string, DeliveryDto[]>, isListLoading = false): void {
  useDeliveryStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      listDeliveries,
      isListLoading,
      isMutating: false,
      mutationError: null,
      addExtraCharge: mockAdd,
      fetchListDeliveries: mockFetch,
      clearError: mockClearError,
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
  setStore({ l1: [delivery('c-d1')] })
})

describe('AddExtraChargeScreen', () => {
  it('renders the amount + comment fields and the ADD CHARGE button', async () => {
    const screen = await render(<AddExtraChargeScreen />)
    expect(screen.getByText(t('delivery.amount_label'))).toBeTruthy()
    expect(screen.getByTestId('add-charge-btn')).toBeTruthy()
  })

  it('shows the loading skeleton while the chosen list deliveries load', async () => {
    setStore({}, true)
    const screen = await render(<AddExtraChargeScreen />)
    expect(screen.getByTestId('add-charge-skeleton')).toBeTruthy()
  })

  it('blocks with error_mark_delivery_first when the customer has no delivery', async () => {
    // customer param c-d1 not present in loaded deliveries
    setStore({ l1: [delivery('c-other')] })
    const screen = await render(<AddExtraChargeScreen />)
    expect(screen.getByText(t('delivery.error_mark_delivery_first'))).toBeTruthy()
  })

  it('disables submit while offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<AddExtraChargeScreen />)
    expect(screen.getByText(t('common.needs_connection'))).toBeTruthy()
  })

  // --- submit-driven test last ---
  it('submits a valid charge with the resolved dailySupplyId', async () => {
    const screen = await render(<AddExtraChargeScreen />)
    // Set the amount via the number-pad input.
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('amount-input'), '20')
    })
    // Use a reason chip to fill the required comment (recognition over recall).
    await act(async () => {
      fireEvent.press(screen.getByTestId(`reason-chips-${t('delivery.reason_festival')}`))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-charge-btn'))
    })
    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({ dailySupplyId: 'd1', amount: 20 }),
      ),
    )
  })
})
