/**
 * Delivery shared-component tests (US-006) — CompletedDeliveryRow, ProgressHeader,
 * ConflictBanner, ReasonChips, CalendarMonthGrid. Status by icon + text; calendar
 * keys by YYYY-MM-DD; empty days non-interactive.
 */
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { CompletedDeliveryRow } from '../CompletedDeliveryRow'
import { DeliveryProgressHeader } from '../DeliveryProgressHeader'
import { ConflictBanner } from '../ConflictBanner'
import { ReasonChips } from '../ReasonChips'
import { CalendarMonthGrid } from '../CalendarMonthGrid'
import { t } from '@locales/index'
import type { CalendarDayDto, DeliveryDto, TodayConflictDto } from '../../../../types/delivery'

function delivery(status: DeliveryDto['status']): DeliveryDto {
  return {
    id: 'd1',
    customer: { id: 'c1', name: 'Anita', address: 'A', phoneNumber: null },
    quantity: 1,
    unit: 'ltr',
    amount: 50,
    status,
    markedBy: { userId: 'u1', name: 'Ramesh', role: 'staff' },
    markedAt: '2026-06-12T06:30:00Z',
    hasConflict: false,
    conflictReason: null,
    otherLists: [],
  }
}

describe('CompletedDeliveryRow', () => {
  it('shows the delivered status label (icon + text)', async () => {
    const screen = await render(<CompletedDeliveryRow delivery={delivery('DELIVERED')} showMoney={false} />)
    expect(screen.getByText(t('delivery.status_delivered'))).toBeTruthy()
  })

  it('omits money for staff', async () => {
    const screen = await render(<CompletedDeliveryRow delivery={delivery('DELIVERED')} showMoney={false} />)
    expect(screen.queryByText(/50/)).toBeNull()
  })
})

describe('DeliveryProgressHeader', () => {
  it('renders the progress label and counts', async () => {
    const screen = await render(<DeliveryProgressHeader total={10} delivered={6} onLeave={1} pending={3} />)
    expect(screen.getByText(t('delivery.progress', { done: 6, total: 10 }))).toBeTruthy()
  })
})

describe('ConflictBanner', () => {
  const conflicts: TodayConflictDto[] = [
    { deliveryId: 'd3', customerName: 'Chitra', listName: 'Milk', reason: 'on leave' },
  ]

  it('renders nothing when there are no conflicts', async () => {
    const screen = await render(<ConflictBanner conflicts={[]} onSelectConflict={jest.fn()} />)
    expect(screen.toJSON()).toBeNull()
  })

  it('expands and fires onSelectConflict with the delivery id', async () => {
    const onSelect = jest.fn()
    const screen = await render(<ConflictBanner conflicts={conflicts} onSelectConflict={onSelect} testID="cb" />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('cb-toggle'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('cb-row-d3'))
    })
    expect(onSelect).toHaveBeenCalledWith('d3')
  })
})

describe('ReasonChips', () => {
  it('fires onSelect with the tapped reason', async () => {
    const onSelect = jest.fn()
    const screen = await render(<ReasonChips reasons={[t('delivery.reason_festival')]} onSelect={onSelect} />)
    await act(async () => {
      fireEvent.press(screen.getByText(t('delivery.reason_festival')))
    })
    expect(onSelect).toHaveBeenCalledWith(t('delivery.reason_festival'))
  })
})

describe('CalendarMonthGrid', () => {
  const days: Record<string, CalendarDayDto> = {
    '2026-06-01': { status: 'completed', delivered: 5, leaves: 0, revenue: '250.00' },
  }

  it('makes populated days interactive (keyed by YYYY-MM-DD) and fires onSelectDay', async () => {
    const onSelect = jest.fn()
    const screen = await render(
      <CalendarMonthGrid month="2026-06" days={days} onSelectDay={onSelect} testID="grid" />,
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('grid-day-2026-06-01'))
    })
    expect(onSelect).toHaveBeenCalledWith('2026-06-01')
  })

  it('does not render a button for an empty day', async () => {
    const onSelect = jest.fn()
    const screen = await render(
      <CalendarMonthGrid month="2026-06" days={days} onSelectDay={onSelect} testID="grid" />,
    )
    expect(screen.queryByTestId('grid-day-2026-06-15')).toBeNull()
  })
})
