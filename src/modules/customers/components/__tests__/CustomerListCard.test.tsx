/**
 * CustomerListCard tests — renders customer info, null-guards financial fields (staff),
 * fires onPress with customerId.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { CustomerListCard } from '../CustomerListCard'
import { t } from '@locales/index'
import type { CustomerListItemDto } from '../../../../types/customer'

function buildCustomer(overrides: Partial<CustomerListItemDto> = {}): CustomerListItemDto {
  return {
    id: 'c1',
    name: 'Anita Sharma',
    phoneNumber: '9876543210',
    address: '12 MG Road',
    area: 'Sector 15',
    customerSince: '2024-01-01',
    status: 'ACTIVE',
    supplyLists: ['Morning Milk', 'Evening Curd'],
    monthlyTotal: 500,
    paymentStatus: 'paid',
    currentBalance: 0,
    paymentScore: 90,
    ...overrides,
  }
}

describe('CustomerListCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders name and phone number', async () => {
    const screen = await render(
      <CustomerListCard customer={buildCustomer()} onPress={jest.fn()} />,
    )
    expect(screen.getByText('Anita Sharma')).toBeTruthy()
    expect(screen.getByText('9876543210')).toBeTruthy()
  })

  it('renders joined supply-list names', async () => {
    const screen = await render(
      <CustomerListCard customer={buildCustomer()} onPress={jest.fn()} />,
    )
    expect(screen.getByText('Morning Milk, Evening Curd')).toBeTruthy()
  })

  it('renders payment status badge when paymentStatus is non-null (owner)', async () => {
    const screen = await render(
      <CustomerListCard customer={buildCustomer({ paymentStatus: 'paid' })} onPress={jest.fn()} />,
    )
    expect(screen.getByText(t('customer.status_paid'))).toBeTruthy()
  })

  it('hides payment status badge when paymentStatus is null (staff)', async () => {
    const screen = await render(
      <CustomerListCard
        customer={buildCustomer({ paymentStatus: null })}
        onPress={jest.fn()}
      />,
    )
    expect(screen.queryByText(t('customer.status_paid'))).toBeNull()
    expect(screen.queryByText(t('customer.status_pending'))).toBeNull()
    expect(screen.queryByText(t('customer.status_overdue'))).toBeNull()
  })

  it('shows monthly total when non-null (owner)', async () => {
    const screen = await render(
      <CustomerListCard customer={buildCustomer({ monthlyTotal: 1200 })} onPress={jest.fn()} />,
    )
    // The currency amount is rendered within the card — assert it is visible
    expect(screen.getByText(/1,200/)).toBeTruthy()
  })

  it('hides monthly total when null (staff)', async () => {
    const screen = await render(
      <CustomerListCard customer={buildCustomer({ monthlyTotal: null })} onPress={jest.fn()} />,
    )
    expect(screen.queryByText(/1,200/)).toBeNull()
  })

  it('fires onPress with customerId and a light haptic on tap', async () => {
    const onPress = jest.fn()
    const screen = await render(
      <CustomerListCard customer={buildCustomer()} onPress={onPress} testID="card" />,
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('card'))
    })
    expect(onPress).toHaveBeenCalledWith('c1')
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })
})
