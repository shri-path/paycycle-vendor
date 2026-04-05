/**
 * Ledger Entry Type Definition
 * Purpose: Type definition for ledger entry entities
 */

export interface LedgerEntry {
  id: string
  customerId: string
  customerName: string
  amount: number
  type: 'credit' | 'debit' | 'payment'
  date: Date
  notes: string
  status: 'pending' | 'completed' | 'failed'
}
