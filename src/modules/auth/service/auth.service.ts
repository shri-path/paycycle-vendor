/**
 * Auth Service
 * Purpose: Authentication API calls — mock in dev, real API in production
 */

import axios from 'axios'
import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay, API_CONFIG } from '@services/config'
import { httpClient } from '@services/http'
import {
  mockUser,
  mockTokens,
  mockVendorContext,
} from '@services/mocks'
import type {
  SignupResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from '../../../types/auth'

/**
 * Public (unauthenticated) client for endpoints that issue a session and must NOT
 * attach a stale Bearer token or trip the shared 401/403 session-revocation
 * interceptor: login, signup, forgotPassword, acceptInvite. Authenticated calls
 * (logout, refreshTokens, resetPassword) go through the shared `httpClient` so the
 * interceptor covers token expiry / revocation centrally (CRITICAL-4).
 */
const publicApiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
})

export const authService = {
  async signup(
    phone: string,
    password: string,
    vendorName: string,
  ): Promise<SignupResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return {
        user: { ...mockUser, phone },
        tokens: mockTokens,
        vendorContext: { ...mockVendorContext, vendorName },
      }
    }
    const { data } = await publicApiClient.post(APIPath.Auth.Signup, { phone, password, vendorName })
    return data.data as SignupResponseDto
  },

  async login(phone: string, password: string): Promise<LoginResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      if (password.length === 0) {
        throw new Error('auth.invalid_credentials')
      }
      return {
        user: { ...mockUser, phone },
        tokens: mockTokens,
        vendorContexts: [mockVendorContext],
      }
    }
    const { data } = await publicApiClient.post(APIPath.Auth.Login, { phone, password })
    return data.data as LoginResponseDto
  },

  // `accessToken` is retained in the signature for call-site compatibility, but the
  // shared httpClient attaches the Bearer token from SecureStore via its request
  // interceptor (services never read tokens from state) — so it is unused here.
  async logout(refreshToken: string, _accessToken: string): Promise<void> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return
    }
    await httpClient.post(APIPath.Auth.Logout, { refreshToken })
  },

  async acceptInvite(
    token: string,
    password: string,
    name?: string,
  ): Promise<LoginResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      if (!token || token.startsWith('invalid')) {
        throw new Error('roles.error_invite_invalid')
      }
      if (token.startsWith('expired')) {
        throw new Error('roles.error_invite_expired')
      }
      return {
        user: { ...mockUser, name: name ?? mockUser.name },
        tokens: mockTokens,
        // Staff joins land with a staff vendor context.
        vendorContexts: [{ ...mockVendorContext, role: 'staff' }],
      }
    }
    const { data } = await publicApiClient.post(APIPath.Auth.AcceptInvite, { token, password, name })
    return data.data as LoginResponseDto
  },

  async refreshTokens(refreshToken: string): Promise<RefreshResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockTokens
    }
    const { data } = await httpClient.post(APIPath.Auth.Refresh, { refreshToken })
    return data.data as RefreshResponseDto
  },

  /**
   * Requests an OTP for password reset. In production the OTP is delivered
   * out-of-band via SMS and the response carries no secret. In non-production
   * environments the API echoes the generated OTP as `devOtp` so QA / dev clients
   * can complete the flow without real SMS delivery — returned here for the
   * dev-only on-screen hint. Returns `undefined` when no dev OTP is available.
   */
  async forgotPassword(phone: string): Promise<string | undefined> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return '123456'
    }
    const { data } = await publicApiClient.post(APIPath.Auth.ForgotPassword, { phone })
    return (data?.data as { devOtp?: string } | undefined)?.devOtp
  },

  async resetPassword(
    phone: string,
    otpCode: string,
    newPassword: string,
  ): Promise<void> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return
    }
    await httpClient.post(APIPath.Auth.ResetPassword, { phone, otpCode, newPassword })
  },
}

export default authService
