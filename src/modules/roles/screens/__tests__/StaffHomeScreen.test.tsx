/**
 * StaffHomeScreen tests (US-002, WS-3).
 * Covers the 5 states: loading skeleton, empty (no lists assigned), error+retry,
 * content (assigned lists resolved to labels + financial-owner-only note), and
 * offline (cached role/lists + banner).
 *
 * Assertions use i18n keys + testIDs (locale-independent).
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('expo-router', () => {
  const ReactActual = require('react')
  return {
    // Mimic react-navigation focus: run the effect callback once on mount.
    useFocusEffect: (cb: () => void | (() => void)) => ReactActual.useEffect(cb, [cb]),
  }
})

jest.mock('../../hooks/useRole', () => ({ useRole: jest.fn() }))
jest.mock('../../store/roles.store', () => ({ useRolesStore: jest.fn() }))
jest.mock('@modules/auth/store/auth.store', () => ({ useAuthStore: jest.fn() }))

import React from 'react'
import { render } from '@testing-library/react-native'
import StaffHomeScreen from '../StaffHomeScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useRole } from '../../hooks/useRole'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type { RoleContextDto } from '../../../../types/roles'

const { useRolesStore } = jest.requireMock('../../store/roles.store') as { useRolesStore: jest.Mock }
const useRoleMock = useRole as jest.Mock
const useAuthStoreMock = useAuthStore as unknown as jest.Mock
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const fetchRole = jest.fn().mockResolvedValue(undefined)
const fetchSupplyListOptions = jest.fn().mockResolvedValue(undefined)

const STAFF_ROLE: RoleContextDto = {
  role: 'staff',
  vendorId: 'v1',
  staffId: 's1',
  permissions: ['mark_deliveries'],
}

function mockStore(state: Record<string, unknown>) {
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      assignedListIds: [],
      supplyListOptions: [],
      fetchRole,
      fetchSupplyListOptions,
      ...state,
    }),
  )
}

function mockRole(over: Partial<ReturnType<typeof useRole>>) {
  useRoleMock.mockReturnValue({
    roleContext: STAFF_ROLE,
    isOwner: false,
    isStaff: true,
    hasPermission: () => false,
    canAccessList: () => true,
    isLoading: false,
    error: null,
    ...over,
  })
}

describe('StaffHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    useAuthStoreMock.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ vendorContext: { vendorName: 'Sharma Dairy' } }),
    )
    mockStore({})
    mockRole({})
  })

  it('shows the loading skeleton while the role resolves with no cache', async () => {
    mockRole({ roleContext: null, isLoading: true })
    const screen = await render(<StaffHomeScreen />)
    expect(screen.getByTestId('staff-home-skeleton')).toBeTruthy()
  })

  it('shows the error state with retry when role fails and no cache', async () => {
    mockRole({ roleContext: null, error: 'roles.error_no_membership' })
    const screen = await render(<StaffHomeScreen />)
    expect(screen.getByText(t('roles.error_no_membership'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows the empty state (no lists assigned) with a contact-owner hint', async () => {
    mockStore({ assignedListIds: [], supplyListOptions: [] })
    const screen = await render(<StaffHomeScreen />)
    expect(screen.getByText(t('roles.no_lists_assigned'))).toBeTruthy()
    expect(screen.getByText(t('roles.contact_owner'))).toBeTruthy()
  })

  it('renders assigned lists resolved to labels and the financial-owner-only note', async () => {
    mockStore({
      assignedListIds: ['l1', 'l2'],
      supplyListOptions: [
        { listId: 'l1', name: 'Morning Milk' },
        { listId: 'l2', name: 'Evening Bread' },
      ],
    })
    const screen = await render(<StaffHomeScreen />)
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    expect(screen.getByText('Evening Bread')).toBeTruthy()
    expect(screen.getByTestId('staff-list-l1')).toBeTruthy()
    // Financial sections are owner-only — staff see the explanatory note instead.
    expect(screen.getByText(t('roles.financial_owner_only'))).toBeTruthy()
  })

  it('shows the offline banner over cached content', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({
      assignedListIds: ['l1'],
      supplyListOptions: [{ listId: 'l1', name: 'Morning Milk' }],
    })
    const screen = await render(<StaffHomeScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    expect(screen.getByText('Morning Milk')).toBeTruthy()
  })
})
