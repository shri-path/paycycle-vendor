/**
 * Ledger Mock Data
 * Purpose: Sample ledger entries for development and testing
 * Usage: Import and use for API responses
 */

import type { LedgerEntry } from '../../types'

/**
 * Mock ledger entries with realistic tier 2-3 vendor data
 */
export const mockLedgerEntries: LedgerEntry[] = [
  {
    id: 'ledger-1',
    customerId: 'cust-1',
    customerName: 'राज कुमार',
    amount: 500,
    type: 'credit',
    date: new Date('2024-04-01'),
    notes: 'रोज़मर्रा की दुकान सामान',
    status: 'completed',
  },
  {
    id: 'ledger-2',
    customerId: 'cust-2',
    customerName: 'Priya Singh',
    amount: 1200,
    type: 'debit',
    date: new Date('2024-04-02'),
    notes: 'Payment for April delivery',
    status: 'completed',
  },
  {
    id: 'ledger-3',
    customerId: 'cust-1',
    customerName: 'राज कुमार',
    amount: 300,
    type: 'credit',
    date: new Date('2024-04-03'),
    notes: 'Extra items - festival preparation',
    status: 'completed',
  },
  {
    id: 'ledger-4',
    customerId: 'cust-3',
    customerName: 'Vikram Patel',
    amount: 800,
    type: 'credit',
    date: new Date('2024-04-03'),
    notes: 'Weekly supply',
    status: 'completed',
  },
  {
    id: 'ledger-5',
    customerId: 'cust-2',
    customerName: 'Priya Singh',
    amount: 1500,
    type: 'payment',
    date: new Date('2024-04-04'),
    notes: 'Payment via UPI',
    status: 'completed',
  },
]

/**
 * Get ledger entries for a customer
 */
export const getLedgerEntriesByCustomer = (
  customerId: string
): LedgerEntry[] => {
  return mockLedgerEntries.filter((entry) => entry.customerId === customerId)
}

/**
 * Get ledger entries for a date range
 */
export const getLedgerEntriesByDateRange = (
  startDate: Date,
  endDate: Date
): LedgerEntry[] => {
  return mockLedgerEntries.filter(
    (entry) =>
      entry.date >= startDate &&
      entry.date <= endDate
  )
}

/**
 * Calculate outstanding balance for a customer
 */
export const calculateCustomerBalance = (
  customerId: string
): number => {
  const entries = getLedgerEntriesByCustomer(customerId)
  return entries.reduce((balance, entry) => {
    if (entry.type === 'credit') {
      return balance + entry.amount
    } else if (entry.type === 'debit') {
      return balance - entry.amount
    }
    return balance
  }, 0)
}

export default mockLedgerEntries
