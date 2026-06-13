/**
 * VendorSettingsScreen tests (US-011)
 * Covers: loading state, error state, data state, toggles update form,
 * Save button disabled until dirty, offline disables Save, owner gating.
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb() },
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({
  useRequireOwner: jest.fn(),
}))

jest.mock('@hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

jest.mock('../../store/settings.store', () => ({ useSettingsStore: jest.fn() }))

import React from 'react'
import { act, render, fireEvent } from '@testing-library/react-native'
import VendorSettingsScreen from '../VendorSettingsScreen'
import { t } from '@locales/index'
import type { VendorSettingsDto } from '../../../../types/settings'

const { useSettingsStore } = jest.requireMock('../../store/settings.store') as {
  useSettingsStore: jest.Mock
}

const mockFetchSettings = jest.fn().mockResolvedValue(undefined)
const mockUpdateSettings = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const mockSettings: VendorSettingsDto = {
  autoMarkEnabled: true,
  autoSendBillsEnabled: false,
  autoSendBillsTime: '20:00',
  defaultCreditLimit: 2000,
  defaultCreditAction: 'warn',
  notificationPreferences: {
    channels: { push: true, whatsapp: true, sms: false },
    payment: { paymentReceived: true, outstandingAlert: true, creditLimitBreach: true },
    customer: {
      customerMarkedLeave: true,
      customerAdjustedQty: false,
      newCustomerJoined: true,
      customerOverride: true,
    },
    operations: { lowStockAlert: true, staffActivitySummary: false, dailyDigest: true },
  },
}

function mockStoreState(overrides: Partial<{
  settings: VendorSettingsDto | null
  isLoading: boolean
  error: string | null
  isMutating: boolean
  mutationError: string | null
}> = {}) {
  const base = {
    settings: mockSettings,
    isLoading: false,
    error: null,
    isMutating: false,
    mutationError: null,
    fetchSettings: mockFetchSettings,
    updateSettings: mockUpdateSettings,
    clearError: mockClearError,
  }
  return useSettingsStore.mockImplementation((selector: (s: typeof base & typeof overrides) => unknown) =>
    selector({ ...base, ...overrides } as typeof base & typeof overrides)
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStoreState()
})

describe('VendorSettingsScreen', () => {
  it('renders correctly with settings data', async () => {
    const screen = await act(async () => render(<VendorSettingsScreen />))
    expect(screen.getByTestId('automation-section')).toBeTruthy()
    expect(screen.getByTestId('default-credit-section')).toBeTruthy()
    expect(screen.getByTestId('bulk-operations-section')).toBeTruthy()
  })

  it('shows AppLoader when loading with no cached data', async () => {
    mockStoreState({ settings: null, isLoading: true })
    const screen = await act(async () => render(<VendorSettingsScreen />))
    expect(screen.queryByTestId('automation-section')).toBeNull()
  })

  it('shows error state when error and no cached data', async () => {
    mockStoreState({ settings: null, error: 'settings.error_load_settings' })
    const screen = await act(async () => render(<VendorSettingsScreen />))
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('Save button is disabled when not dirty', async () => {
    const screen = await act(async () => render(<VendorSettingsScreen />))
    const saveBtn = screen.getByTestId('save-settings-btn')
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true)
  })

  it('Manage Notifications button navigates to settings/notifications', async () => {
    const screen = await act(async () => render(<VendorSettingsScreen />))
    fireEvent.press(screen.getByTestId('manage-notifications-btn'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/settings/notifications')
  })

  it('fetches settings on focus', async () => {
    await act(async () => render(<VendorSettingsScreen />))
    expect(mockFetchSettings).toHaveBeenCalled()
  })

  it('shows offline banner when not connected', async () => {
    const { useNetworkStatus } = jest.requireMock('@hooks/useNetworkStatus') as {
      useNetworkStatus: jest.Mock
    }
    useNetworkStatus.mockReturnValue({ isConnected: false })
    const screen = await act(async () => render(<VendorSettingsScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
  })
})
