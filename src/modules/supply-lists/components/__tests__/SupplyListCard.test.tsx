/**
 * SupplyListCard tests — name/time/frequency badge, default qty@rate, staff names vs
 * "Unassigned", customer count, today progress vs stub-zero "no data yet", long-script
 * name rendering, and tap callback + haptic. Assertions use i18n keys + testIDs.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MaterialCommunityIcons' }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { SupplyListCard } from '../SupplyListCard'
import { t } from '@locales/index'
import type { SupplyListListDto, TodayStatsDto } from '../../../../types/supplyLists'

const zeroToday: TodayStatsDto = {
  date: '2026-06-11',
  delivered: 0,
  onLeave: 0,
  pending: 0,
  totalQuantity: 0,
}

const baseList: SupplyListListDto = {
  id: 'list-1',
  name: 'Morning Milk',
  supplyType: 'milk',
  unit: 'ltr',
  defaultQuantity: 1,
  defaultRatePerUnit: 60,
  startTime: '06:30',
  frequency: 'DAILY',
  status: 'active',
  assignedStaff: [
    { staffId: 's1', staffName: 'Raju', phoneNumber: null, isPrimary: true },
    { staffId: 's2', staffName: 'Suresh', phoneNumber: null, isPrimary: false },
  ],
  customerCount: 52,
  todayStats: zeroToday,
}

describe('SupplyListCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders name, start time, frequency badge and default qty@rate', async () => {
    const screen = await render(<SupplyListCard list={baseList} onPress={jest.fn()} testID="card" />)
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    expect(screen.getByText('06:30')).toBeTruthy()
    expect(screen.getByText(t('supply.freq_daily'))).toBeTruthy()
    expect(
      screen.getByText(t('supply.default_label', { qty: '1', unit: 'ltr', rate: '60' })),
    ).toBeTruthy()
  })

  it('joins assigned staff names', async () => {
    const screen = await render(<SupplyListCard list={baseList} onPress={jest.fn()} />)
    expect(screen.getByText(t('supply.staff_label', { names: 'Raju, Suresh' }))).toBeTruthy()
  })

  it('shows "Unassigned" when no staff', async () => {
    const screen = await render(
      <SupplyListCard list={{ ...baseList, assignedStaff: [] }} onPress={jest.fn()} />,
    )
    expect(screen.getByText(t('supply.unassigned'))).toBeTruthy()
  })

  it('shows the customer count', async () => {
    const screen = await render(<SupplyListCard list={baseList} onPress={jest.fn()} />)
    expect(screen.getByText(t('supply.customers_count', { count: '52' }))).toBeTruthy()
  })

  it('shows "no data yet" when today stats are stub-zero', async () => {
    const screen = await render(<SupplyListCard list={baseList} onPress={jest.fn()} />)
    expect(screen.getByText(t('supply.no_delivery_data_yet'))).toBeTruthy()
  })

  it('shows today progress when stats are present', async () => {
    const list = { ...baseList, todayStats: { ...zeroToday, delivered: 45, pending: 7 } }
    const screen = await render(<SupplyListCard list={list} onPress={jest.fn()} />)
    expect(
      screen.getByText(t('supply.today_progress', { done: '45', total: '52' })),
    ).toBeTruthy()
  })

  it('renders a long-script (Malayalam) name without crashing', async () => {
    const list = { ...baseList, name: 'പ്രഭാത പാൽ — സെക്ടർ പതിനഞ്ച്' }
    const screen = await render(<SupplyListCard list={list} onPress={jest.fn()} />)
    expect(screen.getByText(list.name)).toBeTruthy()
  })

  it('fires onPress with listId and a light haptic on tap', async () => {
    const onPress = jest.fn()
    const screen = await render(<SupplyListCard list={baseList} onPress={onPress} testID="card" />)
    fireEvent.press(screen.getByTestId('card'))
    expect(onPress).toHaveBeenCalledWith('list-1')
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })

  it('hides the progress bar label text when showProgress is false', async () => {
    const screen = await render(
      <SupplyListCard list={baseList} onPress={jest.fn()} showProgress={false} />,
    )
    expect(screen.queryByText(t('supply.no_delivery_data_yet'))).toBeNull()
  })
})
