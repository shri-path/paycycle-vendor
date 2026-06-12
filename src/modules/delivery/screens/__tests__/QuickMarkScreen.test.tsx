/**
 * QuickMarkScreen tests (US-006) — offline blocks entry, all-done empty state, and
 * content renders the card. Gesture-handler/reanimated mocked for QuickMarkCard.
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))
jest.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => false }))
jest.mock('react-native-gesture-handler', () => ({
  Gesture: { Pan: () => { const a: Record<string, () => unknown> = {}; const c = () => a; a.enabled = c; a.onUpdate = c; a.onEnd = c; return a } },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: { View: ({ children, ...props }: { children: React.ReactNode }) => React.createElement(View, props, children) },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withSpring: (v: number) => v,
    runOnJS: (fn: (...a: unknown[]) => unknown) => fn,
    interpolate: () => 0,
  }
})
jest.mock('@modules/roles/store/roles.store', () => ({ useRolesStore: jest.fn() }))
jest.mock('../../store/delivery.store', () => ({ useDeliveryStore: jest.fn() }))

import React from 'react'
import { render } from '@testing-library/react-native'
import QuickMarkScreen from '../QuickMarkScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { DeliveryDto } from '../../../../types/delivery'

const { useDeliveryStore } = jest.requireMock('../../store/delivery.store') as { useDeliveryStore: jest.Mock }
const { useRolesStore } = jest.requireMock('@modules/roles/store/roles.store') as { useRolesStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock

function pending(id: string): DeliveryDto {
  return {
    id,
    customer: { id: `c-${id}`, name: 'Anita', address: 'A', phoneNumber: null },
    quantity: 1, unit: 'ltr', status: 'PENDING', markedBy: null, markedAt: null,
    hasConflict: false, conflictReason: null, otherLists: [],
  }
}

function setStore(state: Record<string, unknown>): void {
  useDeliveryStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      quickQueue: [pending('d1')],
      quickIndex: 0,
      isQuickLoading: false,
      quickError: null,
      buildQuickQueue: jest.fn().mockResolvedValue(undefined),
      advanceQuick: jest.fn(),
      markDelivery: jest.fn().mockResolvedValue(undefined),
      listDeliveries: { l1: [pending('d1')] },
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) => selector({ assignedListIds: ['l1'] }))
  setStore({})
})

describe('QuickMarkScreen', () => {
  it('blocks entry with a notice when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<QuickMarkScreen />)
    expect(screen.getAllByText(t('delivery.quick_offline_blocked')).length).toBeGreaterThan(0)
  })

  it('renders the current card (content)', async () => {
    const screen = await render(<QuickMarkScreen />)
    expect(screen.getByTestId('quick-mark-card')).toBeTruthy()
  })

  it('shows the all-done state when the queue is exhausted', async () => {
    setStore({ quickQueue: [pending('d1')], quickIndex: 1 })
    const screen = await render(<QuickMarkScreen />)
    expect(screen.getByText(t('delivery.all_done'))).toBeTruthy()
  })
})
