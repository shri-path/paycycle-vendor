/**
 * Vendor Service
 * Purpose: Handle all vendor/business-related API calls
 * Pattern: Mock in development, real API in production
 */

import { isMockMode, simulateNetworkDelay } from './config'
import type { Vendor } from '../types'
import { mockVendor, getVendorStats } from './mocks'

/**
 * Vendor API Service
 */
export const vendorService = {
  /**
   * Get vendor profile
   */
  getProfile: async (): Promise<Vendor> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockVendor
    }
    // TODO: Replace with real API call
    // return axios.get('/api/vendor/profile').then(res => res.data)
    return {} as Vendor
  },

  /**
   * Update vendor profile
   */
  updateProfile: async (
    updates: Partial<Omit<Vendor, 'id' | 'createdAt'>>
  ): Promise<Vendor> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      Object.assign(mockVendor, updates)
      return mockVendor
    }
    // TODO: Replace with real API call
    // return axios.put('/api/vendor/profile', updates).then(res => res.data)
    return {} as Vendor
  },

  /**
   * Get vendor statistics
   */
  getStats: async (): Promise<ReturnType<typeof getVendorStats>> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return getVendorStats()
    }
    // TODO: Replace with real API call
    // return axios.get('/api/vendor/stats').then(res => res.data)
    return {
      totalCustomers: 0,
      totalOutstanding: 0,
      monthlyRevenue: 0,
      averageOrderValue: 0,
      collectionRate: 0,
    }
  },

  /**
   * Get vendor settings
   */
  getSettings: async (): Promise<Record<string, any>> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        language: 'en',
        theme: 'light',
        notifications: true,
        autoMark: false,
        autoSync: true,
      }
    }
    // TODO: Replace with real API call
    // return axios.get('/api/vendor/settings').then(res => res.data)
    return {}
  },

  /**
   * Update vendor settings
   */
  updateSettings: async (
    settings: Record<string, any>
  ): Promise<Record<string, any>> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return settings
    }
    // TODO: Replace with real API call
    // return axios.put('/api/vendor/settings', settings).then(res => res.data)
    return {}
  },
}

export default vendorService
