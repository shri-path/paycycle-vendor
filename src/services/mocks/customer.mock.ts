/**
 * Customer Mock Data
 * Purpose: Sample customer data for development and testing
 * Usage: Import and use for API responses
 */

import type { Customer } from '../../types'

/**
 * Mock customers with realistic tier 2-3 vendor data
 */
export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'राज कुमार',
    phone: '9876543210',
    address: 'मेन बाज़ार, दुकान नंबर 45',
    city: 'भोपाल',
    pincode: '462001',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    lastTransaction: new Date('2024-04-03'),
    notes: 'Regular customer, pays on time',
  },
  {
    id: 'cust-2',
    name: 'Priya Singh',
    phone: '9876543211',
    address: '123 Market Street, Shop No. 12',
    city: 'Indore',
    pincode: '452001',
    status: 'active',
    createdAt: new Date('2024-02-20'),
    lastTransaction: new Date('2024-04-04'),
    notes: 'New customer - festival season buyer',
  },
  {
    id: 'cust-3',
    name: 'Vikram Patel',
    phone: '9876543212',
    address: '45 Commerce Lane, Unit 3',
    city: 'Ujjain',
    pincode: '456010',
    status: 'active',
    createdAt: new Date('2024-01-05'),
    lastTransaction: new Date('2024-04-03'),
    notes: 'Bulk orders on weekends',
  },
  {
    id: 'cust-4',
    name: 'Anjali Verma',
    phone: '9876543213',
    address: 'ग्राम पंचायत, गांव रानीपुर',
    city: 'राजनंदगांव',
    pincode: '481001',
    status: 'inactive',
    createdAt: new Date('2024-03-10'),
    lastTransaction: new Date('2024-03-25'),
    notes: 'No transactions in last 10 days',
  },
  {
    id: 'cust-5',
    name: 'Hemant Kumar',
    phone: '9876543214',
    address: 'शहर मंडी, दुकान नंबर 78',
    city: 'रायपुर',
    pincode: '492001',
    status: 'active',
    createdAt: new Date('2024-02-01'),
    lastTransaction: new Date('2024-04-02'),
    notes: 'Premium customer - high value transactions',
  },
]

/**
 * Get all customers
 */
export const getAllCustomers = (): Customer[] => {
  return mockCustomers
}

/**
 * Get active customers only
 */
export const getActiveCustomers = (): Customer[] => {
  return mockCustomers.filter((customer) => customer.status === 'active')
}

/**
 * Get customer by ID
 */
export const getCustomerById = (id: string): Customer | undefined => {
  return mockCustomers.find((customer) => customer.id === id)
}

/**
 * Search customers by name or phone
 */
export const searchCustomers = (query: string): Customer[] => {
  const lowerQuery = query.toLowerCase()
  return mockCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.phone.includes(lowerQuery)
  )
}

export default mockCustomers
