/**
 * QuickMarkCard tests (US-006) — the buttons are always a parallel path to the
 * swipe (accessibility); tapping them fires the callbacks. Gesture-handler and
 * reanimated are mocked so the component renders under Jest.
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => {
      const api: Record<string, () => unknown> = {}
      const chain = () => api
      api.enabled = chain
      api.onUpdate = chain
      api.onEnd = chain
      return api
    },
  },
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
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    interpolate: () => 0,
  }
})

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { QuickMarkCard } from '../QuickMarkCard'
import { t } from '@locales/index'
import type { DeliveryDto } from '../../../../types/delivery'

const delivery: DeliveryDto = {
  id: 'd1',
  customer: { id: 'c1', name: 'Anita', address: 'A', phoneNumber: null },
  quantity: 2,
  unit: 'ltr',
  status: 'PENDING',
  markedBy: null,
  markedAt: null,
  hasConflict: false,
  conflictReason: null,
  otherLists: [],
}

describe('QuickMarkCard', () => {
  it('still renders the buttons when reduceMotion is on', async () => {
    const screen = await render(
      <QuickMarkCard
        delivery={delivery}
        onSwipeDelivered={jest.fn()}
        onSwipeLeave={jest.fn()}
        reduceMotion
      />,
    )
    expect(screen.getByText(t('delivery.mark_delivered'))).toBeTruthy()
  })

  // press-driven test last (button press animation can leak past the boundary)
  it('fires the button callbacks (parallel path to swipe)', async () => {
    const onDelivered = jest.fn()
    const onLeave = jest.fn()
    const screen = await render(
      <QuickMarkCard
        delivery={delivery}
        onSwipeDelivered={onDelivered}
        onSwipeLeave={onLeave}
        reduceMotion={false}
      />,
    )
    await act(async () => {
      fireEvent.press(screen.getByText(t('delivery.mark_delivered')))
      fireEvent.press(screen.getByText(t('delivery.mark_leave')))
    })
    expect(onDelivered).toHaveBeenCalled()
    expect(onLeave).toHaveBeenCalled()
  })
})
