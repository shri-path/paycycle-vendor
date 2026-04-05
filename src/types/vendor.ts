/**
 * Vendor Type Definition
 * Purpose: Type definition for vendor (business owner) entities
 */

export interface Vendor {
  id: string
  name: string
  phone: string
  email?: string
  businessName: string
  businessType: string
  city: string
  state: string
  pincode: string
  totalCustomers: number
  totalOutstanding: number
  monthlyRevenue: number
  createdAt: Date
}
