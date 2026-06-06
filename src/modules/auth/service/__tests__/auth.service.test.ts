/**
 * Auth Service Tests
 * Purpose: Smoke tests for authService mock mode returns and error propagation
 */

// Mock expo-secure-store before other imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

// Force mock mode for all tests
jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: {
    baseUrl: 'http://localhost:3000/api',
    socketUrl: 'http://localhost:3000',
    timeout: 30000,
    mockDelay: 0, // Zero delay in tests
  },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { authService } from '../auth.service'

describe('authService (mock mode)', () => {
  describe('signup', () => {
    it('returns user, tokens and vendorContext', async () => {
      const result = await authService.signup('+919876543210', 'TestPass@1', 'Krishna Dairy')
      expect(result.user).toBeDefined()
      expect(result.user.phone).toBe('+919876543210')
      expect(result.tokens.accessToken).toBeTruthy()
      expect(result.tokens.refreshToken).toBeTruthy()
      expect(result.vendorContext.vendorName).toBe('Krishna Dairy')
    })
  })

  describe('login', () => {
    it('returns user, tokens and vendorContexts on success', async () => {
      const result = await authService.login('+919876543210', 'any-password')
      expect(result.user).toBeDefined()
      expect(result.tokens).toBeDefined()
      expect(Array.isArray(result.vendorContexts)).toBe(true)
      expect(result.vendorContexts.length).toBeGreaterThan(0)
    })

    it('throws when password is empty (mock validation)', async () => {
      await expect(authService.login('+919876543210', '')).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('resolves without error', async () => {
      await expect(authService.logout('refresh-token', 'access-token')).resolves.toBeUndefined()
    })
  })

  describe('forgotPassword', () => {
    it('returns a non-empty reset token in mock mode', async () => {
      const token = await authService.forgotPassword('+919876543210')
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe('resetPassword', () => {
    it('resolves without error in mock mode', async () => {
      await expect(
        authService.resetPassword('+919876543210', 'mock-reset-token', '123456', 'NewPass@1'),
      ).resolves.toBeUndefined()
    })
  })

  describe('refreshTokens', () => {
    it('returns new accessToken and refreshToken', async () => {
      const result = await authService.refreshTokens('mock-refresh-token')
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })
  })
})
