/**
 * Audit mock fixtures (US-007).
 * Deterministic data for dev/mock mode. Mirrors the API_SPEC shapes exactly.
 * Timestamps are generated relative to "now" so the My-Activity rolling counts and
 * the timeline ordering look realistic without being flaky in tests.
 */

import type {
  AuditRef,
  AuditLogDto,
  AuditLogsResult,
  ConflictDto,
  StaffSummaryDto,
  MyActivityResult,
} from '../../../types/audit'

const STAFF_RAJU: AuditRef = { id: 'staff-1', name: 'Raju' }
const STAFF_SURESH: AuditRef = { id: 'staff-2', name: 'Suresh' }
const STAFF: AuditRef[] = [STAFF_RAJU, STAFF_SURESH]

const CUST_ANIL: AuditRef = { id: 'cust-1', name: 'Anil Kumar' }
const CUST_MOHAN: AuditRef = { id: 'cust-2', name: 'Mohan Lal' }
const CUST_DEEPAK: AuditRef = { id: 'cust-3', name: 'Deepak Singh' }
const CUST_ASHA: AuditRef = { id: 'cust-4', name: 'Asha Devi' }

const LIST: AuditRef = { id: 'list-1', name: 'Morning Milk' }

/** Builds an ISO timestamp `minutesAgo` minutes before now. */
function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

/** Full activity-log timeline (owner view). */
export const mockAuditLogs: AuditLogDto[] = [
  {
    id: 'log-1',
    timestamp: isoMinutesAgo(15),
    actionType: 'delivery_marked',
    actionLabel: 'Delivery Marked',
    entityType: 'daily_supply',
    entityId: 'ds-101',
    user: { id: 'staff-1', name: 'Raju', role: 'staff' },
    customer: CUST_ANIL,
    supplyList: LIST,
    details: { status: 'DELIVERED' },
    ipAddress: '49.36.10.22',
  },
  {
    id: 'log-2',
    timestamp: isoMinutesAgo(17),
    actionType: 'leave_marked',
    actionLabel: 'Leave Marked',
    entityType: 'daily_supply',
    entityId: 'ds-102',
    user: { id: 'staff-1', name: 'Raju', role: 'staff' },
    customer: CUST_MOHAN,
    supplyList: LIST,
    details: { status: 'LEAVE' },
    ipAddress: '49.36.10.22',
  },
  {
    id: 'log-3',
    timestamp: isoMinutesAgo(45),
    actionType: 'delivery_overridden',
    actionLabel: 'Delivery Overridden',
    entityType: 'daily_supply',
    entityId: 'ds-103',
    user: { id: 'owner-1', name: 'Owner', role: 'owner' },
    customer: CUST_ASHA,
    supplyList: LIST,
    details: { status: 'LEAVE', reason: 'Customer requested leave' },
    ipAddress: '49.36.10.10',
  },
  {
    id: 'log-4',
    timestamp: isoMinutesAgo(120),
    actionType: 'payment_marked',
    actionLabel: 'Payment Received',
    entityType: 'customer',
    entityId: 'cust-2',
    user: { id: 'staff-2', name: 'Suresh', role: 'staff' },
    customer: CUST_MOHAN,
    supplyList: null,
    details: { status: 'PAID', amount: 500 },
    ipAddress: '49.36.11.5',
  },
  {
    id: 'log-5',
    timestamp: isoMinutesAgo(180),
    actionType: 'extra_charge_added',
    actionLabel: 'Extra Charge Added',
    entityType: 'daily_supply',
    entityId: 'ds-105',
    user: { id: 'staff-2', name: 'Suresh', role: 'staff' },
    customer: CUST_DEEPAK,
    supplyList: LIST,
    details: { amount: 50, reason: 'Extra milk' },
    ipAddress: '49.36.11.5',
  },
]

/** Builds the GET /audit-logs result, applying basic in-memory filters. */
export function buildMockAuditLogsResult(opts: {
  staffId?: string
  actionType?: string
  page?: number
  limit?: number
}): AuditLogsResult {
  let rows = [...mockAuditLogs]
  if (opts.staffId) rows = rows.filter((r) => r.user.id === opts.staffId)
  if (opts.actionType) rows = rows.filter((r) => r.actionType === opts.actionType)

  const page = opts.page ?? 1
  const limit = opts.limit ?? 50
  const start = (page - 1) * limit
  const paged = rows.slice(start, start + limit)

  return {
    auditLogs: paged,
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    },
    filters: {
      availableStaff: STAFF,
      availableActionTypes: Array.from(new Set(mockAuditLogs.map((r) => r.actionType))),
    },
  }
}

/** GET /audit-logs/conflicts mock. */
export const mockConflicts: ConflictDto[] = [
  {
    id: 'ds-103',
    deliveryDate: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
    customer: CUST_ASHA,
    supplyList: LIST,
    staffAction: {
      timestamp: isoMinutesAgo(60),
      staff: STAFF_RAJU,
      status: 'DELIVERED',
    },
    overrideAction: {
      timestamp: isoMinutesAgo(45),
      by: 'owner',
      status: 'LEAVE',
      timeDiffMinutes: 15,
    },
  },
]

/** GET /audit-logs/staff-summary mock. */
export const mockStaffSummary: StaffSummaryDto[] = [
  {
    staffId: 'staff-1',
    staffName: 'Raju',
    byActionType: [
      {
        actionType: 'delivery_marked',
        actionLabel: 'Delivery Marked',
        count: 24,
        firstActionAt: isoMinutesAgo(600),
        lastActionAt: isoMinutesAgo(15),
      },
      {
        actionType: 'leave_marked',
        actionLabel: 'Leave Marked',
        count: 3,
        firstActionAt: isoMinutesAgo(580),
        lastActionAt: isoMinutesAgo(17),
      },
    ],
    byDate: [
      {
        date: new Date().toISOString().slice(0, 10),
        actionCount: 27,
        firstActionAt: isoMinutesAgo(600),
        lastActionAt: isoMinutesAgo(15),
      },
    ],
    totalActions: 27,
    activeDays: 5,
    avgActionsPerDay: 5,
  },
  {
    staffId: 'staff-2',
    staffName: 'Suresh',
    byActionType: [
      {
        actionType: 'delivery_marked',
        actionLabel: 'Delivery Marked',
        count: 18,
        firstActionAt: isoMinutesAgo(700),
        lastActionAt: isoMinutesAgo(120),
      },
    ],
    byDate: [
      {
        date: new Date().toISOString().slice(0, 10),
        actionCount: 18,
        firstActionAt: isoMinutesAgo(700),
        lastActionAt: isoMinutesAgo(120),
      },
    ],
    totalActions: 18,
    activeDays: 4,
    avgActionsPerDay: 4,
  },
]

/** GET /audit-logs/my-activity mock. */
export const mockMyActivity: MyActivityResult = {
  activity: [
    {
      id: 'log-1',
      timestamp: isoMinutesAgo(15),
      actionType: 'delivery_marked',
      actionLabel: 'Delivery Marked',
      customer: CUST_ANIL,
      supplyList: LIST,
      details: { status: 'DELIVERED' },
    },
    {
      id: 'log-2',
      timestamp: isoMinutesAgo(17),
      actionType: 'leave_marked',
      actionLabel: 'Leave Marked',
      customer: CUST_MOHAN,
      supplyList: LIST,
      details: { status: 'LEAVE' },
    },
  ],
  summary: { todayActions: 12, thisWeekActions: 64, thisMonthActions: 220 },
}

/** Mock CSV body returned by POST /audit-logs/export. */
export function buildMockExportCsv(): string {
  const header = 'Timestamp,Action,User,Role,Customer,Supply List,Details'
  const rows = mockAuditLogs.map((r) =>
    [
      r.timestamp,
      r.actionType,
      r.user.name,
      r.user.role,
      r.customer?.name ?? '',
      r.supplyList?.name ?? '',
      JSON.stringify(r.details ?? {}).replace(/"/g, '""'),
    ]
      .map((f) => `"${f}"`)
      .join(','),
  )
  return [header, ...rows].join('\n')
}
