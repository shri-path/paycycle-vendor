/**
 * Shared HTTP Client Tests (WS-0)
 * Purpose: verify the response interceptor handles session revocation — on a
 * 401/403 it logs out (lazy auth.store), records the one-shot revoked reason, and
 * still rejects the original error. Uses the global axios mock from jest.setup.js.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockLogout = jest.fn().mockResolvedValue(undefined)
jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: { getState: () => ({ logout: mockLogout }) },
}))

const mockLogError = jest.fn().mockResolvedValue(undefined)
jest.mock('@utils/logger', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}))

jest.mock('@services/config', () => ({
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', timeout: 30000 },
}))

import axios from 'axios'
import { httpClient, consumeSessionRevokedReason } from '../http'

type RejectionHandler = (error: unknown) => Promise<unknown>

/** Pull the rejection handler registered on the shared instance's response use(). */
function getRejectionHandler(): RejectionHandler {
  const useMock = httpClient.interceptors.response.use as jest.Mock
  const lastCall = useMock.mock.calls[useMock.mock.calls.length - 1]
  return lastCall[1] as RejectionHandler
}

function makeAxiosError(status: number) {
  return {
    isAxiosError: true,
    response: { status, data: {} },
    config: { url: '/vendors/v1/staff' },
  }
}

describe('httpClient session-revocation interceptor', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    mockLogError.mockClear()
    // drain any pending reason from a previous test
    consumeSessionRevokedReason()
    ;(axios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (err: { isAxiosError?: boolean }) => err?.isAxiosError === true,
    )
  })

  it('registers a response interceptor', () => {
    expect((httpClient.interceptors.response.use as jest.Mock).mock.calls.length).toBeGreaterThan(0)
  })

  it('logs out and records the revoked reason on a 403, then rejects', async () => {
    const handler = getRejectionHandler()
    const error = makeAxiosError(403)

    await expect(handler(error)).rejects.toBe(error)

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockLogError).toHaveBeenCalled()
    expect(consumeSessionRevokedReason()).toBe('roles.access_changed')
  })

  it('logs out on a 401', async () => {
    const handler = getRejectionHandler()
    const error = makeAxiosError(401)

    await expect(handler(error)).rejects.toBe(error)
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(consumeSessionRevokedReason()).toBe('roles.access_changed')
  })

  it('does not log out on a non-auth status (e.g. 500)', async () => {
    const handler = getRejectionHandler()
    const error = makeAxiosError(500)

    await expect(handler(error)).rejects.toBe(error)
    expect(mockLogout).not.toHaveBeenCalled()
    expect(consumeSessionRevokedReason()).toBeNull()
  })

  it('consumeSessionRevokedReason clears the reason after reading', async () => {
    const handler = getRejectionHandler()
    await expect(handler(makeAxiosError(403))).rejects.toBeTruthy()
    expect(consumeSessionRevokedReason()).toBe('roles.access_changed')
    expect(consumeSessionRevokedReason()).toBeNull()
  })
})
