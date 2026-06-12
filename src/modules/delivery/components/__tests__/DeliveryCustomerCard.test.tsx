/** DeliveryCustomerCard tests (US-006) — money gated by showMoney; actions fire.
 * NOTE: the press-driven tests are ordered LAST — AppButton's press animation runs
 * on a timer that can leak past the test boundary and corrupt the next render
 * (testing-strategy "Async submit & act() hygiene"). Pure-render assertions first.
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { DeliveryCustomerCard } from '../DeliveryCustomerCard'
import { t } from '@locales/index'
import type { DeliveryDto } from '../../../../types/delivery'

function build(overrides: Partial<DeliveryDto> = {}): DeliveryDto {
  return {
    id: 'd1',
    customer: { id: 'c1', name: 'Anita Sharma', address: '12 MG Road', phoneNumber: null },
    quantity: 2,
    unit: 'ltr',
    ratePerUnit: 50,
    amount: 100,
    status: 'PENDING',
    markedBy: null,
    markedAt: null,
    hasConflict: false,
    conflictReason: null,
    otherLists: [],
    ...overrides,
  }
}

describe('DeliveryCustomerCard', () => {
  it('hides money when showMoney is false (staff)', async () => {
    const screen = await render(
      <DeliveryCustomerCard
        delivery={build()}
        showMoney={false}
        disabled={false}
        onMarkDelivered={jest.fn()}
        onMarkLeave={jest.fn()}
      />,
    )
    expect(screen.queryByText(/100/)).toBeNull()
  })

  it('shows the amount when showMoney is true (owner)', async () => {
    const screen = await render(
      <DeliveryCustomerCard
        delivery={build()}
        showMoney
        disabled={false}
        onMarkDelivered={jest.fn()}
        onMarkLeave={jest.fn()}
      />,
    )
    expect(screen.getByText(/100/)).toBeTruthy()
  })

  it('renders a conflict reason when hasConflict', async () => {
    const screen = await render(
      <DeliveryCustomerCard
        delivery={build({ hasConflict: true, conflictReason: 'Customer on leave' })}
        showMoney={false}
        disabled={false}
        onMarkDelivered={jest.fn()}
        onMarkLeave={jest.fn()}
      />,
    )
    expect(screen.getByText(t('delivery.conflict_reason', { reason: 'Customer on leave' }))).toBeTruthy()
  })

  // --- press-driven tests last (see NOTE) ---

  it('disables the action buttons when disabled', async () => {
    const onDelivered = jest.fn()
    const screen = await render(
      <DeliveryCustomerCard
        delivery={build()}
        showMoney={false}
        disabled
        onMarkDelivered={onDelivered}
        onMarkLeave={jest.fn()}
        testID="card"
      />,
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('card-delivered'))
    })
    expect(onDelivered).not.toHaveBeenCalled()
  })

  it('fires onMarkDelivered / onMarkLeave with the delivery id', async () => {
    const onDelivered = jest.fn()
    const onLeave = jest.fn()
    const screen = await render(
      <DeliveryCustomerCard
        delivery={build()}
        showMoney={false}
        disabled={false}
        onMarkDelivered={onDelivered}
        onMarkLeave={onLeave}
        testID="card"
      />,
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('card-delivered'))
      fireEvent.press(screen.getByTestId('card-leave'))
    })
    expect(onDelivered).toHaveBeenCalledWith('d1')
    expect(onLeave).toHaveBeenCalledWith('d1')
  })
})
