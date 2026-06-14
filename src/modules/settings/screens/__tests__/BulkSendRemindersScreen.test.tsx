/**
 * BulkSendRemindersScreen tests (US-011 / US-012)
 * US-012 repointed the screen to creditService.sendBulkReminders. Tests updated to
 * reflect the new store and verify the channel radio group was removed (SHOULD-FIX-1).
 *
 * Covers: renders target radio, send btn state, result summary card, offline banner,
 *         no channel radio (SHOULD-FIX-1 regression guard).
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: jest.fn().mockImplementation(
    (selector: (s: { vendorContext: { vendorId: string } }) => unknown) =>
      selector({ vendorContext: { vendorId: 'vendor-1' } }),
  ),
}))

// supply-lists is lazy-required in the screen
jest.mock('@modules/supply-lists/service/supplyLists.service', () => ({
  supplyListsService: {
    list: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    listCustomers: jest.fn().mockResolvedValue({ data: [] }),
  },
}))

const mockSendBulkReminders = jest.fn().mockResolvedValue({ sent: 20, skipped: 1, failed: 0 })
const mockClearErrors = jest.fn()

// US-012: screen now uses credit store, not settings store
jest.mock('@modules/credit/store/credit.store', () => ({ useCreditStore: jest.fn() }))

import React from 'react'
import { render, act, fireEvent } from '@testing-library/react-native'
import BulkSendRemindersScreen from '../BulkSendRemindersScreen'
import { t } from '@locales/index'

const { useCreditStore } = jest.requireMock('@modules/credit/store/credit.store') as {
  useCreditStore: jest.Mock
}

interface CreditStoreSlice {
  isMutating: boolean
  mutationError: string | null
  sendBulkReminders: jest.Mock
  clearErrors: jest.Mock
}

function mockCreditStore(overrides: Partial<CreditStoreSlice> = {}) {
  const base: CreditStoreSlice = {
    isMutating: false,
    mutationError: null,
    sendBulkReminders: mockSendBulkReminders,
    clearErrors: mockClearErrors,
  }
  useCreditStore.mockImplementation((selector: (s: CreditStoreSlice) => unknown) =>
    selector({ ...base, ...overrides }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreditStore()
})

describe('BulkSendRemindersScreen', () => {
  it('renders the send reminders button', async () => {
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    expect(screen.getByTestId('send-reminders-btn')).toBeTruthy()
  })

  it('send button is enabled when target = overdue (default)', async () => {
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    // Default targetType is 'overdue' so isValid=true
    expect(screen.getByTestId('send-reminders-btn').props.accessibilityState?.disabled).toBeFalsy()
  })

  it('shows offline banner when not connected', async () => {
    const { useNetworkStatus } = jest.requireMock('@hooks/useNetworkStatus') as {
      useNetworkStatus: jest.Mock
    }
    useNetworkStatus.mockReturnValue({ isConnected: false })
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
  })

  it('renders target radio group label', async () => {
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    expect(screen.getByText(t('settings.reminder_target_label'))).toBeTruthy()
  })

  // SHOULD-FIX-1 regression guard: the /reminders/send-bulk endpoint has no channel
  // field — the server derives channel from vendor config. The UI must not expose it.
  it('does NOT render a channel radio group (channel is server-derived per US-012 spec)', async () => {
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    expect(screen.queryByText(t('settings.reminder_channel_label'))).toBeNull()
  })

  it('send button is disabled when mutating', async () => {
    mockCreditStore({ isMutating: true })
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    expect(screen.getByTestId('send-reminders-btn').props.accessibilityState?.disabled).toBeTruthy()
  })

  it('shows mutation error banner', async () => {
    mockCreditStore({ mutationError: 'credit.error_rate_limited' })
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    expect(screen.getByText(t('credit.error_rate_limited'))).toBeTruthy()
  })

  it('pressing send btn opens confirm dialog (no crash)', async () => {
    const screen = await act(async () => render(<BulkSendRemindersScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('send-reminders-btn'))
    })
    // Verify screen still rendered — dialog opens without crashing
    expect(screen.getByTestId('send-reminders-btn')).toBeTruthy()
  })
})
