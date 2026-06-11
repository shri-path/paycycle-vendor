/**
 * Supply Lists Mock Data (US-005)
 * Purpose: Deterministic fixtures for the supply-list service in mock mode.
 *
 * Mirrors the shipped paycycle_api shapes exactly: all ids are STRINGS (R1),
 * `frequency` is UPPERCASE (R3), `status` is lowercase (R4), `todayStats`/`monthStats`
 * are zeroed (US-006 stub — surfaced as "no data yet" in the UI).
 *
 * Includes an EMPTY-available-customers variant (`mockAvailableCustomersEmpty`) so the
 * Add-Customers OQ-6 empty state is testable before US-008 customer CRUD lands.
 */

import type {
  AvailableCustomerDto,
  PaginationMeta,
  SubscriptionDto,
  SupplyListDto,
  SupplyListListDto,
  TodayStatsDto,
  MonthStatsDto,
} from '../../types/supplyLists'

/** Zeroed today roll-up (US-006 stub). */
const zeroToday: TodayStatsDto = {
  date: '2026-06-11',
  delivered: 0,
  onLeave: 0,
  pending: 0,
  totalQuantity: 0,
}

/** Zeroed month roll-up (US-006 stub). */
const zeroMonth: MonthStatsDto = {
  month: '2026-06',
  daysCompleted: 0,
  totalQuantity: 0,
  revenue: 0,
}

/** Standard list-response pagination meta for the mock fixtures. */
export const mockPaginationMeta: PaginationMeta = {
  page: 1,
  limit: 50,
  total: 3,
  totalPages: 1,
}

/** The primary milk list (also the source for the detail fixture). */
const morningMilkList: SupplyListListDto = {
  id: 'list-1',
  name: 'Morning Milk — Sector 15',
  supplyType: 'milk',
  unit: 'ltr',
  defaultQuantity: 1,
  defaultRatePerUnit: 60,
  startTime: '06:30',
  frequency: 'DAILY',
  status: 'active',
  assignedStaff: [
    { staffId: 'staff-1', staffName: 'Ramesh Kumar', phoneNumber: null, isPrimary: true },
    { staffId: 'staff-2', staffName: 'Suresh Patel', phoneNumber: null, isPrimary: false },
  ],
  customerCount: 52,
  todayStats: zeroToday,
}

/** Lean list rows for the Lists screen. */
export const mockSupplyLists: SupplyListListDto[] = [
  morningMilkList,
  {
    id: 'list-2',
    name: 'Evening Newspaper — Tower A',
    supplyType: 'newspaper',
    unit: 'pieces',
    defaultQuantity: 1,
    defaultRatePerUnit: 5,
    startTime: '17:00',
    frequency: 'WEEKLY',
    status: 'active',
    assignedStaff: [],
    customerCount: 18,
    todayStats: zeroToday,
  },
  {
    id: 'list-3',
    name: 'Weekend Bread — Sector 22',
    supplyType: 'bread',
    unit: 'packets',
    defaultQuantity: 2,
    defaultRatePerUnit: 40,
    startTime: '07:15',
    frequency: 'MONTHLY',
    status: 'archived',
    assignedStaff: [
      { staffId: 'staff-2', staffName: 'Suresh Patel', phoneNumber: null, isPrimary: true },
    ],
    customerCount: 9,
    todayStats: zeroToday,
  },
]

/** Full detail for `list-1` (adds schedule days + month stats). */
export const mockSupplyListDetail: SupplyListDto = {
  ...morningMilkList,
  frequencyDays: [],
  monthStats: zeroMonth,
}

/** Subscriptions for `list-1` — a mix of statuses, custom overrides, and other-lists. */
export const mockSubscriptions: SubscriptionDto[] = [
  {
    subscriptionId: 'sub-1',
    customerId: 'cust-1',
    customerName: 'Anita Sharma',
    phoneNumber: '+919876500011',
    address: 'A-101, Tower A',
    quantity: 1,
    ratePerUnit: 60,
    amount: 60,
    isCustomQuantity: false,
    isCustomRate: false,
    startDate: '2026-05-01',
    status: 'active',
    otherLists: ['Evening Newspaper — Tower A'],
    otherListsCount: 1,
  },
  {
    subscriptionId: 'sub-2',
    customerId: 'cust-2',
    customerName: 'Mohammed Irfan',
    phoneNumber: '+919876500012',
    address: 'B-204, Tower B',
    quantity: 2,
    ratePerUnit: 55,
    amount: 110,
    isCustomQuantity: true,
    isCustomRate: true,
    startDate: '2026-05-03',
    status: 'paused',
    otherLists: ['Weekend Bread — Sector 22', 'Evening Newspaper — Tower A'],
    otherListsCount: 2,
  },
  {
    subscriptionId: 'sub-3',
    customerId: 'cust-3',
    customerName: 'Lakshmi Narayan',
    phoneNumber: '+919876500013',
    address: 'C-305, Tower C',
    quantity: 1,
    ratePerUnit: 60,
    amount: 60,
    isCustomQuantity: false,
    isCustomRate: false,
    startDate: '2026-04-20',
    status: 'ended',
    otherLists: [],
    otherListsCount: 0,
  },
]

/** Vendor customers eligible to be added to `list-1` (add-customers source). */
export const mockAvailableCustomers: AvailableCustomerDto[] = [
  {
    customerId: 'cust-4',
    name: 'Priya Verma',
    phone: '+919876500014',
    otherLists: ['Evening Newspaper — Tower A'],
    otherListsCount: 1,
  },
  {
    customerId: 'cust-5',
    name: 'Rahul Deshpande',
    phone: '+919876500015',
    otherLists: [],
    otherListsCount: 0,
  },
  {
    customerId: 'cust-6',
    name: 'Fatima Begum',
    phone: '+919876500016',
    otherLists: ['Weekend Bread — Sector 22', 'Evening Newspaper — Tower A', 'Morning Milk — Sector 15'],
    otherListsCount: 3,
  },
]

/**
 * Empty-available variant — simulates a vendor with no eligible customers (all already
 * subscribed, or no customers yet until US-008). Drives the Add-Customers empty state.
 */
export const mockAvailableCustomersEmpty: AvailableCustomerDto[] = []
