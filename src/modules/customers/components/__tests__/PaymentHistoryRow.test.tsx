/**
 * PaymentHistoryRow tests — renders amount, method, date; shows reference when present;
 * hides reference when null.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { PaymentHistoryRow } from '../PaymentHistoryRow'
import { t } from '@locales/index'
import type { PaymentDto } from '../../../../types/customer'

function buildPayment(overrides: Partial<PaymentDto> = {}): PaymentDto {
  return {
    id: 'p1',
    amount: 500,
    date: '2024-06-10',
    method: 'UPI',
    reference: 'UPI-REF-12345',
    createdAt: '2024-06-10T12:00:00Z',
    ...overrides,
  }
}

describe('PaymentHistoryRow', () => {
  it('renders the formatted amount', async () => {
    const screen = await render(<PaymentHistoryRow payment={buildPayment()} />)
    // formatCurrency wraps in INR symbol — just assert it finds something with 500
    expect(screen.getByText(/500/)).toBeTruthy()
  })

  it('renders the payment method label', async () => {
    const screen = await render(<PaymentHistoryRow payment={buildPayment()} />)
    expect(screen.getByText(t('customer.method_upi'))).toBeTruthy()
  })

  it('renders each payment method correctly', async () => {
    const cases = [
      { method: 'CASH' as const, key: 'customer.method_cash' },
      { method: 'ONLINE' as const, key: 'customer.method_online' },
      { method: 'UPI' as const, key: 'customer.method_upi' },
      { method: 'OTHER' as const, key: 'customer.method_other' },
    ]
    for (const { method, key } of cases) {
      const screen = await render(
        <PaymentHistoryRow payment={buildPayment({ method })} />,
      )
      expect(screen.getByText(t(key))).toBeTruthy()
    }
  })

  it('renders reference when present', async () => {
    const screen = await render(<PaymentHistoryRow payment={buildPayment()} />)
    expect(screen.getByText(`${t('customer.field_reference')}: UPI-REF-12345`)).toBeTruthy()
  })

  it('hides reference when null', async () => {
    const screen = await render(
      <PaymentHistoryRow payment={buildPayment({ reference: null })} />,
    )
    expect(screen.queryByText(t('customer.field_reference'))).toBeNull()
  })
})
