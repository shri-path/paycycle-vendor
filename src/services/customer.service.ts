/**
 * Customer Service
 * Purpose: Handle all customer-related API calls
 * Pattern: Mock in development, real API in production
 */

import { isMockMode, simulateNetworkDelay } from './config'
import {
  mockCustomers,
  getActiveCustomers,
  searchCustomers,
} from './mocks'
import type { Customer } from '../types'


/**
 * Customer API Service
 */
export const customerService = {
  /**
   * Get all customers
   */
  getAll: async (): Promise<Customer[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockCustomers
    }
    // TODO: Replace with real API call
    // return axios.get('/api/customers').then(res => res.data)
    return []
  },

  /**
   * Get only active customers
   */
  getActive: async (): Promise<Customer[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return getActiveCustomers()
    }
    // TODO: Replace with real API call
    // return axios.get('/api/customers?status=active').then(res => res.data)
    return []
  },

  /**
   * Get customer by ID
   */
  getById: async (id: string): Promise<Customer | null> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockCustomers.find((c) => c.id === id) || null
    }
    // TODO: Replace with real API call
    // return axios.get(`/api/customers/${id}`).then(res => res.data)
    return null
  },

  /**
   * Search customers by name or phone
   */
  search: async (query: string): Promise<Customer[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return searchCustomers(query)
    }
    // TODO: Replace with real API call
    // return axios.get(`/api/customers/search?q=${query}`).then(res => res.data)
    return []
  },

  /**
   * Create new customer
   */
  create: async (
    customer: Omit<Customer, 'id' | 'createdAt' | 'lastTransaction'>
  ): Promise<Customer> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const newCustomer: Customer = {
        ...customer,
        id: `cust-${Date.now()}`,
        createdAt: new Date(),
        lastTransaction: new Date(),
      }
      mockCustomers.push(newCustomer)
      return newCustomer
    }
    // TODO: Replace with real API call
    // return axios.post('/api/customers', customer).then(res => res.data)
    return {} as Customer
  },

  /**
   * Update customer details
   */
  update: async (
    id: string,
    updates: Partial<Omit<Customer, 'id'>>
  ): Promise<Customer | null> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const index = mockCustomers.findIndex((c) => c.id === id)
      if (index !== -1) {
        mockCustomers[index] = {
          ...mockCustomers[index],
          ...updates,
        } as Customer
        return mockCustomers[index]
      }
      return null
    }
    // TODO: Replace with real API call
    // return axios.put(`/api/customers/${id}`, updates).then(res => res.data)
    return null
  },

  /**
   * Delete customer
   */
  delete: async (id: string): Promise<boolean> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const index = mockCustomers.findIndex((c) => c.id === id)
      if (index !== -1) {
        mockCustomers.splice(index, 1)
        return true
      }
      return false
    }
    // TODO: Replace with real API call
    // return axios.delete(`/api/customers/${id}`).then(() => true)
    return false
  },
}

export default customerService
