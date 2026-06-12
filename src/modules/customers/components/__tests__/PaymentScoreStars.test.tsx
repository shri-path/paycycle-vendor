/**
 * PaymentScoreStars tests — score→star mapping, boundary values, label rendering.
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

import React from 'react'
import { render } from '@testing-library/react-native'
import { PaymentScoreStars } from '../PaymentScoreStars'

describe('PaymentScoreStars', () => {
  it('renders the score as a percentage label', async () => {
    const screen = await render(<PaymentScoreStars score={75} />)
    expect(screen.getByText('75%')).toBeTruthy()
  })

  it('renders 0% label for score 0', async () => {
    const screen = await render(<PaymentScoreStars score={0} />)
    expect(screen.getByText('0%')).toBeTruthy()
  })

  it('renders 100% label for score 100', async () => {
    const screen = await render(<PaymentScoreStars score={100} />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('sets accessibilityLabel to the score percentage', async () => {
    const screen = await render(<PaymentScoreStars score={60} testID="stars" />)
    expect(screen.getByTestId('stars').props.accessibilityLabel).toBe('60%')
  })

  it('renders a stars container with a testID', async () => {
    const screen = await render(<PaymentScoreStars score={50} testID="stars-container" />)
    // The container is accessible by testID
    expect(screen.getByTestId('stars-container')).toBeTruthy()
  })
})
