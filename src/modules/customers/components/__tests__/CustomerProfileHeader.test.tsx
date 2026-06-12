/**
 * CustomerProfileHeader tests — renders profile fields; null-guards address and language.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { CustomerProfileHeader } from '../CustomerProfileHeader'
import { t } from '@locales/index'
import type { CustomerDetailDto } from '../../../../types/customer'

function buildDetail(overrides: Partial<CustomerDetailDto> = {}): CustomerDetailDto {
  return {
    id: 'c1',
    name: 'Ravi Patel',
    phoneNumber: '9123456789',
    email: null,
    address: '42 Gandhi Road',
    area: 'Borivali',
    language: 'Hindi',
    customerSince: '2023-06-15',
    status: 'ACTIVE',
    creditLimit: 5000,
    currentBalance: null,
    paymentScore: null,
    creditUtilization: null,
    subscriptions: [],
    currentMonthBill: null,
    paymentHistory: [],
    createdAt: '2023-06-15T10:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('CustomerProfileHeader', () => {
  it('renders name and phone number', async () => {
    const screen = await render(<CustomerProfileHeader customer={buildDetail()} />)
    expect(screen.getByText('Ravi Patel')).toBeTruthy()
    expect(screen.getByText('9123456789')).toBeTruthy()
  })

  it('renders address when present', async () => {
    const screen = await render(<CustomerProfileHeader customer={buildDetail()} />)
    expect(screen.getByText('42 Gandhi Road')).toBeTruthy()
  })

  it('hides address when null', async () => {
    const screen = await render(
      <CustomerProfileHeader customer={buildDetail({ address: null })} />,
    )
    expect(screen.queryByText('42 Gandhi Road')).toBeNull()
  })

  it('renders language when present', async () => {
    const screen = await render(<CustomerProfileHeader customer={buildDetail()} />)
    expect(screen.getByText(`${t('customer.language')}: Hindi`)).toBeTruthy()
  })

  it('hides language when null', async () => {
    const screen = await render(
      <CustomerProfileHeader customer={buildDetail({ language: null })} />,
    )
    expect(screen.queryByText(`${t('customer.language')}:`)).toBeNull()
  })

  it('renders customer-since label', async () => {
    const screen = await render(<CustomerProfileHeader customer={buildDetail()} />)
    // The exact formatted date is locale-dependent; assert the key text is present
    const sinceTexts = screen.getAllByText(/customer since/i)
    expect(sinceTexts.length).toBeGreaterThan(0)
  })
})
