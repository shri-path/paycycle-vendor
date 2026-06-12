/**
 * Delivery mock data (US-006)
 * Purpose: deterministic mock responses for `delivery.service` in mock mode.
 * Statuses are UPPERCASE; `revenue`/list `revenue` fields are STRINGS (Prisma
 * Decimal); ids are strings. Money fields (`ratePerUnit`/`amount`) are present in
 * mock — the real backend omits them for staff; the screen gates display via
 * `showMoney`.
 */

import type {
  CalendarResultDto,
  DateDetailResultDto,
  DeliveryDto,
  ListDeliveriesOptions,
  ListDeliveriesResultDto,
  ListLeavesResultDto,
  MarkDeliveryInput,
  MarkDeliveryResultDto,
  TodayOptions,
  TodayResultDto,
} from '../../../types/delivery'

const TODAY = new Date().toISOString().slice(0, 10)

function buildDelivery(
  id: string,
  name: string,
  address: string,
  status: DeliveryDto['status'],
  quantity: number,
): DeliveryDto {
  return {
    id,
    customer: { id: `cust-${id}`, name, address, phoneNumber: null },
    quantity,
    unit: 'ltr',
    ratePerUnit: 50,
    amount: 50 * quantity,
    status,
    markedBy:
      status === 'PENDING'
        ? null
        : { userId: 'u1', name: 'Ramesh', role: 'staff' },
    markedAt: status === 'PENDING' ? null : new Date().toISOString(),
    hasConflict: id === 'd-3',
    conflictReason: id === 'd-3' ? 'Customer marked leave for today' : null,
    otherLists: [],
  }
}

const baseDeliveries: DeliveryDto[] = [
  buildDelivery('d-1', 'Anita Sharma', '12 MG Road', 'PENDING', 2),
  buildDelivery('d-2', 'Bhavesh Patel', '4 Lake View', 'DELIVERED', 1),
  buildDelivery('d-3', 'Chitra Rao', '88 Hill St', 'PENDING', 3),
  buildDelivery('d-4', 'Deepak Verma', '7 Garden Ln', 'LEAVE', 1),
  buildDelivery('d-5', 'Esha Nair', '21 River Rd', 'PENDING', 2),
]

export function mockListDeliveries(
  listId: string,
  opts: ListDeliveriesOptions = {},
): ListDeliveriesResultDto {
  let deliveries = [...baseDeliveries]
  if (opts.status) deliveries = deliveries.filter((d) => d.status === opts.status)
  if (opts.search) {
    const q = opts.search.toLowerCase()
    deliveries = deliveries.filter((d) => (d.customer.name ?? '').toLowerCase().includes(q))
  }
  const all = baseDeliveries
  return {
    listId,
    listName: 'Morning Milk',
    date: opts.date ?? TODAY,
    progress: {
      total: all.length,
      delivered: all.filter((d) => d.status === 'DELIVERED').length,
      onLeave: all.filter((d) => d.status === 'LEAVE').length,
      pending: all.filter((d) => d.status === 'PENDING').length,
    },
    deliveries,
  }
}

export function buildMarkResult(
  deliveryId: string,
  body: MarkDeliveryInput,
): MarkDeliveryResultDto {
  const base =
    baseDeliveries.find((d) => d.id === deliveryId) ??
    buildDelivery(deliveryId, 'Customer', '', 'PENDING', 1)
  return {
    delivery: {
      ...base,
      status: body.status,
      quantity: body.quantity ?? base.quantity,
      markedBy: { userId: 'u1', name: 'Ramesh', role: 'staff' },
      markedAt: new Date().toISOString(),
    },
    hasConflict: false,
  }
}

export function mockToday(opts: TodayOptions = {}): TodayResultDto {
  const list = {
    listId: 'list-1',
    listName: 'Morning Milk',
    startTime: '06:00',
    staff: [{ staffId: 'u1', name: 'Ramesh' }],
    totalCustomers: 5,
    delivered: 1,
    onLeave: 1,
    pending: 3,
    revenue: '250.00',
  }
  return {
    date: opts.date ?? TODAY,
    summary: {
      totalDeliveries: 5,
      delivered: 1,
      onLeave: 1,
      pending: 3,
      autoMarked: 0,
      revenue: '250.00',
      conflicts: 1,
    },
    byList: opts.listId ? [list].filter((l) => l.listId === opts.listId) : [list],
    conflicts: [
      {
        deliveryId: 'd-3',
        customerName: 'Chitra Rao',
        listName: 'Morning Milk',
        reason: 'Customer marked leave for today',
      },
    ],
  }
}

export function mockLeaves(): ListLeavesResultDto {
  return {
    today: [{ id: 'lv-1', customerName: 'Deepak Verma', listName: 'Morning Milk', date: TODAY }],
    upcoming: [
      {
        id: 'lv-2',
        customerName: 'Anita Sharma',
        listName: 'Morning Milk',
        startDate: TODAY,
        endDate: TODAY,
        daysCount: 1,
      },
    ],
  }
}

export function mockCalendar(month: string): CalendarResultDto {
  const days: CalendarResultDto['days'] = {
    [`${month}-01`]: { status: 'completed', delivered: 5, leaves: 0, revenue: '250.00' },
    [`${month}-02`]: { status: 'has_leaves', delivered: 4, leaves: 1, revenue: '200.00' },
    [`${month}-03`]: { status: 'has_conflicts', delivered: 3, leaves: 0, revenue: '150.00' },
    [`${month}-04`]: { status: 'pending', delivered: 0, leaves: 0, revenue: '0.00' },
  }
  return {
    month,
    summary: { totalDeliveries: 12, totalLeaves: 1, revenue: '600.00' },
    days,
  }
}

export function mockDateDetail(date: string): DateDetailResultDto {
  return {
    date,
    summary: { totalDeliveries: 5, leaves: 1, revenue: '250.00' },
    byList: [
      {
        listId: 'list-1',
        listName: 'Morning Milk',
        startTime: '06:00',
        staffName: 'Ramesh',
        delivered: 4,
        leaves: 1,
        revenue: '250.00',
      },
    ],
    extraCharges: [
      { customerName: 'Anita Sharma', listName: 'Morning Milk', amount: 20, reason: 'Extra milk' },
    ],
    leaves: [{ customerName: 'Deepak Verma', listName: 'Morning Milk', markedBy: 'staff' }],
  }
}
