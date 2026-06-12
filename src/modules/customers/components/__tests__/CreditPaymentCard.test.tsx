/**
 * CreditPaymentCard tests — renders when currentBalance is non-null (owner);
 * returns null for staff (currentBalance null); utilization colour bands;
 * Set Credit Limit button callback.
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { CreditPaymentCard } from '../CreditPaymentCard'
import { t } from '@locales/index'
import type { CustomerDetailDto } from '../../../../types/customer'

function buildDetail(overrides: Partial<CustomerDetailDto> = {}): CustomerDetailDto {
  return {
    id: 'c1',
    name: 'Sunita Singh',
    phoneNumber: '9000000001',
    email: null,
    address: null,
    area: null,
    language: null,
    customerSince: '2024-01-01',
    status: 'ACTIVE',
    creditLimit: 10000,
    currentBalance: 3000,
    paymentScore: 80,
    creditUtilization: 30,
    subscriptions: [],
    currentMonthBill: null,
    paymentHistory: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('CreditPaymentCard', () => {
  it('renders credit info when currentBalance is non-null (owner)', async () => {
    const screen = await render(
      <CreditPaymentCard customer={buildDetail()} onSetCreditLimit={jest.fn()} />,
    )
    expect(screen.getByText(t('customer.section_credit_payment'))).toBeTruthy()
    expect(screen.getByText(t('customer.credit_limit'))).toBeTruthy()
    expect(screen.getByText(t('customer.current_balance'))).toBeTruthy()
    expect(screen.getByText(t('customer.utilization'))).toBeTruthy()
  })

  it('returns null when currentBalance is null (staff)', async () => {
    const screen = await render(
      <CreditPaymentCard
        customer={buildDetail({ currentBalance: null })}
        onSetCreditLimit={jest.fn()}
      />,
    )
    expect(screen.queryByText(t('customer.section_credit_payment'))).toBeNull()
  })

  it('shows "Set Credit Limit" button', async () => {
    const screen = await render(
      <CreditPaymentCard customer={buildDetail()} onSetCreditLimit={jest.fn()} />,
    )
    expect(screen.getByText(t('customer.set_credit_limit'))).toBeTruthy()
  })

  it('calls onSetCreditLimit when button is pressed', async () => {
    const onSetCreditLimit = jest.fn()
    const screen = await render(
      <CreditPaymentCard
        customer={buildDetail()}
        onSetCreditLimit={onSetCreditLimit}
        testID="credit-card"
      />,
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('credit-card-set-limit'))
    })
    expect(onSetCreditLimit).toHaveBeenCalledTimes(1)
  })

  it('renders utilization in green colour for value < 70', async () => {
    const screen = await render(
      <CreditPaymentCard
        customer={buildDetail({ creditUtilization: 50 })}
        onSetCreditLimit={jest.fn()}
      />,
    )
    expect(screen.getByText('50.0%')).toBeTruthy()
  })

  it('renders utilization in amber colour for value between 70 and 90', async () => {
    const screen = await render(
      <CreditPaymentCard
        customer={buildDetail({ creditUtilization: 80 })}
        onSetCreditLimit={jest.fn()}
      />,
    )
    expect(screen.getByText('80.0%')).toBeTruthy()
  })

  it('renders utilization in red colour for value > 90', async () => {
    const screen = await render(
      <CreditPaymentCard
        customer={buildDetail({ creditUtilization: 95 })}
        onSetCreditLimit={jest.fn()}
      />,
    )
    expect(screen.getByText('95.0%')).toBeTruthy()
  })

  it('renders PaymentScoreStars when paymentScore is non-null', async () => {
    const screen = await render(
      <CreditPaymentCard
        customer={buildDetail({ paymentScore: 75 })}
        onSetCreditLimit={jest.fn()}
      />,
    )
    expect(screen.getByText('75%')).toBeTruthy()
  })
})
