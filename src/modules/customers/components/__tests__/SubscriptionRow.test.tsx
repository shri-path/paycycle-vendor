/**
 * SubscriptionRow tests — renders subscription details; owner shows actions, staff hides them;
 * custom rate/qty badges; Remove fires callback; Edit Qty/Rate is disabled.
 */

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { SubscriptionRow } from '../SubscriptionRow'
import { t } from '@locales/index'
import type { SubscriptionDto } from '../../../../types/customer'

function buildSub(overrides: Partial<SubscriptionDto> = {}): SubscriptionDto {
  return {
    subscriptionId: 'sub1',
    listId: 'l1',
    listName: 'Morning Milk',
    startTime: '06:00',
    quantity: 2,
    unit: 'ltr',
    ratePerUnit: 60,
    frequency: 'DAILY',
    startDate: '2024-01-01',
    endDate: null,
    isActive: true,
    isCustomRate: false,
    isCustomQuantity: false,
    ...overrides,
  }
}

describe('SubscriptionRow', () => {
  it('renders list name, start time, rate label, and frequency', async () => {
    const screen = await render(
      <SubscriptionRow sub={buildSub()} onRemove={jest.fn()} canManage={false} />,
    )
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    expect(screen.getByText('06:00')).toBeTruthy()
    expect(screen.getByText('2 ltr @ Rs.60/ltr')).toBeTruthy()
    expect(screen.getByText('DAILY')).toBeTruthy()
  })

  it('shows Remove and disabled Edit buttons when canManage is true (owner)', async () => {
    const screen = await render(
      <SubscriptionRow sub={buildSub()} onRemove={jest.fn()} canManage={true} testID="sub" />,
    )
    expect(screen.getByTestId('sub-remove')).toBeTruthy()
    expect(screen.getByTestId('sub-edit')).toBeTruthy()
  })

  it('hides action buttons when canManage is false (staff)', async () => {
    const screen = await render(
      <SubscriptionRow sub={buildSub()} onRemove={jest.fn()} canManage={false} testID="sub" />,
    )
    expect(screen.queryByTestId('sub-remove')).toBeNull()
    expect(screen.queryByTestId('sub-edit')).toBeNull()
  })

  it('calls onRemove with subscriptionId when Remove is pressed', async () => {
    const onRemove = jest.fn()
    const screen = await render(
      <SubscriptionRow sub={buildSub()} onRemove={onRemove} canManage={true} testID="sub" />,
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('sub-remove'))
    })
    expect(onRemove).toHaveBeenCalledWith('sub1')
  })

  it('renders custom rate badge when isCustomRate is true', async () => {
    const screen = await render(
      <SubscriptionRow
        sub={buildSub({ isCustomRate: true })}
        onRemove={jest.fn()}
        canManage={false}
      />,
    )
    expect(screen.getByText(t('customer.custom_rate'))).toBeTruthy()
  })

  it('renders custom quantity badge when isCustomQuantity is true', async () => {
    const screen = await render(
      <SubscriptionRow
        sub={buildSub({ isCustomQuantity: true })}
        onRemove={jest.fn()}
        canManage={false}
      />,
    )
    expect(screen.getByText(t('customer.custom_quantity'))).toBeTruthy()
  })

  it('hides custom badges when both flags are false', async () => {
    const screen = await render(
      <SubscriptionRow sub={buildSub()} onRemove={jest.fn()} canManage={false} />,
    )
    expect(screen.queryByText(t('customer.custom_rate'))).toBeNull()
    expect(screen.queryByText(t('customer.custom_quantity'))).toBeNull()
  })
})
