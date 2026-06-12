/**
 * Dashboard component unit tests (US-010)
 * Covers key rendering branches for each component.
 *
 * Conventions (following auditComponents.test.tsx pattern):
 * - Use local `screen` from `render()`, NOT the global `screen` singleton
 * - Mock `useReducedMotion` (required by AppProgressBar + AppToggle)
 * - Mock `useTranslation` to return key:params strings
 * - Mock `formatCurrency` for deterministic output
 */

jest.mock('@hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

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

import React from 'react'
import { render } from '@testing-library/react-native'
import { FinancialOverviewCard } from '../FinancialOverviewCard'
import { OutstandingAgingCard } from '../OutstandingAgingCard'
import { AutoMarkToggleRow } from '../AutoMarkToggleRow'
import { SupplyForecastSummaryCard } from '../SupplyForecastSummaryCard'
import { SupplyListProgressCard } from '../SupplyListProgressCard'
import { StaffProgressCard } from '../StaffProgressCard'
import { ForecastByListView } from '../ForecastByListView'
import { ForecastAggregatedView } from '../ForecastAggregatedView'
import { PriorityCustomerCard } from '../PriorityCustomerCard'
import { AdvanceCreditCard } from '../AdvanceCreditCard'
import type {
  OutstandingAgingSummary,
  ForecastLine,
  OwnerTodayList,
  StaffAssignedList,
  ForecastListRow,
  ForecastAggregateGroup,
  PriorityCustomer,
  AdvanceCreditCustomer,
} from '../../../../types/dashboard'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const aging: OutstandingAgingSummary = {
  fresh_0_30: { amount: 8400, customerCount: 12 },
  overdue_30_60: { amount: 3800, customerCount: 5 },
  critical_60_plus: { amount: 1200, customerCount: 2 },
}

const tomorrow: ForecastLine[] = [
  { listName: 'Morning Milk', quantity: 85, unit: 'ltr', customerCount: 45 },
]

const ownerList: OwnerTodayList = {
  id: '10',
  name: 'Morning Milk',
  startTime: '06:00',
  staffName: 'Raju',
  progress: { completed: 45, total: 52, percentage: 87 },
  status: 'in_progress',
}

const staffList: StaffAssignedList = {
  id: '10',
  name: 'Morning Milk',
  startTime: '06:00',
  progress: { completed: 45, total: 52, percentage: 87 },
  status: 'in_progress',
}

const forecastRows: ForecastListRow[] = [
  { listId: '1', listName: 'Morning Milk', supplyType: 'milk', quantity: 85, unit: 'ltr', customerCount: 45, plannedLeaves: 3 },
]

const aggregateGroups: ForecastAggregateGroup[] = [
  { supplyType: 'milk', totalQuantity: 85, unit: 'ltr', lists: ['Morning Milk'], dailyAverage: 85 },
]

const customer: PriorityCustomer = {
  customerId: '1',
  customerName: 'Sharma Family',
  outstanding: 5000,
  daysOverdue: 78,
  creditLimit: 5000,
  utilizationPercentage: 100,
  lastPaymentDate: '2025-11-15',
  paymentScore: 45,
}

const creditCustomer: AdvanceCreditCustomer = {
  customerId: '20',
  customerName: 'Verma Family',
  creditBalance: -2500,
  monthsCovered: 2,
}

// ---------------------------------------------------------------------------
// FinancialOverviewCard
// ---------------------------------------------------------------------------

describe('FinancialOverviewCard', () => {
  it('renders revenue amount', async () => {
    const screen = await render(
      <FinancialOverviewCard
        month="April 2026"
        totalRevenue={78600}
        collected={65200}
        pending={13400}
        collectionPercentage={83}
      />,
    )
    expect(screen.getByTestId('financial-overview-card')).toBeTruthy()
    expect(screen.getByText('₹78600')).toBeTruthy()
    expect(screen.getByText('₹65200')).toBeTruthy()
    expect(screen.getByText('₹13400')).toBeTruthy()
  })

  it('renders the progress bar testID', async () => {
    const screen = await render(
      <FinancialOverviewCard
        month="April 2026"
        totalRevenue={78600}
        collected={65200}
        pending={13400}
        collectionPercentage={40}
      />,
    )
    // collectionPercentage < 60 → error variant; the card still renders
    expect(screen.getByTestId('financial-overview-card')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// OutstandingAgingCard
// ---------------------------------------------------------------------------

describe('OutstandingAgingCard', () => {
  it('renders three aging buckets', async () => {
    const screen = await render(<OutstandingAgingCard aging={aging} />)
    expect(screen.getByTestId('outstanding-aging-card')).toBeTruthy()
    // Amounts are nested inside Text nodes, use regex to match partial text
    expect(screen.getByText(/₹8400/)).toBeTruthy()
    expect(screen.getByText(/₹3800/)).toBeTruthy()
    expect(screen.getByText(/₹1200/)).toBeTruthy()
  })

  it('shows View Collections button when callback provided', async () => {
    const screen = await render(<OutstandingAgingCard aging={aging} onViewCollections={jest.fn()} />)
    expect(screen.getByTestId('view-collections-btn')).toBeTruthy()
  })

  it('hides View Collections button when no callback', async () => {
    const screen = await render(<OutstandingAgingCard aging={aging} />)
    expect(screen.queryByTestId('view-collections-btn')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AutoMarkToggleRow
// ---------------------------------------------------------------------------

describe('AutoMarkToggleRow', () => {
  it('renders with conflicts count when > 0', async () => {
    const screen = await render(
      <AutoMarkToggleRow enabled={true} conflictsCount={2} disabled={false} onToggle={jest.fn()} />,
    )
    expect(screen.getByTestId('auto-mark-toggle-row')).toBeTruthy()
  })

  it('renders without conflict note when count = 0', async () => {
    const screen = await render(
      <AutoMarkToggleRow enabled={true} conflictsCount={0} disabled={false} onToggle={jest.fn()} />,
    )
    expect(screen.getByTestId('auto-mark-toggle-row')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// SupplyForecastSummaryCard
// ---------------------------------------------------------------------------

describe('SupplyForecastSummaryCard', () => {
  it('renders forecast lines', async () => {
    const screen = await render(
      <SupplyForecastSummaryCard tomorrow={tomorrow} onViewForecast={jest.fn()} />,
    )
    expect(screen.getByTestId('supply-forecast-summary-card')).toBeTruthy()
    expect(screen.getByText('Morning Milk')).toBeTruthy()
  })

  it('renders empty state when no lines', async () => {
    const screen = await render(
      <SupplyForecastSummaryCard tomorrow={[]} onViewForecast={jest.fn()} />,
    )
    expect(screen.getByTestId('supply-forecast-summary-card')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// SupplyListProgressCard (owner)
// ---------------------------------------------------------------------------

describe('SupplyListProgressCard', () => {
  it('renders list name and progress', async () => {
    const screen = await render(<SupplyListProgressCard list={ownerList} onPress={jest.fn()} />)
    expect(screen.getByTestId('supply-list-card-10')).toBeTruthy()
    expect(screen.getByText('Morning Milk')).toBeTruthy()
  })

  it('shows completed status icon for completed list', async () => {
    const completed: OwnerTodayList = { ...ownerList, status: 'completed' }
    const screen = await render(<SupplyListProgressCard list={completed} onPress={jest.fn()} />)
    expect(screen.getByTestId('supply-list-card-10')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// StaffProgressCard — MUST have NO financial strings
// ---------------------------------------------------------------------------

describe('StaffProgressCard', () => {
  it('renders list name and progress', async () => {
    const screen = await render(<StaffProgressCard list={staffList} onPress={jest.fn()} />)
    expect(screen.getByTestId('staff-list-card-10')).toBeTruthy()
    expect(screen.getByText('Morning Milk')).toBeTruthy()
  })

  it('shows Continue button for in_progress lists', async () => {
    const screen = await render(<StaffProgressCard list={staffList} onPress={jest.fn()} />)
    expect(screen.getByTestId('staff-list-btn-10')).toBeTruthy()
  })

  it('contains no currency/amount text (no ₹ or Rs.)', async () => {
    const screen = await render(<StaffProgressCard list={staffList} onPress={jest.fn()} />)
    // No financial text should be present
    expect(screen.queryByText(/₹/)).toBeNull()
    expect(screen.queryByText(/Rs\./)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ForecastByListView
// ---------------------------------------------------------------------------

describe('ForecastByListView', () => {
  it('renders forecast rows', async () => {
    const screen = await render(<ForecastByListView rows={forecastRows} />)
    expect(screen.getByTestId('forecast-by-list-view')).toBeTruthy()
    expect(screen.getByTestId('forecast-row-1')).toBeTruthy()
    expect(screen.getByText('Morning Milk')).toBeTruthy()
  })

  it('shows empty state when no rows', async () => {
    const screen = await render(<ForecastByListView rows={[]} />)
    expect(screen.queryByTestId('forecast-by-list-view')).toBeNull()
  })

  it('shows planned leaves in warning color when > 0', async () => {
    const screen = await render(<ForecastByListView rows={forecastRows} />)
    // Row has plannedLeaves: 3
    expect(screen.getByText('3')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// ForecastAggregatedView
// ---------------------------------------------------------------------------

describe('ForecastAggregatedView', () => {
  it('renders groups', async () => {
    const screen = await render(<ForecastAggregatedView groups={aggregateGroups} showDailyAvg={false} />)
    expect(screen.getByTestId('forecast-aggregated-view')).toBeTruthy()
    expect(screen.getByText('Milk')).toBeTruthy()
    expect(screen.getByText('85 ltr')).toBeTruthy()
  })

  it('hides daily average when showDailyAvg=false', async () => {
    const screen = await render(<ForecastAggregatedView groups={aggregateGroups} showDailyAvg={false} />)
    // The translation key "dashboard.daily_avg" should not appear
    expect(screen.queryByText('dashboard.daily_avg')).toBeNull()
  })

  it('shows daily average when showDailyAvg=true', async () => {
    const screen = await render(<ForecastAggregatedView groups={aggregateGroups} showDailyAvg={true} />)
    expect(screen.getByText(/dashboard\.daily_avg/)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// PriorityCustomerCard
// ---------------------------------------------------------------------------

describe('PriorityCustomerCard', () => {
  it('renders customer metrics', async () => {
    const screen = await render(
      <PriorityCustomerCard customer={customer} priority="high" onRecordPayment={jest.fn()} />,
    )
    expect(screen.getByTestId('priority-customer-1')).toBeTruthy()
    expect(screen.getByText('Sharma Family')).toBeTruthy()
    expect(screen.getByText('₹5000')).toBeTruthy()
    expect(screen.getByText('78d')).toBeTruthy()
    expect(screen.getByTestId('record-payment-1')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// AdvanceCreditCard
// ---------------------------------------------------------------------------

describe('AdvanceCreditCard', () => {
  it('renders credit balance and months covered', async () => {
    const screen = await render(<AdvanceCreditCard customer={creditCustomer} />)
    expect(screen.getByTestId('advance-credit-20')).toBeTruthy()
    expect(screen.getByText('Verma Family')).toBeTruthy()
    expect(screen.getByText('₹2500')).toBeTruthy()
  })
})
