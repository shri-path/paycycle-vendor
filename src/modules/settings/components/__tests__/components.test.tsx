/**
 * Settings Component Tests (US-011)
 * Tests: ImpactSummaryCard (currency formatting, sign) + NotificationCategorySection (toggles).
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
          key,
        )
      }
      return key
    },
  }),
}))

jest.mock('@hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

import React from 'react'
import { render, act, fireEvent } from '@testing-library/react-native'
import { ImpactSummaryCard } from '../ImpactSummaryCard'
import { NotificationCategorySection } from '../NotificationCategorySection'

// ---------------------------------------------------------------------------
// ImpactSummaryCard
// ---------------------------------------------------------------------------
describe('ImpactSummaryCard', () => {
  const leaveImpact = {
    customersAffected: 28,
    days: 3,
    totalLeaves: 84,
    revenueImpact: -1680,
  }

  const rateImpact = {
    listsAffected: 2,
    customersAffected: 52,
    rateChange: 5,
    monthlyImpact: 7800,
  }

  it('renders leave variant with correct fields', async () => {
    const screen = await act(async () =>
      render(<ImpactSummaryCard variant="leave" leaveImpact={leaveImpact} />),
    )
    expect(screen.getByTestId('impact-summary-leave')).toBeTruthy()
    // Check customer count
    expect(screen.getByText('28')).toBeTruthy()
    // Check days
    expect(screen.getByText('3')).toBeTruthy()
    // Revenue impact with negative sign
    expect(screen.getByText('-₹1,680')).toBeTruthy()
  })

  it('renders loading state', async () => {
    const screen = await act(async () =>
      render(<ImpactSummaryCard variant="leave" isLoading />),
    )
    expect(screen.getByTestId('impact-summary-loading')).toBeTruthy()
  })

  it('renders rate variant with positive monthly impact', async () => {
    const screen = await act(async () =>
      render(<ImpactSummaryCard variant="rate" rateImpact={rateImpact} />),
    )
    expect(screen.getByTestId('impact-summary-rate')).toBeTruthy()
    expect(screen.getByText('+₹7,800')).toBeTruthy()
  })

  it('renders null when variant=leave but leaveImpact not provided', async () => {
    const screen = await act(async () =>
      render(<ImpactSummaryCard variant="leave" />),
    )
    expect(screen.toJSON()).toBeNull()
  })

  it('formats negative revenue with minus sign', async () => {
    const screen = await act(async () =>
      render(<ImpactSummaryCard variant="leave" leaveImpact={{ ...leaveImpact, revenueImpact: -5000 }} />),
    )
    expect(screen.getByText('-₹5,000')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// NotificationCategorySection
// ---------------------------------------------------------------------------
describe('NotificationCategorySection', () => {
  const items = [
    { key: 'push', label: 'Push Notifications', value: true },
    { key: 'whatsapp', label: 'WhatsApp', value: false },
    { key: 'sms', label: 'SMS', value: false },
  ]

  it('renders all toggle items', async () => {
    const screen = await act(async () =>
      render(
        <NotificationCategorySection
          title="Channels"
          items={items}
          onToggle={jest.fn()}
        />,
      ),
    )
    expect(screen.getByText('Channels')).toBeTruthy()
    expect(screen.getByText('Push Notifications')).toBeTruthy()
    expect(screen.getByText('WhatsApp')).toBeTruthy()
    expect(screen.getByText('SMS')).toBeTruthy()
  })

  it('calls onToggle with correct key and new value', async () => {
    const onToggle = jest.fn()
    const screen = await act(async () =>
      render(
        <NotificationCategorySection
          title="Channels"
          items={items}
          onToggle={onToggle}
        />,
      ),
    )
    // Press the WhatsApp toggle (value=false, pressing should call onToggle('whatsapp', true))
    fireEvent.press(screen.getByText('WhatsApp'))
    expect(onToggle).toHaveBeenCalledWith('whatsapp', true)
  })

  it('does NOT call onToggle when disabled', async () => {
    const onToggle = jest.fn()
    const screen = await act(async () =>
      render(
        <NotificationCategorySection
          title="Channels"
          items={items}
          disabled
          onToggle={onToggle}
        />,
      ),
    )
    fireEvent.press(screen.getByText('WhatsApp'))
    expect(onToggle).not.toHaveBeenCalled()
  })
})
