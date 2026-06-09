/**
 * SupplyListMultiSelect tests — loading skeleton, empty state, selection toggle,
 * reflects current selection.
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
import { SupplyListMultiSelect } from '../SupplyListMultiSelect'
import { t } from '@locales/index'
import type { SupplyListOptionDto } from '../../../../types/roles'

const options: SupplyListOptionDto[] = [
  { listId: 'l1', name: 'Morning Milk' },
  { listId: 'l2', name: 'Morning Bread' },
]

describe('SupplyListMultiSelect', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows a loading skeleton when isLoading', async () => {
    const screen = await render(
      <SupplyListMultiSelect options={[]} value={[]} onChange={jest.fn()} isLoading testID="ms" />,
    )
    expect(screen.getByTestId('ms-loading')).toBeTruthy()
  })

  it('shows the empty note when there are no options', async () => {
    const screen = await render(<SupplyListMultiSelect options={[]} value={[]} onChange={jest.fn()} testID="ms" />)
    expect(screen.getByText(t('roles.no_supply_lists'))).toBeTruthy()
  })

  it('renders option labels', async () => {
    const screen = await render(<SupplyListMultiSelect options={options} value={[]} onChange={jest.fn()} />)
    expect(screen.getByText('Morning Milk')).toBeTruthy()
    expect(screen.getByText('Morning Bread')).toBeTruthy()
  })

  it('adds a listId on select and fires a haptic', async () => {
    const onChange = jest.fn()
    const screen = await render(
      <SupplyListMultiSelect options={options} value={[]} onChange={onChange} testID="ms" />,
    )
    fireEvent.press(screen.getByTestId('ms-l1'))
    expect(onChange).toHaveBeenCalledWith(['l1'])
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })

  it('removes a listId when an already-selected row is toggled', async () => {
    const onChange = jest.fn()
    const screen = await render(
      <SupplyListMultiSelect options={options} value={['l1', 'l2']} onChange={onChange} testID="ms" />,
    )
    fireEvent.press(screen.getByTestId('ms-l1'))
    expect(onChange).toHaveBeenCalledWith(['l2'])
  })
})
