/* eslint-disable import/first */
/**
 * Referral Component tests (US-014)
 * Smoke tests for all 12 referral UI components.
 */

jest.mock('@hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@utils/formatCurrency', () => ({ formatCurrency: (v: number) => `${v}` }))
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' } }))
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

import React from 'react'
import { Share, Linking } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'
import { BenefitsCard } from '../BenefitsCard'
import { ReferralCodeCard } from '../ReferralCodeCard'
import { ReferralMessagePreview } from '../ReferralMessagePreview'
import { EarningsSummaryCard } from '../EarningsSummaryCard'
import { VendorReferralCard } from '../VendorReferralCard'
import { MilestoneProgressBar } from '../MilestoneProgressBar'
import { CustomerGrowthCard } from '../CustomerGrowthCard'
import { RedemptionOptionCard } from '../RedemptionOptionCard'
import { CustomerStatusSummary } from '../CustomerStatusSummary'
import { TopReferrerRow } from '../TopReferrerRow'
import { RecentAdditionRow } from '../RecentAdditionRow'
import { NearbyVendorCategorySection } from '../NearbyVendorCategorySection'
import type {
  DashboardVendorReferral,
  CustomerGrowthFromReferrals,
  TopReferrerDto,
  RecentAdditionDto,
  NearbyVendorDto,
  TotalEarnings,
} from '../../../../types/referral'

// Use spyOn instead of jest.mock('react-native') to avoid TurboModule invariant errors
jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never)
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)

// Correctly-typed fixtures matching src/types/referral.ts
const te: TotalEarnings = { credits: 1500, revenueShare: 400, total: 1900 }

const rfPending: DashboardVendorReferral = {
  id: '1',
  referredVendorName: 'Ravi Dairy',
  referredDate: '2026-01-01T00:00:00Z',
  status: 'PENDING',
  customerCount: 0,
  earned: { signup: 0, milestone10: 0, milestone50: 0, revenueShare: 0, total: 0 },
  nextMilestone: { type: '10_customers', reward: 500, progress: 0, target: 10 },
}

const rfRewarded: DashboardVendorReferral = {
  ...rfPending,
  id: '2',
  referredVendorName: 'Priya Mill',
  status: 'REWARDED',
  nextMilestone: null,
}

// TopReferrerSummary (for CustomerGrowthCard) only has customerName + referralCount
const growth: CustomerGrowthFromReferrals = {
  newCustomersThisMonth: 5,
  totalFromReferrals: 20,
  additionalMonthlyRevenue: 5000,
  topReferrer: { customerName: 'Meena', referralCount: 4 },
}

// TopReferrerRow expects TopReferrerDto (has customerId, used for give-discount navigation)
const topRef: TopReferrerDto = { customerId: 'c1', customerName: 'Meena', referralCount: 4 }

// RecentAdditionDto only has referredCustomerName, referrerCustomerName, joinedDate
const addRow: RecentAdditionDto = {
  referredCustomerName: 'Arun Kumar',
  referrerCustomerName: 'Meena',
  joinedDate: '2026-06-10',
}

// NearbyVendorDto uses name, customersOnPaycycle, yourReferral (distance always null in v1)
const nearby: NearbyVendorDto[] = [
  { name: 'Satish Eggs', customersOnPaycycle: 30, distance: null, yourReferral: true },
  { name: 'Gopal Fruits', customersOnPaycycle: 15, distance: null, yourReferral: false },
]

describe('BenefitsCard', () => {
  it('renders testID', async () => { const s = await act(async () => render(<BenefitsCard />)); expect(s.getByTestId('benefits-card')).toBeTruthy() })
  it('renders 3 benefit items', async () => { const s = await act(async () => render(<BenefitsCard />)); expect(s.getByText('referral.refer.benefit_credits')).toBeTruthy() })
})

describe('ReferralCodeCard', () => {
  it('placeholder when null', async () => { const s = await act(async () => render(<ReferralCodeCard code={null} referralLink={null} />)); expect(s.getByTestId('referral-code-placeholder')).toBeTruthy(); expect(s.queryByTestId('referral-code-value')).toBeNull() })
  it('shows code', async () => { const s = await act(async () => render(<ReferralCodeCard code="KRISHNA2026" referralLink="x" />)); expect(s.getByText('KRISHNA2026')).toBeTruthy() })
  it('copy btn disabled without code', async () => { const s = await act(async () => render(<ReferralCodeCard code={null} referralLink={null} />)); expect(s.getByTestId('copy-code-btn').props.accessibilityState?.disabled).toBeTruthy() })
})

describe('ReferralMessagePreview', () => {
  it('shows message', async () => { const s = await act(async () => render(<ReferralMessagePreview message="Hi!" />)); expect(s.getByText('Hi!')).toBeTruthy() })
  it('placeholder when null', async () => { const s = await act(async () => render(<ReferralMessagePreview message={null} />)); expect(s.getByText('referral.refer.message_preview_placeholder')).toBeTruthy() })
})

describe('EarningsSummaryCard', () => {
  it('renders', async () => { const s = await act(async () => render(<EarningsSummaryCard totalEarnings={te} availableBalance={1500} />)); expect(s.getByTestId('earnings-summary-card')).toBeTruthy(); expect(s.getByTestId('available-balance-value')).toBeTruthy() })
})

describe('VendorReferralCard', () => {
  it('shows vendor name', async () => { const s = await act(async () => render(<VendorReferralCard referral={rfPending} />)); expect(s.getByText('Ravi Dairy')).toBeTruthy() })
  it('all done for REWARDED', async () => { const s = await act(async () => render(<VendorReferralCard referral={rfRewarded} />)); expect(s.getByText('referral.dashboard.all_milestones_done')).toBeTruthy() })
})

describe('MilestoneProgressBar', () => {
  it('achieved when null', async () => { const s = await act(async () => render(<MilestoneProgressBar nextMilestone={null} currentCustomers={10} />)); expect(s.getByText('referral.dashboard.all_milestones_achieved')).toBeTruthy() })
  it('track when milestone', async () => { const s = await act(async () => render(<MilestoneProgressBar nextMilestone={{ type: '10_customers', reward: 500, progress: 5, target: 10 }} currentCustomers={5} />)); expect(s.getByTestId('milestone-track')).toBeTruthy() })
})

describe('CustomerGrowthCard', () => {
  it('new-this-month', async () => { const s = await act(async () => render(<CustomerGrowthCard growth={growth} />)); expect(s.getByTestId('new-this-month')).toBeTruthy() })
  it('top referrer name', async () => { const s = await act(async () => render(<CustomerGrowthCard growth={growth} />)); expect(s.getByText('Meena')).toBeTruthy() })
  it('hides when null', async () => { const s = await act(async () => render(<CustomerGrowthCard growth={{ ...growth, topReferrer: null }} />)); expect(s.queryByText('Meena')).toBeNull() })
})

describe('RedemptionOptionCard', () => {
  it('disabled does not call', async () => { const op = jest.fn(); const s = await act(async () => render(<RedemptionOptionCard titleKey="t" descriptionKey="d" amountLabel="x" iconName="cash-outline" disabled comingSoon onPress={op} testID="wd" />)); fireEvent.press(s.getByTestId('wd')); expect(op).not.toHaveBeenCalled() })
  it('enabled calls', async () => { const op = jest.fn(); const s = await act(async () => render(<RedemptionOptionCard titleKey="t" descriptionKey="d" amountLabel="x" iconName="card-outline" onPress={op} testID="sub" />)); fireEvent.press(s.getByTestId('sub')); expect(op).toHaveBeenCalled() })
})

describe('CustomerStatusSummary', () => {
  it('renders', async () => { const s = await act(async () => render(<CustomerStatusSummary total={50} onPaycycle={30} notOnPaycycle={20} />)); expect(s.getByTestId('total-customers')).toBeTruthy() })
})

describe('TopReferrerRow', () => {
  it('name and give discount', async () => { const gd = jest.fn(); const s = await act(async () => render(<TopReferrerRow referrer={topRef} onGiveDiscount={gd} />)); expect(s.getByText('Meena')).toBeTruthy(); fireEvent.press(s.getByTestId('discount-btn-c1')); expect(gd).toHaveBeenCalledWith('c1') })
})

describe('RecentAdditionRow', () => {
  it('shows referred customer name', async () => { const s = await act(async () => render(<RecentAdditionRow addition={addRow} />)); expect(s.getByText('Arun Kumar')).toBeTruthy() })
  it('shows join date', async () => { const s = await act(async () => render(<RecentAdditionRow addition={addRow} />)); expect(s.getByText('2026-06-10')).toBeTruthy() })
})

describe('NearbyVendorCategorySection', () => {
  it('category and vendors', async () => { const s = await act(async () => render(<NearbyVendorCategorySection category="Poultry" vendors={nearby} />)); expect(s.getByText('Poultry')).toBeTruthy(); expect(s.getByText('Satish Eggs')).toBeTruthy() })
  it('your-referral once', async () => { const s = await act(async () => render(<NearbyVendorCategorySection category="Poultry" vendors={nearby} />)); expect(s.getAllByText('referral.nearby.your_referral')).toHaveLength(1) })
  it('no distance text', async () => { const s = await act(async () => render(<NearbyVendorCategorySection category="Poultry" vendors={nearby} />)); expect(s.queryByText(/km/i)).toBeNull() })
})
