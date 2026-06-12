/**
 * useLimitReached hook tests (US-009)
 * Covers:
 *   - show() returns false for non-axios errors
 *   - show() returns false for non-451 axios errors
 *   - show() returns true for 451, sets modal state with extracted limits
 *   - show() uses fallbackResource when response details.resource is missing
 *   - close() hides the modal
 *   - goUpgrade() hides the modal and calls router.push
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockPush = jest.fn()

import { renderHook, act } from '@testing-library/react-native'
import { useLimitReached } from '../useLimitReached'
import axios from 'axios'

// Spy is declared here; implementation is set in beforeEach after clearAllMocks.
const isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError')

function makeAxiosError(status: number, details?: object) {
  return {
    isAxiosError: true,
    response: {
      status,
      data: {
        error: {
          code: 'SUBSCRIPTION_LIMIT_REACHED',
          details: details ?? {},
        },
      },
    },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  // Re-apply spy implementation after clearAllMocks.
  isAxiosErrorSpy.mockImplementation(
    (e: unknown): e is import('axios').AxiosError =>
      !!e && typeof e === 'object' && (e as { isAxiosError?: boolean }).isAxiosError === true,
  )
})

describe('useLimitReached', () => {
  it('returns false for non-axios errors', async () => {
    const { result } = await renderHook(() => useLimitReached())
    let returned: boolean = true
    await act(async () => {
      returned = result.current.show(new Error('generic'), 'customers')
    })
    expect(returned).toBe(false)
    expect(result.current.state.visible).toBe(false)
  })

  it('returns false for non-451 axios errors (e.g. 403)', async () => {
    const { result } = await renderHook(() => useLimitReached())
    let returned: boolean = true
    await act(async () => {
      returned = result.current.show(makeAxiosError(403), 'customers')
    })
    expect(returned).toBe(false)
    expect(result.current.state.visible).toBe(false)
  })

  it('returns true and sets modal state for 451', async () => {
    const { result } = await renderHook(() => useLimitReached())
    let returned: boolean = false
    await act(async () => {
      returned = result.current.show(
        makeAxiosError(451, {
          limits: { current: 127, max: 150 },
          resource: 'customers',
          upgradeUrl: '/(app)/subscription/upgrade',
        }),
        'staff',
      )
    })
    expect(returned).toBe(true)
    expect(result.current.state.visible).toBe(true)
    expect(result.current.state.resource).toBe('customers')
    expect(result.current.state.current).toBe(127)
    expect(result.current.state.max).toBe(150)
  })

  it('uses fallbackResource when details.resource is absent', async () => {
    const { result } = await renderHook(() => useLimitReached())
    await act(async () => {
      result.current.show(
        makeAxiosError(451, { limits: { current: 3, max: 3 } }),
        'staff',
      )
    })
    expect(result.current.state.resource).toBe('staff')
  })

  it('close() hides the modal', async () => {
    const { result } = await renderHook(() => useLimitReached())
    await act(async () => {
      result.current.show(makeAxiosError(451, { limits: { current: 1, max: 5 } }), 'customers')
    })
    expect(result.current.state.visible).toBe(true)

    await act(async () => {
      result.current.close()
    })
    expect(result.current.state.visible).toBe(false)
  })

  it('goUpgrade() hides the modal and navigates to upgrade screen', async () => {
    const { result } = await renderHook(() => useLimitReached())
    await act(async () => {
      result.current.show(makeAxiosError(451, { limits: { current: 1, max: 5 } }), 'customers')
    })

    await act(async () => {
      result.current.goUpgrade()
    })

    expect(result.current.state.visible).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/(app)/subscription/upgrade')
  })
})
