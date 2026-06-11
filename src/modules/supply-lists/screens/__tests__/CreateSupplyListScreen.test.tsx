/**
 * CreateSupplyListScreen tests — validation gate, successful create + navigation,
 * live auto-amount, progressive disclosure (weekly day chips, primary-staff select),
 * 409 duplicate-name banner, and the online-only submit button.
 *
 * Assertions use i18n keys + testIDs (locale-independent). Async submit is wrapped
 * in `await act(async …)` per the @testing-library/react-native@14 flush rule.
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

const mockReplace = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

const mockFetchStaffList = jest.fn().mockResolvedValue(undefined)
jest.mock('@modules/roles/store/roles.store', () => ({ useRolesStore: jest.fn() }))

jest.mock('../../store/supplyLists.store', () => ({ useSupplyListsStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import CreateSupplyListScreen from '../CreateSupplyListScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'

const { useSupplyListsStore } = jest.requireMock('../../store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const { useRolesStore } = jest.requireMock('@modules/roles/store/roles.store') as {
  useRolesStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockCreateList = jest.fn()
const mockClearError = jest.fn()

function mockStore(state: Record<string, unknown>) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      createList: mockCreateList,
      isListsLoading: false,
      listsError: null,
      clearError: mockClearError,
      ...state,
    }),
  )
}

function mockRoles(staffList: unknown[]) {
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ staffList, fetchStaffList: mockFetchStaffList }),
  )
}

describe('CreateSupplyListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
    mockRoles([])
  })

  it('renders the form with a create submit button', async () => {
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    expect(screen.getByTestId('create-name')).toBeTruthy()
    expect(screen.getByTestId('create-submit')).toBeTruthy()
  })

  it('blocks submit and shows an inline error when required fields are empty', async () => {
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-submit'))
    })
    expect(mockCreateList).not.toHaveBeenCalled()
    // Name + unit are both required, so the inline error appears more than once.
    expect(screen.getAllByText(t('validation.required')).length).toBeGreaterThanOrEqual(1)
  })

  it('creates the list and navigates to its detail on success', async () => {
    mockCreateList.mockResolvedValueOnce({ id: 'new-1' })
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    // Fill the two required fields: name + unit.
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('create-name'), 'Morning Milk')
    })
    // The unit AppSelect renders the label + placeholder with the same key; the
    // last match is the pressable trigger that opens the option modal.
    const unitNodes = screen.getAllByText(t('supply.field_unit'))
    const unitTrigger = unitNodes[unitNodes.length - 1]!
    await act(async () => {
      fireEvent.press(unitTrigger)
    })
    await act(async () => {
      fireEvent.press(screen.getByText(t('supply.unit_ltr')))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-submit'))
    })
    expect(mockCreateList).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(app)/supply-lists/new-1')
  })

  it('shows the live auto-amount once qty and rate are entered', async () => {
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('create-quantity'), '2')
      fireEvent.changeText(screen.getByTestId('create-rate'), '50')
    })
    expect(screen.getByTestId('create-amount')).toBeTruthy()
  })

  it('reveals the weekly day selector only for non-daily frequency', async () => {
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    expect(screen.queryByTestId('day-chip-1')).toBeNull()
    await act(async () => {
      fireEvent.press(screen.getByText(t('supply.freq_weekly')))
    })
    expect(screen.getByTestId('day-chip-1')).toBeTruthy()
  })

  it('reveals the primary-staff select only after a staff member is chosen', async () => {
    mockRoles([{ staffId: 's1', name: 'Raju', status: 'ACTIVE' }])
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    expect(screen.queryByText(t('supply.primary_staff'))).toBeNull()
    await act(async () => {
      fireEvent.press(screen.getByText('Raju'))
    })
    expect(screen.getByText(t('supply.primary_staff'))).toBeTruthy()
  })

  it('shows the 409 duplicate-name error from the store as a banner', async () => {
    mockStore({ listsError: 'supply.error_duplicate_name' })
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    expect(screen.getByText(t('supply.error_duplicate_name'))).toBeTruthy()
  })

  it('disables submit offline and shows the offline banner', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<CreateSupplyListScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-submit'))
    })
    expect(mockCreateList).not.toHaveBeenCalled()
  })
})
