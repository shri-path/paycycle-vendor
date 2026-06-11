/**
 * CustomerCard tests — name, masked phone, qty@rate, custom badge (icon+text), status
 * badge, "since" date, other-lists "+N more" overflow, read-only vs tappable behaviour,
 * and tap callback + haptic. Assertions use i18n keys + testIDs (locale-independent).
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { CustomerCard } from '../CustomerCard'
import { t } from '@locales/index'
import { maskPhone } from '@utils/formatters'
import type { SubscriptionDto } from '../../../../types/supplyLists'

const baseSub: SubscriptionDto = {
  subscriptionId: 'sub-1',
  customerId: 'cust-1',
  customerName: 'Anita Sharma',
  phoneNumber: '+919876500011',
  address: 'A-101',
  quantity: 1,
  ratePerUnit: 60,
  amount: 60,
  isCustomQuantity: false,
  isCustomRate: false,
  startDate: '2026-05-01',
  status: 'active',
  otherLists: [],
  otherListsCount: 0,
}

describe('CustomerCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders name, masked phone, qty@rate and the active status badge', async () => {
    const screen = await render(<CustomerCard subscription={baseSub} unit="ltr" testID="card" />)
    expect(screen.getByText('Anita Sharma')).toBeTruthy()
    expect(screen.getByText(maskPhone('+919876500011'))).toBeTruthy()
    expect(
      screen.getByText(t('supply.amount_label', { qty: '1', unit: 'ltr', rate: '60' })),
    ).toBeTruthy()
    expect(screen.getByText(t('supply.status_active'))).toBeTruthy()
  })

  it('does not render the full unmasked phone number (PII protection)', async () => {
    const screen = await render(<CustomerCard subscription={baseSub} unit="ltr" />)
    expect(screen.queryByText('+919876500011')).toBeNull()
  })

  it('shows the Custom badge when quantity or rate is overridden', async () => {
    const sub = { ...baseSub, isCustomRate: true }
    const screen = await render(<CustomerCard subscription={sub} unit="ltr" />)
    expect(screen.getByText(t('supply.custom_badge'))).toBeTruthy()
  })

  it('hides the Custom badge when neither qty nor rate is custom', async () => {
    const screen = await render(<CustomerCard subscription={baseSub} unit="ltr" />)
    expect(screen.queryByText(t('supply.custom_badge'))).toBeNull()
  })

  it('shows the paused and ended status badges', async () => {
    const paused = await render(<CustomerCard subscription={{ ...baseSub, status: 'paused' }} unit="ltr" />)
    expect(paused.getByText(t('supply.status_paused'))).toBeTruthy()
    const ended = await render(<CustomerCard subscription={{ ...baseSub, status: 'ended' }} unit="ltr" />)
    expect(ended.getByText(t('supply.status_ended'))).toBeTruthy()
  })

  it('renders "+N more" when other lists exceed maxOtherLists', async () => {
    const sub = {
      ...baseSub,
      otherLists: ['Bread', 'Newspaper', 'Water'],
      otherListsCount: 3,
    }
    const screen = await render(<CustomerCard subscription={sub} unit="ltr" />)
    expect(
      screen.getByText(t('supply.other_lists_more', { names: 'Bread, Newspaper', count: '1' })),
    ).toBeTruthy()
  })

  it('lists other lists without overflow when they fit', async () => {
    const sub = { ...baseSub, otherLists: ['Bread'], otherListsCount: 1 }
    const screen = await render(<CustomerCard subscription={sub} unit="ltr" />)
    expect(screen.getByText('Bread')).toBeTruthy()
  })

  it('shows the since date', async () => {
    const screen = await render(<CustomerCard subscription={baseSub} unit="ltr" />)
    expect(screen.getByText(t('supply.since_date', { date: '2026-05-01' }))).toBeTruthy()
  })

  it('falls back to "Unnamed customer" when name is null', async () => {
    const screen = await render(<CustomerCard subscription={{ ...baseSub, customerName: null }} unit="ltr" />)
    expect(screen.getByText(t('supply.unnamed_customer'))).toBeTruthy()
  })

  it('fires onPress with subscriptionId and a light haptic when tappable', async () => {
    const onPress = jest.fn()
    const screen = await render(
      <CustomerCard subscription={baseSub} unit="ltr" onPress={onPress} testID="card" />,
    )
    fireEvent.press(screen.getByTestId('card'))
    expect(onPress).toHaveBeenCalledWith('sub-1')
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })

  it('does not fire haptic when read-only (no onPress)', async () => {
    const screen = await render(<CustomerCard subscription={baseSub} unit="ltr" testID="card" />)
    fireEvent.press(screen.getByTestId('card'))
    expect(Haptics.impactAsync).not.toHaveBeenCalled()
  })
})
