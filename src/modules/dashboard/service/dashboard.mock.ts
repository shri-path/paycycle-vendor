/**
 * Dashboard mock fixtures (US-010).
 * Deterministic data for dev/mock mode. Mirrors the US-010 API contract shapes
 * exactly (user story §BACKEND RESPONSIBILITIES sample responses).
 *
 * Edge cases covered:
 *   - empty today list (EMPTY_OWNER_DASHBOARD)
 *   - all lists completed (ALL_COMPLETED_OWNER_DASHBOARD)
 *   - conflicts > 0 (default mockOwnerDashboard)
 *   - advance-credit customers present
 *   - 100% leave list → qty 0 (in mockForecast byList)
 *   - staff with pending deliveries
 */

import type {
  OwnerDashboardDto,
  StaffDashboardDto,
  SupplyForecastDto,
  OutstandingAgingDto,
  VendorSettingsDto,
} from '../../../types/dashboard'

// ---------------------------------------------------------------------------
// Owner Dashboard
// ---------------------------------------------------------------------------

export const mockOwnerDashboard: OwnerDashboardDto = {
  currentMonth: '2026-04',
  financial: {
    totalRevenue: 78600,
    collected: 65200,
    pending: 13400,
    collectionPercentage: 83,
    outstandingAging: {
      fresh_0_30: { amount: 8400, customerCount: 12 },
      overdue_30_60: { amount: 3800, customerCount: 5 },
      critical_60_plus: { amount: 1200, customerCount: 2 },
    },
    advanceCredit: 12500,
    netReceivable: 32700,
  },
  quickStats: {
    supplyListsCount: 5,
    totalCustomers: 127,
    activeStaff: 3,
    conflictsToday: 2,
  },
  autoMarkStatus: 'on',
  supplyForecast: {
    tomorrow: [
      { listName: 'Morning Milk', quantity: 85, unit: 'ltr', customerCount: 45 },
      { listName: 'Evening Milk', quantity: 76, unit: 'ltr', customerCount: 38 },
      { listName: 'Bread', quantity: 60, unit: 'pieces', customerCount: 30 },
    ],
  },
  todaySupplyLists: [
    {
      id: '10',
      name: 'Morning Milk',
      startTime: '06:00',
      staffName: 'Raju',
      progress: { completed: 45, total: 52, percentage: 87 },
      status: 'in_progress',
    },
    {
      id: '11',
      name: 'Morning Bread',
      startTime: '06:30',
      staffName: 'Raju',
      progress: { completed: 28, total: 30, percentage: 93 },
      status: 'in_progress',
    },
    {
      id: '12',
      name: 'Evening Milk',
      startTime: '17:00',
      staffName: 'Suresh',
      progress: { completed: 0, total: 38, percentage: 0 },
      status: 'not_started',
    },
  ],
}

/** Edge case: no deliveries today — financial cards still render. */
export const mockOwnerDashboardEmpty: OwnerDashboardDto = {
  ...mockOwnerDashboard,
  todaySupplyLists: [],
  quickStats: { ...mockOwnerDashboard.quickStats, conflictsToday: 0 },
}

/** Edge case: all lists completed — celebratory path. */
export const mockOwnerDashboardAllCompleted: OwnerDashboardDto = {
  ...mockOwnerDashboard,
  todaySupplyLists: mockOwnerDashboard.todaySupplyLists.map((l) => ({
    ...l,
    status: 'completed' as const,
    progress: { ...l.progress, completed: l.progress.total, percentage: 100 },
  })),
  quickStats: { ...mockOwnerDashboard.quickStats, conflictsToday: 0 },
}

// ---------------------------------------------------------------------------
// Staff Dashboard (NO monetary fields)
// ---------------------------------------------------------------------------

export const mockStaffDashboard: StaffDashboardDto = {
  date: '2026-04-12',
  staffName: 'Raju',
  todayProgress: {
    total: 82,
    completed: 73,
    percentage: 89,
  },
  assignedLists: [
    {
      id: '10',
      name: 'Morning Milk',
      startTime: '06:00',
      progress: { completed: 45, total: 52, percentage: 87 },
      status: 'in_progress',
    },
    {
      id: '11',
      name: 'Morning Bread',
      startTime: '06:30',
      progress: { completed: 28, total: 30, percentage: 93 },
      status: 'in_progress',
    },
  ],
  pendingCount: 9,
}

/** Edge case: no deliveries today (idle state). */
export const mockStaffDashboardEmpty: StaffDashboardDto = {
  ...mockStaffDashboard,
  todayProgress: { completed: 0, total: 0, percentage: 0 },
  assignedLists: [],
  pendingCount: 0,
}

// ---------------------------------------------------------------------------
// Supply Forecast
// ---------------------------------------------------------------------------

export const mockForecast: SupplyForecastDto = {
  date: '2026-04-13',
  byList: [
    {
      listId: '10',
      listName: 'Morning Milk',
      supplyType: 'milk',
      quantity: 85,
      unit: 'ltr',
      customerCount: 45,
      plannedLeaves: 3,
    },
    {
      listId: '11',
      listName: 'Evening Milk',
      supplyType: 'milk',
      quantity: 76,
      unit: 'ltr',
      customerCount: 38,
      plannedLeaves: 0,
    },
    {
      listId: '12',
      listName: 'Morning Bread',
      supplyType: 'bread',
      quantity: 60,
      unit: 'pieces',
      customerCount: 30,
      plannedLeaves: 0,
    },
    // Edge case #5: 100% leaves → qty 0
    {
      listId: '13',
      listName: 'Newspaper',
      supplyType: 'newspaper',
      quantity: 0,
      unit: 'copies',
      customerCount: 0,
      plannedLeaves: 15,
    },
  ],
  aggregatedByType: {
    milk: { totalQuantity: 161, unit: 'ltr', lists: ['Morning Milk', 'Evening Milk'] },
    bread: { totalQuantity: 60, unit: 'pieces', lists: ['Morning Bread'] },
    newspaper: { totalQuantity: 0, unit: 'copies', lists: ['Newspaper'] },
  },
  next7Days: {
    milk: { totalQuantity: 850, unit: 'ltr', dailyAverage: 121 },
    bread: { totalQuantity: 420, unit: 'pieces', dailyAverage: 60 },
    newspaper: { totalQuantity: 0, unit: 'copies', dailyAverage: 0 },
  },
}

// ---------------------------------------------------------------------------
// Outstanding Aging (Collections)
// ---------------------------------------------------------------------------

export const mockOutstandingAging: OutstandingAgingDto = {
  summary: {
    totalOutstanding: 45200,
    fresh_0_30: { amount: 28400, customerCount: 15 },
    overdue_30_60: { amount: 11800, customerCount: 8 },
    critical_60_plus: { amount: 5000, customerCount: 3 },
  },
  priorityCustomers: {
    high: [
      {
        customerId: '10',
        customerName: 'Sharma Family',
        outstanding: 5000,
        daysOverdue: 78,
        creditLimit: 5000,
        utilizationPercentage: 100,
        lastPaymentDate: '2025-11-15',
        paymentScore: 45,
      },
    ],
    medium: [
      {
        customerId: '11',
        customerName: 'Gupta Household',
        outstanding: 3200,
        daysOverdue: 45,
        creditLimit: 4000,
        utilizationPercentage: 80,
        lastPaymentDate: '2025-12-20',
        paymentScore: 62,
      },
      {
        customerId: '12',
        customerName: 'Patel Dairy',
        outstanding: 2100,
        daysOverdue: 38,
        creditLimit: 3000,
        utilizationPercentage: 70,
        lastPaymentDate: '2026-01-05',
        paymentScore: 68,
      },
    ],
    low: [
      {
        customerId: '13',
        customerName: 'Singh Family',
        outstanding: 1500,
        daysOverdue: 15,
        creditLimit: 5000,
        utilizationPercentage: 30,
        lastPaymentDate: '2026-03-10',
        paymentScore: 85,
      },
    ],
  },
  // Edge case #6: advance-credit customers (negative balance)
  advanceCredit: {
    totalAmount: 12500,
    customerCount: 6,
    customers: [
      {
        customerId: '20',
        customerName: 'Verma Family',
        creditBalance: -2500,
        monthsCovered: 2,
      },
      {
        customerId: '21',
        customerName: 'Kumar Household',
        creditBalance: -1800,
        monthsCovered: 1,
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Vendor Settings
// ---------------------------------------------------------------------------

export const mockVendorSettings: VendorSettingsDto = {
  autoMarkEnabled: true,
  autoSendBillsEnabled: false,
  autoSendBillsTime: '20:00',
}
