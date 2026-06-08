/**
 * Shared HTTP Client (US-002)
 * Purpose: Single axios instance for authenticated, vendor-scoped calls, plus a
 * response interceptor that handles session revocation (401/403) centrally.
 *
 * Why a shared instance (OQ-3): when a staff member is disabled/removed or an
 * owner is demoted mid-session, the next authenticated call returns 401/403. We
 * detect that once, here, log the user out (lazy import of auth.store to avoid a
 * require cycle), and record a one-shot reason so the login screen can show the
 * "your access has changed" message. The (app) route guard then redirects to
 * /(auth)/login automatically once `isAuthenticated` flips to false.
 *
 * Security: this client attaches the access token from SecureStore via a request
 * interceptor — services never read tokens from the store/state.
 */

import axios, { AxiosError, AxiosInstance } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_CONFIG } from './config'
import { logError } from '@utils/logger'

const SECURE_KEY_ACCESS_TOKEN = 'auth.accessToken'

/**
 * One-shot session-revocation reason. The login screen reads + clears it to show
 * the "access changed" alert. Module-level (not Zustand) so it survives the
 * logout() state reset that clears the roles/auth stores.
 */
let sessionRevokedReason: string | null = null

/** Returns and clears the pending session-revocation reason (i18n key), if any. */
export function consumeSessionRevokedReason(): string | null {
  const reason = sessionRevokedReason
  sessionRevokedReason = null
  return reason
}

/** Test/manual hook to seed the reason (used by the interceptor). */
export function setSessionRevokedReason(reasonKey: string): void {
  sessionRevokedReason = reasonKey
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
})

// Attach the access token from SecureStore on every request.
httpClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(SECURE_KEY_ACCESS_TOKEN)
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Guard so a burst of failing calls only logs the user out once.
let handlingRevocation = false

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status

    if ((status === 401 || status === 403) && !handlingRevocation) {
      handlingRevocation = true
      setSessionRevokedReason('roles.access_changed')
      void logError(error, {
        screen: 'Session',
        action: 'sessionRevocation',
        endpoint: error.config?.url ?? undefined,
      })
      try {
        // Lazy require to break the module cycle (auth.store -> http -> auth.store)
        // and to stay compatible with the Jest VM, which cannot execute a native
        // dynamic import() callback. Metro/Hermes resolve this require synchronously.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useAuthStore } = require('@modules/auth/store/auth.store') as typeof import('@modules/auth/store/auth.store')
        await useAuthStore.getState().logout()
      } catch (logoutErr) {
        void logError(logoutErr, { screen: 'Session', action: 'sessionRevocationLogout' })
      } finally {
        handlingRevocation = false
      }
    }

    return Promise.reject(error)
  },
)

export default httpClient
