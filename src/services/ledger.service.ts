/**
 * Ledger Service
 * Purpose: Handle all ledger-related API calls
 * Pattern: Mock in development, real API in production
 */

import { isMockMode, simulateNetworkDelay } from './config'
import {
  mockLedgerEntries,
  getLedgerEntriesByCustomer,
} from './mocks'
import type { LedgerEntry } from '../types'


/**
 * Ledger API Service
 */
export const ledgerService = {
  /**
   * Get all ledger entries
   */
  getEntries: async (): Promise<LedgerEntry[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockLedgerEntries
    }
    // TODO: Replace with real API call
    // return axios.get('/api/ledger').then(res => res.data)
    return []
  },

  /**
   * Get ledger entries for a specific customer
   */
  getEntriesByCustomer: async (
    customerId: string
  ): Promise<LedgerEntry[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return getLedgerEntriesByCustomer(customerId)
    }
    // TODO: Replace with real API call
    // return axios.get(`/api/ledger/customer/${customerId}`).then(res => res.data)
    return []
  },

  /**
   * Add new ledger entry
   */
  addEntry: async (
    entry: Omit<LedgerEntry, 'id' | 'status'>
  ): Promise<LedgerEntry> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const newEntry: LedgerEntry = {
        ...entry,
        id: `ledger-${Date.now()}`,
        status: 'completed',
      }
      mockLedgerEntries.push(newEntry)
      return newEntry
    }
    // TODO: Replace with real API call
    // return axios.post('/api/ledger', entry).then(res => res.data)
    return {} as LedgerEntry
  },

  /**
   * Update ledger entry
   */
  updateEntry: async (
    id: string,
    updates: Partial<Omit<LedgerEntry, 'id'>>
  ): Promise<LedgerEntry | null> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const index = mockLedgerEntries.findIndex((e) => e.id === id)
      if (index !== -1) {
        mockLedgerEntries[index] = {
          ...mockLedgerEntries[index],
          ...updates,
        } as LedgerEntry
        return mockLedgerEntries[index]
      }
      return null
    }
    // TODO: Replace with real API call
    // return axios.put(`/api/ledger/${id}`, updates).then(res => res.data)
    return null
  },

  /**
   * Delete ledger entry
   */
  deleteEntry: async (id: string): Promise<boolean> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const index = mockLedgerEntries.findIndex((e) => e.id === id)
      if (index !== -1) {
        mockLedgerEntries.splice(index, 1)
        return true
      }
      return false
    }
    // TODO: Replace with real API call
    // return axios.delete(`/api/ledger/${id}`).then(() => true)
    return false
  },
}

export default ledgerService
