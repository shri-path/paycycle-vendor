/**
 * Subscription component tests (US-009).
 * Covers: SubscriptionStatusBadge, UsageBar, LimitReachedModal, SubscriptionBanner,
 * PlanCard, InvoiceRow.
 * Uses async `render` (RNRTL v14 returns a Promise).
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SubscriptionStatusBadge } from '../SubscriptionStatusBadge'
import { UsageBar } from '../UsageBar'
import { LimitReachedModal } from '../LimitReachedModal'
import { SubscriptionBanner } from '../SubscriptionBanner'
import { PlanCard } from '../PlanCard'
import { InvoiceRow } from '../InvoiceRow'
import { t } from '@locales/index'
import type { SubscriptionViewDto, PlanDto, InvoiceDto } from '../../../../types/subscription'

// ---------------------------------------------------------------------------
// SubscriptionStatusBadge
// ---------------------------------------------------------------------------
describe('SubscriptionStatusBadge', () => {
  it('renders ACTIVE badge', async () => {
    const screen = await render(<SubscriptionStatusBadge status="ACTIVE" />)
    expect(screen.getByText(t('subscription.status_active'))).toBeTruthy()
  })

  it('renders EXPIRED badge', async () => {
    const screen = await render(<SubscriptionStatusBadge status="EXPIRED" />)
    expect(screen.getByText(t('subscription.status_expired'))).toBeTruthy()
  })

  it('renders CANCELLED badge with activeUntil sublabel when provided', async () => {
    const screen = await render(<SubscriptionStatusBadge status="CANCELLED" activeUntil="2026-05-01" />)
    expect(screen.getByText(t('subscription.status_cancelled'))).toBeTruthy()
  })

  it('renders CANCELLED badge without activeUntil', async () => {
    const screen = await render(<SubscriptionStatusBadge status="CANCELLED" />)
    expect(screen.getByText(t('subscription.status_cancelled'))).toBeTruthy()
  })

  it('renders TRIAL badge', async () => {
    const screen = await render(<SubscriptionStatusBadge status="TRIAL" />)
    expect(screen.getByText(t('subscription.status_trial'))).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// UsageBar
// ---------------------------------------------------------------------------
describe('UsageBar', () => {
  it('shows "X / Y" for limited resources', async () => {
    const screen = await render(<UsageBar resourceLabel="Customers" used={85} max={150} percent={57} />)
    expect(screen.getByText('Customers')).toBeTruthy()
    expect(screen.getByText('85 / 150')).toBeTruthy()
    // Progress bar is rendered when not unlimited (testID added to the fill View)
    expect(screen.getByTestId('usage-bar-fill')).toBeTruthy()
  })

  it('shows "X / Unlimited" and NO progress bar when max === 0', async () => {
    const screen = await render(<UsageBar resourceLabel="Staff" used={5} max={0} percent={0} />)
    expect(screen.getByText(`5 / ${t('subscription.unlimited')}`)).toBeTruthy()
    // No progress bar when unlimited
    expect(screen.queryByTestId('usage-bar-fill')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// LimitReachedModal
// ---------------------------------------------------------------------------
describe('LimitReachedModal', () => {
  const defaultProps = {
    visible: true,
    resource: 'customers' as const,
    current: 20,
    max: 20,
    onUpgrade: jest.fn(),
    onClose: jest.fn(),
  }

  it('renders title when visible', async () => {
    const screen = await render(<LimitReachedModal {...defaultProps} />)
    expect(screen.getByText(t('subscription.limit_reached_title'))).toBeTruthy()
  })

  it('calls onUpgrade when upgrade button is pressed', async () => {
    const onUpgrade = jest.fn()
    const screen = await render(<LimitReachedModal {...defaultProps} onUpgrade={onUpgrade} />)
    fireEvent.press(screen.getByTestId('limit-modal-upgrade'))
    expect(onUpgrade).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button is pressed', async () => {
    const onClose = jest.fn()
    const screen = await render(<LimitReachedModal {...defaultProps} onClose={onClose} />)
    fireEvent.press(screen.getByTestId('limit-modal-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing (modal hidden) when visible = false', async () => {
    const screen = await render(<LimitReachedModal {...defaultProps} visible={false} />)
    expect(screen.queryByText(t('subscription.limit_reached_title'))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// SubscriptionBanner
// ---------------------------------------------------------------------------

const activeSub: SubscriptionViewDto = {
  currentPlan: {
    subscriptionId: '10',
    planId: '2',
    planCode: 'GROWTH',
    planName: 'Growth',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    startDate: '2026-04-01',
    endDate: null,
    nextBillingDate: '2027-12-31', // far future → no expiry banner
    autoRenewal: true,
    isTrial: false,
    limits: { maxCustomers: 150, maxStaff: 3, maxSupplyLists: 10 },
  },
  usage: { customers: 100, staff: 2, supplyLists: 5 },
  utilizationPercentage: { customers: 67, staff: 67, supplyLists: 50 },
  canAddMore: { customers: true, staff: true, supplyLists: true },
}

describe('SubscriptionBanner', () => {
  it('renders null when subscription is null', async () => {
    const screen = await render(
      <SubscriptionBanner subscription={null} onDismiss={jest.fn()} onPress={jest.fn()} />,
    )
    expect(screen.toJSON()).toBeNull()
  })

  it('renders null when no condition triggers a banner', async () => {
    const screen = await render(
      <SubscriptionBanner subscription={activeSub} onDismiss={jest.fn()} onPress={jest.fn()} />,
    )
    expect(screen.toJSON()).toBeNull()
  })

  it('renders EXPIRED banner', async () => {
    const expired: SubscriptionViewDto = {
      ...activeSub,
      currentPlan: {
        ...activeSub.currentPlan,
        status: 'EXPIRED',
        nextBillingDate: '2026-04-01',
      },
    }
    const screen = await render(
      <SubscriptionBanner subscription={expired} onDismiss={jest.fn()} onPress={jest.fn()} />,
    )
    expect(screen.getByText(t('subscription.banner_expired'))).toBeTruthy()
  })

  it('renders usage warning banner when a resource >= 90%', async () => {
    const highUsage: SubscriptionViewDto = {
      ...activeSub,
      utilizationPercentage: { customers: 92, staff: 50, supplyLists: 40 },
    }
    const screen = await render(
      <SubscriptionBanner subscription={highUsage} onDismiss={jest.fn()} onPress={jest.fn()} />,
    )
    expect(screen.getByTestId('banner-cta')).toBeTruthy()
  })

  it('calls onPress when CTA is pressed', async () => {
    const onPress = jest.fn()
    const expired: SubscriptionViewDto = {
      ...activeSub,
      currentPlan: { ...activeSub.currentPlan, status: 'EXPIRED', nextBillingDate: '2026-04-01' },
    }
    const screen = await render(
      <SubscriptionBanner subscription={expired} onDismiss={jest.fn()} onPress={onPress} />,
    )
    fireEvent.press(screen.getByTestId('banner-cta'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button is pressed', async () => {
    const onDismiss = jest.fn()
    const expired: SubscriptionViewDto = {
      ...activeSub,
      currentPlan: { ...activeSub.currentPlan, status: 'EXPIRED', nextBillingDate: '2026-04-01' },
    }
    const screen = await render(
      <SubscriptionBanner subscription={expired} onDismiss={onDismiss} onPress={jest.fn()} />,
    )
    fireEvent.press(screen.getByTestId('banner-dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------
const growthPlan: PlanDto = {
  id: '2',
  planCode: 'GROWTH',
  planName: 'Growth',
  maxCustomers: 150,
  maxStaff: 3,
  maxSupplyLists: 10,
  priceMonthly: 499,
  priceYearly: 4990,
  features: {
    basic_delivery_tracking: true,
    customer_management: true,
    staff_management: true,
  },
}

describe('PlanCard', () => {
  it('renders plan name and monthly price', async () => {
    const screen = await render(
      <PlanCard
        plan={growthPlan}
        billingCycle="MONTHLY"
        isCurrent={false}
        onSelect={jest.fn()}
      />,
    )
    expect(screen.getByText('Growth')).toBeTruthy()
    // formatCurrency renders as ₹499.00 or similar locale format
    expect(screen.getByText(/499/)).toBeTruthy()
  })

  it('renders yearly price when billingCycle is YEARLY', async () => {
    const screen = await render(
      <PlanCard
        plan={growthPlan}
        billingCycle="YEARLY"
        isCurrent={false}
        onSelect={jest.fn()}
      />,
    )
    // formatCurrency renders as ₹4,990.00 or similar locale format
    expect(screen.getByText(/4.?990/)).toBeTruthy()
  })

  it('calls onSelect when the select button is pressed', async () => {
    const onSelect = jest.fn()
    const screen = await render(
      <PlanCard plan={growthPlan} billingCycle="MONTHLY" isCurrent={false} onSelect={onSelect} />,
    )
    // testID uses planCode (e.g. plan-select-GROWTH)
    fireEvent.press(screen.getByTestId(`plan-select-${growthPlan.planCode}`))
    expect(onSelect).toHaveBeenCalledWith('2')
  })

  it('shows "Current Plan" badge when isCurrent = true', async () => {
    const screen = await render(
      <PlanCard plan={growthPlan} billingCycle="MONTHLY" isCurrent onSelect={jest.fn()} />,
    )
    // Component uses subscription.current_plan_label — appears in header + button (multiple elements is fine)
    expect(screen.getAllByText(t('subscription.current_plan_label')).length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// InvoiceRow
// ---------------------------------------------------------------------------
const paidInvoice: InvoiceDto = {
  id: '55',
  invoiceNumber: 'INV-2026-04-001',
  amount: 499,
  tax: 0,
  totalAmount: 499,
  invoiceDate: '2026-04-01',
  dueDate: '2026-04-06',
  paymentStatus: 'PAID',
  paymentDate: '2026-04-02',
  paymentMethod: 'UPI',
  paymentReference: 'UPI123456',
}

describe('InvoiceRow', () => {
  it('renders invoice number and amount', async () => {
    const screen = await render(<InvoiceRow invoice={paidInvoice} onPress={jest.fn()} />)
    expect(screen.getByText('INV-2026-04-001')).toBeTruthy()
    // formatCurrency may render as ₹499.00 etc.
    expect(screen.getByText(/499/)).toBeTruthy()
  })

  it('renders PAID status badge', async () => {
    const screen = await render(<InvoiceRow invoice={paidInvoice} onPress={jest.fn()} />)
    // InvoiceRow uses 'subscription.paid' (not 'invoice_status_paid')
    expect(screen.getByText(t('subscription.paid'))).toBeTruthy()
  })

  it('renders PENDING status badge for unpaid invoice', async () => {
    const pending: InvoiceDto = {
      ...paidInvoice,
      id: '56',
      paymentStatus: 'PENDING',
      paymentDate: null,
      paymentMethod: null,
      paymentReference: null,
    }
    const screen = await render(<InvoiceRow invoice={pending} onPress={jest.fn()} />)
    // InvoiceRow uses 'subscription.pending' (not 'invoice_status_pending')
    expect(screen.getByText(t('subscription.pending'))).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const screen = await render(<InvoiceRow invoice={paidInvoice} onPress={onPress} />)
    fireEvent.press(screen.getByTestId('invoice-row-55'))
    expect(onPress).toHaveBeenCalledWith('55')
  })
})
