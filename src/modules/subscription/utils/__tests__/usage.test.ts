/**
 * Usage utility tests (US-009)
 * Pure functions — no mocks required.
 */

import { isUnlimited, usageColor, formatMoney, daysUntil } from '../usage'

// Mock colors token so the file can run without RN native setup.
jest.mock('@constants/tokens', () => ({
  colors: {
    error: '#F44336',
    warning: '#FF9800',
    success: '#4CAF50',
  },
}))

describe('isUnlimited', () => {
  it('returns true for 0 (unlimited sentinel)', () => {
    expect(isUnlimited(0)).toBe(true)
  })

  it('returns false for positive limits', () => {
    expect(isUnlimited(1)).toBe(false)
    expect(isUnlimited(150)).toBe(false)
    expect(isUnlimited(999)).toBe(false)
  })
})

describe('usageColor', () => {
  it('returns error color at 95%+', () => {
    expect(usageColor(95)).toBe('#F44336')
    expect(usageColor(100)).toBe('#F44336')
  })

  it('returns warning color between 80 and 94%', () => {
    expect(usageColor(80)).toBe('#FF9800')
    expect(usageColor(90)).toBe('#FF9800')
    expect(usageColor(94)).toBe('#FF9800')
  })

  it('returns success color below 80%', () => {
    expect(usageColor(0)).toBe('#4CAF50')
    expect(usageColor(50)).toBe('#4CAF50')
    expect(usageColor(79)).toBe('#4CAF50')
  })
})

describe('formatMoney', () => {
  it('prefixes amount with ₹', () => {
    expect(formatMoney(499)).toBe('₹499')
    expect(formatMoney(0)).toBe('₹0')
    expect(formatMoney(9990)).toBe('₹9990')
  })
})

describe('daysUntil', () => {
  it('returns 0 for past dates', () => {
    expect(daysUntil('2000-01-01')).toBe(0)
  })

  it('returns 0 for invalid date strings', () => {
    expect(daysUntil('not-a-date')).toBe(0)
  })

  it('returns whole days for a future date', () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const days = daysUntil(future)
    // Allow 2 or 3 depending on exact time-of-day execution
    expect(days).toBeGreaterThanOrEqual(2)
    expect(days).toBeLessThanOrEqual(3)
  })

  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    // Today's midnight is always ≤ now or very close; daysUntil may be 0 or 1
    // depending on how many hours remain. Just check it is in [0, 1].
    expect(daysUntil(today)).toBeGreaterThanOrEqual(0)
    expect(daysUntil(today)).toBeLessThanOrEqual(1)
  })
})
