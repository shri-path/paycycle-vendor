/**
 * Auth Service
 * Purpose: Authentication API calls — mock in dev, real API in production
 */

import axios from 'axios'
import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay, API_CONFIG } from '@services/config'
import {
  mockUser,
  mockTokens,
  mockVendorContext,
  MOCK_RESET_TOKEN,
} from '@services/mocks'
import type {
  SignupResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from '../../../types/auth'

const api = axios.create({
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
    const { data } = await api.post(APIPath.Auth.Signup, { phone, password, vendorName })
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
    const { data } = await api.post(APIPath.Auth.Login, { phone, password })
    return data.data as LoginResponseDto
  },

  async logout(refreshToken: string, accessToken: string): Promise<void> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return
    }
    await api.post(
      APIPath.Auth.Logout,
      { refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
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
    const { data } = await api.post(APIPath.Auth.AcceptInvite, { token, password, name })
    return data.data as LoginResponseDto
  },

  async refreshTokens(refreshToken: string): Promise<RefreshResponseDto> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockTokens
    }
    const { data } = await api.post(APIPath.Auth.Refresh, { refreshToken })
    return data.data as RefreshResponseDto
  },

  async forgotPassword(phone: string): Promise<string> {
    if (isMockMode) {
      await simulateNetworkDelay()
      // In real mode the reset token is delivered via SMS; in mock we return it directly
      return MOCK_RESET_TOKEN
    }
    await api.post(APIPath.Auth.ForgotPassword, { phone })
    // Reset token is sent via SMS — not in response
    return ''
  },

  async resetPassword(
    phone: string,
    resetToken: string,
    otpCode: string,
    newPassword: string,
  ): Promise<void> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return
    }
    await api.post(APIPath.Auth.ResetPassword, { phone, resetToken, otpCode, newPassword })
  },
}

export default authService
