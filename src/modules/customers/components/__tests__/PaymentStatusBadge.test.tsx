/**
 * PaymentStatusBadge tests — badge variant mapping for all three statuses.
 * Assertions are locale-independent (use the t() helper to resolve keys).
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { PaymentStatusBadge } from '../PaymentStatusBadge'
import { t } from '@locales/index'
import type { PaymentStatus } from '../../../../types/customer'

describe('PaymentStatusBadge', () => {
  const cases: { status: PaymentStatus; key: string }[] = [
    { status: 'paid', key: 'customer.status_paid' },
    { status: 'pending', key: 'customer.status_pending' },
    { status: 'overdue', key: 'customer.status_overdue' },
  ]

  cases.forEach(({ status, key }) => {
    it(`renders "${status}" label correctly`, async () => {
      const screen = await render(<PaymentStatusBadge status={status} />)
      expect(screen.getByText(t(key))).toBeTruthy()
    })
  })
})
