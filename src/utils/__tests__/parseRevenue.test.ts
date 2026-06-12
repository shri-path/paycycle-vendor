/** parseRevenue tests (US-006) — NaN-guarded Decimal-string → number. */
import { parseRevenue } from '../parseRevenue'

describe('parseRevenue', () => {
  it('parses a Decimal string to a number', () => {
    expect(parseRevenue('250.00')).toBe(250)
    expect(parseRevenue('1234.5')).toBe(1234.5)
  })

  it('passes through finite numbers', () => {
    expect(parseRevenue(99)).toBe(99)
  })

  it('returns 0 for null/undefined/empty', () => {
    expect(parseRevenue(null)).toBe(0)
    expect(parseRevenue(undefined)).toBe(0)
    expect(parseRevenue('')).toBe(0)
    expect(parseRevenue('   ')).toBe(0)
  })

  it('returns 0 for non-numeric / NaN input', () => {
    expect(parseRevenue('abc')).toBe(0)
    expect(parseRevenue(NaN)).toBe(0)
    expect(parseRevenue(Infinity)).toBe(0)
  })
})
