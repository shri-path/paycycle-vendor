/**
 * Audit component tests (US-007).
 * Covers AuditLogRow (conflict variant, null-guards, owner-only IP), ConflictCard,
 * StaffSummaryCard, ActivitySummaryStat. Assertions resolve i18n keys via t().
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { AuditLogRow, isConflictEntry } from '../AuditLogRow'
import { ConflictCard } from '../ConflictCard'
import { StaffSummaryCard } from '../StaffSummaryCard'
import { ActivitySummaryStat } from '../ActivitySummaryStat'
import { t } from '@locales/index'
import type { AuditLogDto, ConflictDto, StaffSummaryDto } from '../../../../types/audit'

function log(overrides: Partial<AuditLogDto> = {}): AuditLogDto {
  return {
    id: 'l1',
    timestamp: '2026-06-12T06:15:00Z',
    actionType: 'delivery_marked',
    actionLabel: 'Delivery Marked',
    entityType: 'daily_supply',
    entityId: 'ds-1',
    user: { id: 's1', name: 'Raju', role: 'staff' },
    customer: { id: 'c1', name: 'Anil Kumar' },
    supplyList: { id: 'sl1', name: 'Morning Milk' },
    details: { status: 'DELIVERED' },
    ipAddress: '1.2.3.4',
    ...overrides,
  }
}

describe('isConflictEntry', () => {
  it('is true for override action types', async () => {
    expect(isConflictEntry(log({ actionType: 'delivery_overridden' }))).toBe(true)
  })
  it('is false for ordinary actions', async () => {
    expect(isConflictEntry(log({ actionType: 'delivery_marked' }))).toBe(false)
  })
})

describe('AuditLogRow', () => {
  it('renders actor name, action label, and customer', async () => {
    const screen = await render(<AuditLogRow log={log()} />)
    expect(screen.getByText(/Raju/)).toBeTruthy()
    expect(screen.getByText('Delivery Marked')).toBeTruthy()
    expect(screen.getByText(t('audit.customer_label', { name: 'Anil Kumar' }))).toBeTruthy()
  })

  it('shows the Conflict badge for override entries', async () => {
    const screen = await render(<AuditLogRow log={log({ actionType: 'delivery_overridden' })} />)
    expect(screen.getByText(t('audit.conflict_badge'))).toBeTruthy()
  })

  it('renders the IP line only when ipAddress is present (owner-only)', async () => {
    const withIp = await render(<AuditLogRow log={log({ ipAddress: '9.9.9.9' })} />)
    expect(withIp.getByText(t('audit.ip_label', { ip: '9.9.9.9' }))).toBeTruthy()

    const noIp = await render(<AuditLogRow log={log({ ipAddress: null })} />)
    expect(noIp.queryByText(t('audit.ip_label', { ip: '9.9.9.9' }))).toBeNull()
  })

  it('null-guards customer / supplyList / details without crashing', async () => {
    const screen = await render(
      <AuditLogRow log={log({ customer: null, supplyList: null, details: null })} />,
    )
    expect(screen.getByText('Delivery Marked')).toBeTruthy()
  })
})

describe('ConflictCard', () => {
  const conflict: ConflictDto = {
    id: 'd1',
    deliveryDate: '2026-06-11',
    customer: { id: 'c1', name: 'Asha Devi' },
    supplyList: { id: 'sl1', name: 'Morning Milk' },
    staffAction: { timestamp: 't', staff: { id: 's1', name: 'Raju' }, status: 'DELIVERED' },
    overrideAction: { timestamp: 't2', by: 'owner', status: 'LEAVE', timeDiffMinutes: 15 },
  }

  it('renders staff vs override and the time difference', async () => {
    const screen = await render(<ConflictCard conflict={conflict} />)
    expect(screen.getByText('Asha Devi · Morning Milk')).toBeTruthy()
    expect(
      screen.getByText(t('audit.conflict_staff_marked', { name: 'Raju', status: 'DELIVERED' })),
    ).toBeTruthy()
    expect(screen.getByText(t('audit.conflict_time_diff', { count: 15 }))).toBeTruthy()
  })

  it('renders the conflict badge', async () => {
    const screen = await render(<ConflictCard conflict={conflict} />)
    expect(screen.getByText(t('audit.conflict_badge'))).toBeTruthy()
  })
})

describe('StaffSummaryCard', () => {
  const summary: StaffSummaryDto = {
    staffId: 's1',
    staffName: 'Raju',
    byActionType: [
      {
        actionType: 'delivery_marked',
        actionLabel: 'Delivery Marked',
        count: 24,
        firstActionAt: 't',
        lastActionAt: 't2',
      },
    ],
    byDate: [],
    totalActions: 27,
    activeDays: 5,
    avgActionsPerDay: 5,
  }

  it('renders staff name, totals, and the by-action breakdown', async () => {
    const screen = await render(<StaffSummaryCard summary={summary} />)
    expect(screen.getByText('Raju')).toBeTruthy()
    expect(screen.getByText(t('audit.summary_total_actions', { count: 27 }))).toBeTruthy()
    expect(screen.getByText('Delivery Marked')).toBeTruthy()
    expect(screen.getByText(t('audit.actions_count', { count: 24 }))).toBeTruthy()
  })
})

describe('ActivitySummaryStat', () => {
  it('renders the value and label', async () => {
    const screen = await render(<ActivitySummaryStat label="Today" value={12} />)
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('Today')).toBeTruthy()
  })
})
