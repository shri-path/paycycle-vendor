/**
 * CalendarScreen + DayDetailScreen tests (US-006, owner) — core states. Owner gate
 * (useRequireOwner) mocked to a no-op.
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))
let dayParam = '2026-06-12'
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ date: dayParam }),
}))
jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))
jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))
jest.mock('../../store/delivery.store', () => ({ useDeliveryStore: jest.fn() }))

import React from 'react'
import { render } from '@testing-library/react-native'
import CalendarScreen from '../CalendarScreen'
import DayDetailScreen from '../DayDetailScreen'
import { t } from '@locales/index'
import type { CalendarResultDto, DateDetailResultDto } from '../../../../types/delivery'

const { useDeliveryStore } = jest.requireMock('../../store/delivery.store') as { useDeliveryStore: jest.Mock }
const mockFetchCal = jest.fn().mockResolvedValue(undefined)
const mockFetchDay = jest.fn().mockResolvedValue(undefined)

const month = new Date().toISOString().slice(0, 7)
const calendar: Record<string, CalendarResultDto> = {
  [month]: {
    month,
    summary: { totalDeliveries: 12, totalLeaves: 1, revenue: '600.00' },
    days: { [`${month}-01`]: { status: 'completed', delivered: 5, leaves: 0, revenue: '250.00' } },
  },
}

const dayDetail: Record<string, DateDetailResultDto> = {
  '2026-06-12': {
    date: '2026-06-12',
    summary: { totalDeliveries: 5, leaves: 1, revenue: '250.00' },
    byList: [
      { listId: 'l1', listName: 'Milk', startTime: '06:00', staffName: 'Ramesh', delivered: 4, leaves: 1, revenue: '250.00' },
    ],
    extraCharges: [{ customerName: 'Anita', listName: 'Milk', amount: 20, reason: 'Extra milk' }],
    leaves: [{ customerName: 'Deepak', listName: 'Milk', markedBy: 'staff' }],
  },
}

function setCalStore(state: Record<string, unknown>): void {
  useDeliveryStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      calendar,
      isCalendarLoading: false,
      calendarError: null,
      fetchCalendar: mockFetchCal,
      // day-detail slice fields (read by DayDetailScreen):
      dayDetail,
      isDayLoading: false,
      dayError: null,
      fetchDayDetail: mockFetchDay,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  setCalStore({})
})

describe('CalendarScreen', () => {
  it('renders the month grid (content)', async () => {
    const screen = await render(<CalendarScreen />)
    expect(screen.getByTestId('calendar-grid')).toBeTruthy()
  })

  it('shows the empty state when the month has no days', async () => {
    setCalStore({ calendar: { [month]: { month, summary: { totalDeliveries: 0, totalLeaves: 0, revenue: '0' }, days: {} } } })
    const screen = await render(<CalendarScreen />)
    expect(screen.getByText(t('delivery.empty_calendar'))).toBeTruthy()
  })

  it('shows the error + retry with no cached month', async () => {
    setCalStore({ calendar: {}, calendarError: 'delivery.error_load_failed' })
    const screen = await render(<CalendarScreen />)
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })
})

describe('DayDetailScreen', () => {
  it('renders by-list, extra charges and leaves (content)', async () => {
    const screen = await render(<DayDetailScreen />)
    expect(screen.getByText(t('delivery.by_list'))).toBeTruthy()
    expect(screen.getByText(t('delivery.extra_charges_section'))).toBeTruthy()
    expect(screen.getByText(t('delivery.leaves_section'))).toBeTruthy()
  })

  it('shows the empty state when the day has no activity', async () => {
    setCalStore({
      dayDetail: {
        '2026-06-12': { date: '2026-06-12', summary: { totalDeliveries: 0, leaves: 0, revenue: '0' }, byList: [], extraCharges: [], leaves: [] },
      },
    })
    const screen = await render(<DayDetailScreen />)
    expect(screen.getByText(t('delivery.empty_day'))).toBeTruthy()
  })
})
