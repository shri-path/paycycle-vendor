/**
 * Vendor Mock Data
 * Purpose: Sample vendor (business owner) data
 * Usage: Import and use for profile and business info
 */

import type { Vendor } from '../../types'

/**
 * Mock vendor profile
 */
export const mockVendor: Vendor = {
  id: 'vendor-1',
  name: 'राजीव कुमार शर्मा',
  phone: '9876543200',
  email: 'rajeev@delivendor.app',
  businessName: 'शर्मा डेली स्टोर्स',
  businessType: 'दैनिक आवश्यकता की दुकान',
  city: 'भोपाल',
  state: 'मध्य प्रदेश',
  pincode: '462001',
  totalCustomers: 145,
  totalOutstanding: 8500,
  monthlyRevenue: 125000,
  createdAt: new Date('2023-06-15'),
}

/**
 * Get vendor profile
 */
export const getVendorProfile = (): Vendor => {
  return mockVendor
}

/**
 * Get vendor statistics
 */
export const getVendorStats = () => {
  return {
    totalCustomers: mockVendor.totalCustomers,
    totalOutstanding: mockVendor.totalOutstanding,
    monthlyRevenue: mockVendor.monthlyRevenue,
    averageOrderValue: mockVendor.monthlyRevenue / mockVendor.totalCustomers,
    collectionRate: ((mockVendor.monthlyRevenue - mockVendor.totalOutstanding) / mockVendor.monthlyRevenue) * 100,
  }
}

export default mockVendor
