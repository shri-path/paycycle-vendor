/**
 * Customer Type Definition
 * Purpose: Type definition for customer entities
 */

export interface Customer {
  id: string
  name: string
  phone: string
  address: string
  city: string
  pincode: string
  status: 'active' | 'inactive' | 'blocked'
  createdAt: Date
  lastTransaction: Date
  notes?: string
}
