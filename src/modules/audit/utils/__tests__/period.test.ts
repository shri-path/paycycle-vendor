/**
 * Period util tests (US-007) — date-range derivation for the activity filter.
 * Uses a fixed system time so the assertions are deterministic.
 */

import { periodToDateRange, toDateString, PERIOD_KEYS } from '../period'

describe('toDateString', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 5, 3))).toBe('2026-06-03')
  })
})

describe('periodToDateRange', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Friday 2026-06-12 (getDay() === 5).
    jest.setSystemTime(new Date(2026, 5, 12, 10, 0, 0))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('today → same start and end', () => {
    expect(periodToDateRange('today')).toEqual({ startDate: '2026-06-12', endDate: '2026-06-12' })
  })

  it('yesterday → previous day for both', () => {
    expect(periodToDateRange('yesterday')).toEqual({
      startDate: '2026-06-11',
      endDate: '2026-06-11',
    })
  })

  it('this_week → Sunday of the current week through today', () => {
    // 2026-06-12 is a Friday → week start (Sunday) is 2026-06-07.
    expect(periodToDateRange('this_week')).toEqual({
      startDate: '2026-06-07',
      endDate: '2026-06-12',
    })
  })

  it('this_month → first of the month through today', () => {
    expect(periodToDateRange('this_month')).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-12',
    })
  })

  it('PERIOD_KEYS order matches the segmented control', () => {
    expect(PERIOD_KEYS).toEqual(['today', 'yesterday', 'this_week', 'this_month'])
  })
})
