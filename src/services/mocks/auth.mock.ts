/**
 * Auth Mock Data
 * Purpose: Mock responses matching paycycle_api auth contracts
 */

import type { UserDto, TokenDto, VendorContextDto } from '../../types/auth'

export const mockUser: UserDto = {
  id: '1',
  phone: '+919876543210',
  name: 'Test Owner',
  email: null,
  profilePhotoUrl: null,
  preferredLanguage: 'en',
  lastLoginAt: new Date().toISOString(),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
}

export const mockTokens: TokenDto = {
  accessToken: 'mock-access-token-eyJhbGciOiJIUzI1NiJ9',
  refreshToken: 'mock-refresh-token-eyJhbGciOiJIUzI1NiJ9',
}

export const mockVendorContext: VendorContextDto = {
  vendorId: '1',
  vendorName: 'Test Vendor',
  role: 'vendor_owner',
}

export const MOCK_OTP = '123456'
export const MOCK_RESET_TOKEN = 'mock-reset-token-uuid-1234'
