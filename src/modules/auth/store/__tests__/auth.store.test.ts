/**
 * Auth Store Tests
 * Purpose: Unit tests for auth store actions using mocked authService
 */

// Mock expo-secure-store before any store import
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}))

// Force mock mode
jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: {
    baseUrl: 'http://localhost:3000/api',
    socketUrl: 'http://localhost:3000',
    timeout: 30000,
    mockDelay: 0,
  },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

// Mock the auth service
jest.mock('../../service/auth.service', () => ({
  authService: {
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    refreshTokens: jest.fn(),
  },
}))

import * as SecureStore from 'expo-secure-store'
import { authService } from '../../service/auth.service'
import { useAuthStore } from '../auth.store'

const mockedAuthService = authService as jest.Mocked<typeof authService>

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store to clean initial state before each test
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      vendorContext: null,
      isLoading: false,
      error: null,
      isHydrated: false,
      pendingResetPhone: null,
    })
  })

  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.vendorContext).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('clearError', () => {
    it('clears error state', () => {
      useAuthStore.setState({ error: 'auth.invalid_credentials' })
      useAuthStore.getState().clearError()
      expect(useAuthStore.getState().error).toBeNull()
    })
  })

  describe('setHydrated', () => {
    it('sets isHydrated to true', () => {
      useAuthStore.getState().setHydrated(true)
      expect(useAuthStore.getState().isHydrated).toBe(true)
    })
  })

  describe('login', () => {
    const mockLoginResponse = {
      user: {
        id: 'u1',
        phone: '+919876543210',
        name: null,
        email: null,
        profilePhotoUrl: null,
        preferredLanguage: 'en',
        lastLoginAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
      vendorContexts: [{ vendorId: 'v1', vendorName: 'Krishna Dairy', role: 'vendor_owner' }],
    }

    it('sets isAuthenticated and user on success', async () => {
      mockedAuthService.login.mockResolvedValueOnce(mockLoginResponse)

      await useAuthStore.getState().login('+919876543210', 'TestPass@1')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user?.phone).toBe('+919876543210')
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('stores tokens in SecureStore on success', async () => {
      mockedAuthService.login.mockResolvedValueOnce(mockLoginResponse)
      await useAuthStore.getState().login('+919876543210', 'TestPass@1')

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth.accessToken', 'access-token')
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth.refreshToken', 'refresh-token')
    })

    it('sets error i18n key on failure', async () => {
      mockedAuthService.login.mockRejectedValueOnce(new Error('auth.invalid_credentials'))

      await expect(useAuthStore.getState().login('+919876543210', 'wrong')).rejects.toThrow()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBeTruthy()
      expect(state.isLoading).toBe(false)
    })

    it('sets isLoading to true during request', () => {
      mockedAuthService.login.mockImplementationOnce(() => new Promise(() => {})) // never resolves

      void useAuthStore.getState().login('+91', 'pw')
      expect(useAuthStore.getState().isLoading).toBe(true)
    })
  })

  describe('signup', () => {
    const mockSignupResponse = {
      user: {
        id: 'u2',
        phone: '+911234567890',
        name: null,
        email: null,
        profilePhotoUrl: null,
        preferredLanguage: 'en',
        lastLoginAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      tokens: { accessToken: 'access-2', refreshToken: 'refresh-2' },
      vendorContext: { vendorId: 'v2', vendorName: 'Test Vendor', role: 'vendor_owner' },
    }

    it('sets isAuthenticated on success', async () => {
      mockedAuthService.signup.mockResolvedValueOnce(mockSignupResponse)

      await useAuthStore.getState().signup('+911234567890', 'TestPass@1', 'Test Vendor')

      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().vendorContext?.vendorName).toBe('Test Vendor')
    })

    it('sets error on failure', async () => {
      mockedAuthService.signup.mockRejectedValueOnce(new Error('auth.phone_already_registered'))

      await expect(useAuthStore.getState().signup('+91', 'pw', 'name')).rejects.toThrow()
      expect(useAuthStore.getState().error).toBeTruthy()
    })
  })

  describe('logout', () => {
    it('clears auth state and deletes secure tokens', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'u1',
          phone: '+91',
          name: null,
          email: null,
          profilePhotoUrl: null,
          preferredLanguage: 'en',
          lastLoginAt: null,
          createdAt: '',
          updatedAt: '',
        },
        vendorContext: null,
      })
      mockedAuthService.logout.mockResolvedValueOnce(undefined)

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled()
    })
  })

  describe('forgotPassword', () => {
    it('stores pendingResetPhone (OTP is delivered via SMS, no client token)', async () => {
      mockedAuthService.forgotPassword.mockResolvedValueOnce(undefined)

      await useAuthStore.getState().forgotPassword('+919876543210')

      expect(useAuthStore.getState().pendingResetPhone).toBe('+919876543210')
    })
  })

  describe('resetPassword', () => {
    it('clears pendingResetPhone on success', async () => {
      useAuthStore.setState({ pendingResetPhone: '+919876543210' })
      mockedAuthService.resetPassword.mockResolvedValueOnce(undefined)

      await useAuthStore.getState().resetPassword('123456', 'NewPass@1')

      expect(mockedAuthService.resetPassword).toHaveBeenCalledWith(
        '+919876543210',
        '123456',
        'NewPass@1',
      )
      expect(useAuthStore.getState().pendingResetPhone).toBeNull()
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('throws when no pendingResetPhone', async () => {
      useAuthStore.setState({ pendingResetPhone: null })

      await expect(useAuthStore.getState().resetPassword('123456', 'NewPass@1')).rejects.toThrow()
    })
  })
})
