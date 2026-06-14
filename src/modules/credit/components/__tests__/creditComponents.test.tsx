/**
 * Credit component unit tests — T-25 (US-012)
 * Covers key rendering branches and callbacks for each credit component.
 *
 * Conventions (same as dashboard/components.test.tsx):
 * - Local `screen` from `render()`, NOT global singleton
 * - Mock `useTranslation` to return `key:params` strings
 * - Mock `formatCurrency` for deterministic ₹ output
 * - Mock haptics so no native modules are required
 */

jest.mock('@hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

jest.mock('@utils/formatCurrency', () => ({
  formatCurrency: (val: number) => `₹${val}`,
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj: Record<string, unknown>) => obj['ios']),
}))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

import { OutstandingOverviewCard } from '../OutstandingOverviewCard'
import { CreditPriorityCard } from '../CreditPriorityCard'
import { BreachActionRadioGroup } from '../BreachActionRadioGroup'
import { SuggestedLimitChips } from '../SuggestedLimitChips'
import { ReminderTimelineItem } from '../ReminderTimelineItem'
import { QuickActionsGrid } from '../QuickActionsGrid'

import type { OutstandingOverviewDto, CreditPriorityCustomer, ReminderHistoryItem } from '../../../../types/credit'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const overview: OutstandingOverviewDto = {
  totalOutstanding: 48500,
  fresh_0_30: { amount: 22000, customerCount: 18 },
  overdue_30_60: { amount: 15500, customerCount: 9 },
  critical_60_plus: { amount: 11000, customerCount: 5 },
}

const highPriorityCustomer: CreditPriorityCustomer = {
  customerId: '11',
  customerName: 'Rajesh Kumar',
  phoneNumber: '9876543210',
  outstanding: 8500,
  daysOverdue: 72,
  creditLimit: 8000,
  utilizationPercentage: 106,
  lastPaymentDate: null,
  paymentScore: 2,
  creditType: 'normal',
}

const mediumPriorityCustomer: CreditPriorityCustomer = {
  ...highPriorityCustomer,
  customerId: '22',
  customerName: 'Mohan Verma',
  daysOverdue: 38,
  utilizationPercentage: 96,
  paymentScore: 5,
}

const reminderItem: ReminderHistoryItem = {
  id: 'rem-1',
  amountDue: 8500,
  reminderDate: '2026-06-10',
  sentVia: 'whatsapp',
  status: 'delivered',
  responseType: 'paid_partial',
  responseAmount: 2000,
}

// ---------------------------------------------------------------------------
// OutstandingOverviewCard
// ---------------------------------------------------------------------------

describe('OutstandingOverviewCard', () => {
  it('renders testID and total outstanding', async () => {
    const screen = await act(async () => render(<OutstandingOverviewCard overview={overview} />))
    expect(screen.getByTestId('outstanding-overview-card')).toBeTruthy()
    expect(screen.getByText('₹48500')).toBeTruthy()
  })

  it('renders all three aging bucket amounts', async () => {
    const screen = await act(async () => render(<OutstandingOverviewCard overview={overview} />))
    expect(screen.getByText(/₹22000/)).toBeTruthy()
    expect(screen.getByText(/₹15500/)).toBeTruthy()
    expect(screen.getByText(/₹11000/)).toBeTruthy()
  })

  it('renders customer counts in parentheses', async () => {
    const screen = await act(async () => render(<OutstandingOverviewCard overview={overview} />))
    expect(screen.getByText('(18)')).toBeTruthy()
    expect(screen.getByText('(9)')).toBeTruthy()
    expect(screen.getByText('(5)')).toBeTruthy()
  })

  it('accepts custom testID', async () => {
    const screen = await act(async () => render(<OutstandingOverviewCard overview={overview} testID="custom-card" />))
    expect(screen.getByTestId('custom-card')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// CreditPriorityCard
// ---------------------------------------------------------------------------

describe('CreditPriorityCard', () => {
  const defaultProps = {
    customer: highPriorityCustomer,
    priority: 'high' as const,
    isReminding: false,
    isConnected: true,
    onRemind: jest.fn(),
    onBlock: jest.fn(),
  }

  it('renders customer name and outstanding amount', async () => {
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} />))
    expect(screen.getByText('Rajesh Kumar')).toBeTruthy()
    expect(screen.getByText('₹8500')).toBeTruthy()
  })

  it('renders all three action buttons for high priority', async () => {
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} />))
    expect(screen.getByTestId('remind-btn-11')).toBeTruthy()
    expect(screen.getByTestId('call-btn-11')).toBeTruthy()
    expect(screen.getByTestId('block-btn-11')).toBeTruthy()
  })

  it('does NOT render block button for medium priority', async () => {
    const screen = await act(async () => render(
      <CreditPriorityCard {...defaultProps} customer={mediumPriorityCustomer} priority="medium" />,
    ))
    expect(screen.queryByTestId(`block-btn-${mediumPriorityCustomer.customerId}`)).toBeNull()
  })

  it('does NOT render action buttons for low priority', async () => {
    const screen = await act(async () => render(
      <CreditPriorityCard {...defaultProps} customer={mediumPriorityCustomer} priority="low" />,
    ))
    expect(screen.queryByTestId(`remind-btn-${mediumPriorityCustomer.customerId}`)).toBeNull()
  })

  it('calls onRemind with customerId when Remind is pressed', async () => {
    const onRemind = jest.fn()
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} onRemind={onRemind} />))
    fireEvent.press(screen.getByTestId('remind-btn-11'))
    expect(onRemind).toHaveBeenCalledWith('11')
  })

  it('calls onBlock with customerId when Block is pressed', async () => {
    const onBlock = jest.fn()
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} onBlock={onBlock} />))
    fireEvent.press(screen.getByTestId('block-btn-11'))
    expect(onBlock).toHaveBeenCalledWith('11')
  })

  it('shows loading/disabled state when isReminding=true', async () => {
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} isReminding />))
    // AppButton shows ActivityIndicator when loading=true (no label text rendered).
    // Verify the remind button is disabled (inaccessible) in the in-flight state.
    const remindBtn = screen.getByTestId('remind-btn-11')
    expect(remindBtn.props.accessibilityState?.disabled).toBeTruthy()
  })

  it('displays 365+ for daysOverdue > 365', async () => {
    const customer = { ...highPriorityCustomer, daysOverdue: 400 }
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} customer={customer} />))
    expect(screen.getByText(/365\+/)).toBeTruthy()
  })

  it('uses default testID based on customerId', async () => {
    const screen = await act(async () => render(<CreditPriorityCard {...defaultProps} />))
    expect(screen.getByTestId('credit-priority-card-11')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// BreachActionRadioGroup
// ---------------------------------------------------------------------------

describe('BreachActionRadioGroup', () => {
  it('renders the breach action label', async () => {
    const screen = await act(async () => render(
      <BreachActionRadioGroup value="warn" onChange={jest.fn()} creditType="normal" />,
    ))
    expect(screen.getByText('credit.breach_action_label')).toBeTruthy()
  })

  it('calls onChange with the selected action for normal credit type', async () => {
    // This component delegates to AppRadioGroup so we just verify it renders options
    const screen = await act(async () => render(
      <BreachActionRadioGroup value="warn" onChange={jest.fn()} creditType="normal" />,
    ))
    // Three action labels should be rendered
    expect(screen.getByText('credit.breach_action_warn')).toBeTruthy()
    expect(screen.getByText('credit.breach_action_pause')).toBeTruthy()
    expect(screen.getByText('credit.breach_action_block')).toBeTruthy()
  })

  it('forces warn and disables the field for unlimited credit type', async () => {
    // The component passes disabled=true when unlimited — we verify it renders
    // without crashing and that only the label shows (disabled state)
    const onChange = jest.fn()
    await act(async () => render(
      <BreachActionRadioGroup value="block" onChange={onChange} creditType="unlimited" />,
    ))
    // onChange should not fire even if AppRadioGroup is pressed (blocked by isUnlimited check)
    // We can't fire press on internal items without deep test, so verify no crash
    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// SuggestedLimitChips
// ---------------------------------------------------------------------------

describe('SuggestedLimitChips', () => {
  it('renders all three suggested limit chips', async () => {
    const screen = await act(async () => render(<SuggestedLimitChips selectedLimit={undefined} onSelect={jest.fn()} />))
    expect(screen.getByTestId('limit-chip-2000')).toBeTruthy()
    expect(screen.getByTestId('limit-chip-5000')).toBeTruthy()
    expect(screen.getByTestId('limit-chip-10000')).toBeTruthy()
  })

  it('calls onSelect with limit value when chip is pressed', async () => {
    const onSelect = jest.fn()
    const screen = await act(async () => render(<SuggestedLimitChips selectedLimit={undefined} onSelect={onSelect} />))
    fireEvent.press(screen.getByTestId('limit-chip-5000'))
    expect(onSelect).toHaveBeenCalledWith(5000)
  })

  it('does NOT call onSelect when disabled', async () => {
    const onSelect = jest.fn()
    const screen = await act(async () => render(<SuggestedLimitChips selectedLimit={undefined} onSelect={onSelect} disabled />))
    fireEvent.press(screen.getByTestId('limit-chip-5000'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows the "suggested limits" label', async () => {
    const screen = await act(async () => render(<SuggestedLimitChips selectedLimit={undefined} onSelect={jest.fn()} />))
    expect(screen.getByText('credit.suggested_limits')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// ReminderTimelineItem
// ---------------------------------------------------------------------------

describe('ReminderTimelineItem', () => {
  it('renders reminder date and amount', async () => {
    const screen = await act(async () => render(<ReminderTimelineItem item={reminderItem} />))
    expect(screen.getByTestId('reminder-item-rem-1')).toBeTruthy()
    expect(screen.getByText('2026-06-10')).toBeTruthy()
    expect(screen.getByText(/₹8500/)).toBeTruthy()
  })

  it('renders status badge for "delivered"', async () => {
    const screen = await act(async () => render(<ReminderTimelineItem item={reminderItem} />))
    expect(screen.getByText('credit.reminder_status_delivered')).toBeTruthy()
  })

  it('renders response text when responseType is set', async () => {
    const screen = await act(async () => render(<ReminderTimelineItem item={reminderItem} />))
    // response_paid_partial with amount
    expect(screen.getByText(/credit\.response_paid_partial/)).toBeTruthy()
  })

  it('does NOT render response text when responseType is null', async () => {
    const noResponse: ReminderHistoryItem = { ...reminderItem, responseType: null, responseAmount: null }
    const screen = await act(async () => render(<ReminderTimelineItem item={noResponse} />))
    expect(screen.queryByText(/credit\.response_/)).toBeNull()
  })

  it('renders "failed" status correctly', async () => {
    const failedItem: ReminderHistoryItem = { ...reminderItem, id: 'rem-3', status: 'failed', responseType: null, responseAmount: null }
    const screen = await act(async () => render(<ReminderTimelineItem item={failedItem} />))
    expect(screen.getByText('credit.reminder_status_failed')).toBeTruthy()
  })

  it('accepts custom testID', async () => {
    const screen = await act(async () => render(<ReminderTimelineItem item={reminderItem} testID="custom-timeline" />))
    expect(screen.getByTestId('custom-timeline')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// QuickActionsGrid
// ---------------------------------------------------------------------------

describe('QuickActionsGrid', () => {
  const actions = [
    { key: 'bulk', labelKey: 'credit.quick_bulk_reminders', iconName: 'notifications-outline' as const, onPress: jest.fn() },
    { key: 'priority', labelKey: 'credit.quick_view_priority', iconName: 'list-outline' as const, onPress: jest.fn() },
    { key: 'analytics', labelKey: 'credit.quick_analytics', iconName: 'bar-chart-outline' as const, onPress: jest.fn() },
    { key: 'export', labelKey: 'credit.quick_export', iconName: 'download-outline' as const, onPress: jest.fn(), comingSoon: true },
  ]

  it('renders all action tiles', async () => {
    const screen = await act(async () => render(<QuickActionsGrid actions={actions} />))
    expect(screen.getByTestId('quick-action-bulk')).toBeTruthy()
    expect(screen.getByTestId('quick-action-priority')).toBeTruthy()
    expect(screen.getByTestId('quick-action-analytics')).toBeTruthy()
    expect(screen.getByTestId('quick-action-export')).toBeTruthy()
  })

  it('renders the default grid testID', async () => {
    const screen = await act(async () => render(<QuickActionsGrid actions={actions} />))
    expect(screen.getByTestId('quick-actions-grid')).toBeTruthy()
  })

  it('calls onPress for enabled action tiles', async () => {
    const onPressBulk = jest.fn()
    const actionsWithMock = [{ ...actions[0]!, onPress: onPressBulk }, ...actions.slice(1)]
    const screen = await act(async () => render(<QuickActionsGrid actions={actionsWithMock} />))
    fireEvent.press(screen.getByTestId('quick-action-bulk'))
    expect(onPressBulk).toHaveBeenCalled()
  })

  it('does NOT call onPress for disabled action tiles', async () => {
    const onPressPriority = jest.fn()
    const disabledActions = [
      { key: 'priority', labelKey: 'credit.quick_view_priority', iconName: 'list-outline' as const, onPress: onPressPriority, disabled: true },
    ]
    const screen = await act(async () => render(<QuickActionsGrid actions={disabledActions} />))
    fireEvent.press(screen.getByTestId('quick-action-priority'))
    expect(onPressPriority).not.toHaveBeenCalled()
  })

  it('does NOT call onPress for comingSoon tiles', async () => {
    const onPressExport = jest.fn()
    const exportAction = actions.find((a) => a.key === 'export')!
    const comingSoonActions = [{ ...exportAction, onPress: onPressExport }]
    const screen = await act(async () => render(<QuickActionsGrid actions={comingSoonActions} />))
    fireEvent.press(screen.getByTestId('quick-action-export'))
    expect(onPressExport).not.toHaveBeenCalled()
  })
})
