/**
 * StaffActivityLogScreen tests (US-007) — 5 states, filters, export button gating,
 * and the conflicts / staff-summary nav links. Owner-only (useRequireOwner mocked
 * to a no-op). Store mocked via selector.
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({
  useRequireOwner: jest.fn(),
}))

jest.mock('../../store/audit.store', () => ({ useAuditStore: jest.fn() }))

import React from 'react'
import { render, act, fireEvent } from '@testing-library/react-native'
import StaffActivityLogScreen from '../StaffActivityLogScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { AuditLogDto, AuditPagination, AuditFilters } from '../../../../types/audit'

const { useAuditStore } = jest.requireMock('../../store/audit.store') as {
  useAuditStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchAuditLogs = jest.fn().mockResolvedValue(undefined)
const mockExportLogs = jest.fn().mockResolvedValue('shared')
const mockClearError = jest.fn()
const mockSetStaffFilter = jest.fn()
const mockSetActionFilter = jest.fn()
const mockSetDateRange = jest.fn()

function log(id: string): AuditLogDto {
  return {
    id,
    timestamp: '2026-06-12T06:15:00Z',
    actionType: 'delivery_marked',
    actionLabel: 'Delivery Marked',
    entityType: 'daily_supply',
    entityId: `ds-${id}`,
    user: { id: 's1', name: 'Raju', role: 'staff' },
    customer: { id: 'c1', name: 'Anil' },
    supplyList: { id: 'l1', name: 'Morning Milk' },
    details: { status: 'DELIVERED' },
    ipAddress: '1.2.3.4',
  }
}

const filters: AuditFilters = {
  availableStaff: [{ id: 's1', name: 'Raju' }],
  availableActionTypes: ['delivery_marked'],
}

const pagination: AuditPagination = { page: 1, limit: 50, total: 1, totalPages: 1 }

function mockStore(state: Record<string, unknown>) {
  useAuditStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      logs: [] as AuditLogDto[],
      pagination: null,
      filters,
      isLogsLoading: false,
      logsError: null,
      isExporting: false,
      filterStaffId: null,
      filterActionType: null,
      setStaffFilter: mockSetStaffFilter,
      setActionFilter: mockSetActionFilter,
      setDateRange: mockSetDateRange,
      fetchAuditLogs: mockFetchAuditLogs,
      exportLogs: mockExportLogs,
      clearError: mockClearError,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
  mockStore({})
})

describe('StaffActivityLogScreen', () => {
  it('fetches logs on mount', async () => {
    await act(async () => render(<StaffActivityLogScreen />))
    expect(mockFetchAuditLogs).toHaveBeenCalled()
  })

  it('shows the loading skeleton on first load', async () => {
    mockStore({ isLogsLoading: true, logs: [] })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    expect(screen.getByTestId('audit-log-skeleton')).toBeTruthy()
  })

  it('shows the error state with retry', async () => {
    mockStore({ logsError: 'audit.error_load_failed', logs: [] })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    expect(screen.getByText(t('audit.error_load_failed'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows the empty state when there are no logs', async () => {
    mockStore({ logs: [] })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    expect(screen.getByText(t('audit.no_activity'))).toBeTruthy()
  })

  it('renders the timeline + export button in the data state', async () => {
    mockStore({ logs: [log('1')], pagination })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    expect(screen.getByTestId('audit-row-1')).toBeTruthy()
    expect(screen.getByTestId('audit-export')).toBeTruthy()
  })

  it('disables export when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ logs: [log('1')], pagination })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    expect(screen.getByTestId('audit-export').props.accessibilityState?.disabled).toBe(true)
  })

  it('invokes exportLogs when the export button is pressed', async () => {
    mockStore({ logs: [log('1')], pagination })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('audit-export'))
    })
    expect(mockExportLogs).toHaveBeenCalled()
  })

  it('navigates to conflicts and staff-summary via the nav links', async () => {
    mockStore({ logs: [log('1')], pagination })
    const screen = await act(async () => render(<StaffActivityLogScreen />))
    fireEvent.press(screen.getByTestId('audit-nav-conflicts'))
    fireEvent.press(screen.getByTestId('audit-nav-summary'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/activity/conflicts')
    expect(mockPush).toHaveBeenCalledWith('/(app)/activity/staff-summary')
  })
})
