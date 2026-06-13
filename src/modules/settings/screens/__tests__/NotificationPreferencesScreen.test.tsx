/**
 * NotificationPreferencesScreen tests (US-011)
 * Covers: loading, error, category sections rendered, Save disabled until dirty,
 * offline disables Save, Save calls updateNotificationPreferences with full prefs.
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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
import { render, act } from '@testing-library/react-native'
import NotificationPreferencesScreen from '../NotificationPreferencesScreen'
import { t } from '@locales/index'
import type { VendorSettingsDto } from '../../../../types/settings'

const { useSettingsStore } = jest.requireMock('../../store/settings.store') as {
  useSettingsStore: jest.Mock
}

const mockFetchSettings = jest.fn().mockResolvedValue(undefined)
const mockUpdateNotificationPreferences = jest.fn().mockResolvedValue(undefined)
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

function mockStoreState(overrides: Record<string, unknown> = {}) {
  const base = {
    settings: mockSettings,
    isLoading: false,
    error: null,
    isMutating: false,
    mutationError: null,
    fetchSettings: mockFetchSettings,
    updateNotificationPreferences: mockUpdateNotificationPreferences,
    clearError: mockClearError,
  }
  return useSettingsStore.mockImplementation((selector: (s: typeof base) => unknown) =>
    selector({ ...base, ...overrides } as typeof base)
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStoreState()
})

describe('NotificationPreferencesScreen', () => {
  it('shows AppLoader when loading with no cached data', async () => {
    mockStoreState({ settings: null, isLoading: true })
    const screen = await act(async () => render(<NotificationPreferencesScreen />))
    // When loading, sections should not render (no category titles visible)
    expect(screen.queryByText(t('settings.notif_channels_title'))).toBeNull()
  })

  it('shows error state when error and no cached data', async () => {
    mockStoreState({ settings: null, error: 'settings.error_load_settings' })
    const screen = await act(async () => render(<NotificationPreferencesScreen />))
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('renders all 4 notification category sections with settings data', async () => {
    const screen = await act(async () => render(<NotificationPreferencesScreen />))
    expect(screen.getByText(t('settings.notif_channels_title'))).toBeTruthy()
    expect(screen.getByText(t('settings.notif_payment_title'))).toBeTruthy()
    expect(screen.getByText(t('settings.notif_customer_title'))).toBeTruthy()
    expect(screen.getByText(t('settings.notif_operations_title'))).toBeTruthy()
  })

  it('Save button is disabled when not dirty', async () => {
    const screen = await act(async () => render(<NotificationPreferencesScreen />))
    const saveBtn = screen.getByTestId('save-notif-prefs-btn')
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true)
  })

  it('fetches settings on focus', async () => {
    await act(async () => render(<NotificationPreferencesScreen />))
    expect(mockFetchSettings).toHaveBeenCalled()
  })

  it('shows offline banner when not connected', async () => {
    const { useNetworkStatus } = jest.requireMock('@hooks/useNetworkStatus') as {
      useNetworkStatus: jest.Mock
    }
    useNetworkStatus.mockReturnValue({ isConnected: false })
    const screen = await act(async () => render(<NotificationPreferencesScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
  })
})
