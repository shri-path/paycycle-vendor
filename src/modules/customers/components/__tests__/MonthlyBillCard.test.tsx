/**
 * MonthlyBillCard tests — renders summary from CurrentMonthBillSummary;
 * renders per-list lines from MonthlyBillDto; returns null when both are null;
 * shows payment status badge.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { MonthlyBillCard } from '../MonthlyBillCard'
import { t } from '@locales/index'
import type { MonthlyBillDto, CurrentMonthBillSummary } from '../../../../types/customer'

const mockSummary: CurrentMonthBillSummary = {
  month: '2024-06',
  subtotal: 1800,
  previousDue: 200,
  totalDue: 2000,
  status: 'pending',
}

const mockBill: MonthlyBillDto = {
  customerId: 'c1',
  customerName: 'Test Customer',
  month: '2024-06',
  billDetails: {
    byList: [
      {
        listName: 'Morning Milk',
        deliveries: 28,
        leaves: 2,
        quantity: 2,
        unit: 'ltr',
        ratePerUnit: 30,
        subtotal: 1680,
      },
    ],
    extraCharges: [
      {
        date: '2024-06-10',
        amount: 120,
        reason: 'Extra delivery',
        listName: 'Morning Milk',
      },
    ],
    subtotal: 1800,
    previousDue: 200,
    totalDue: 2000,
  },
  paymentStatus: 'pending',
}

describe('MonthlyBillCard', () => {
  it('returns null when both bill and summary are null', async () => {
    const screen = await render(<MonthlyBillCard bill={null} summary={null} />)
    expect(screen.queryByText(t('customer.section_month_summary'))).toBeNull()
  })

  it('renders totals from summary when bill is null', async () => {
    const screen = await render(<MonthlyBillCard bill={null} summary={mockSummary} />)
    // section_month_summary and this_month both translate to "This Month" in en locale
    const thisMonthElements = screen.getAllByText(t('customer.this_month'))
    expect(thisMonthElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(t('customer.previous_due'))).toBeTruthy()
    expect(screen.getByText(t('customer.total_due'))).toBeTruthy()
  })

  it('renders payment status badge from summary', async () => {
    const screen = await render(<MonthlyBillCard bill={null} summary={mockSummary} />)
    expect(screen.getByText(t('customer.status_pending'))).toBeTruthy()
  })

  it('renders per-list breakdown lines when bill is present', async () => {
    const screen = await render(<MonthlyBillCard bill={mockBill} summary={null} />)
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    expect(screen.getByText(/28 deliveries/)).toBeTruthy()
  })

  it('renders extra charges when bill is present', async () => {
    const screen = await render(<MonthlyBillCard bill={mockBill} summary={null} />)
    expect(screen.getByText(/Extra delivery/)).toBeTruthy()
  })

  it('renders totals from bill when bill is present', async () => {
    const screen = await render(<MonthlyBillCard bill={mockBill} summary={null} />)
    expect(screen.getByText(t('customer.total_due'))).toBeTruthy()
    expect(screen.getByText(t('customer.status_pending'))).toBeTruthy()
  })
})
