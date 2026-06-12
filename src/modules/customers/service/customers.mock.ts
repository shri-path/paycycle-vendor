/**
 * Customer mock data (US-008)
 * Purpose: deterministic mock responses for `customers.service` in mock mode.
 * - All ids are strings.
 * - Money fields are plain numbers (INR).
 * - `status` is UPPERCASE (`ACTIVE` | `INACTIVE`).
 * - `paymentStatus` is lowercase (`paid` | `pending` | `overdue`).
 * - `paymentMethod` is UPPERCASE (`CASH` | `ONLINE` | `UPI` | `OTHER`).
 * - Owner-only financial fields are populated in mock (screens gate display on null-check;
 *   the real backend nulls them for staff — the mock simulates owner view).
 */

import type {
  CustomerListItemDto,
  CustomerDetailDto,
  SubscriptionDto,
  MonthlyBillDto,
  CustomerCalendarDto,
  PaymentDto,
  PaymentStatus,
  PaymentMethod,
} from '../../../types/customer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = new Date().toISOString().slice(0, 10)

/** Current YYYY-MM for bill / calendar mocks. */
const THIS_MONTH = TODAY.slice(0, 7)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export const mockSubscriptions: SubscriptionDto[] = [
  {
    subscriptionId: '101',
    listId: '1',
    listName: 'Morning Milk',
    startTime: '06:00',
    quantity: 1,
    unit: 'litre',
    ratePerUnit: 60,
    frequency: 'DAILY',
    startDate: '2026-01-15',
    endDate: null,
    isActive: true,
    isCustomRate: false,
    isCustomQuantity: false,
  },
  {
    subscriptionId: '102',
    listId: '2',
    listName: 'Evening Milk',
    startTime: '18:00',
    quantity: 2,
    unit: 'litre',
    ratePerUnit: 55,
    frequency: 'DAILY',
    startDate: '2026-02-01',
    endDate: null,
    isActive: true,
    isCustomRate: true,
    isCustomQuantity: false,
  },
  {
    subscriptionId: '103',
    listId: '3',
    listName: 'Curd',
    startTime: '08:00',
    quantity: 500,
    unit: 'gm',
    ratePerUnit: 0.14,
    frequency: 'DAILY',
    startDate: '2026-03-01',
    endDate: null,
    isActive: true,
    isCustomRate: false,
    isCustomQuantity: true,
  },
]

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const mockPayments: PaymentDto[] = [
  {
    id: '501',
    amount: 4350,
    date: '2026-04-15',
    method: 'UPI' as PaymentMethod,
    reference: 'UPI123456',
    createdAt: '2026-04-15T08:30:00.000Z',
  },
  {
    id: '502',
    amount: 3200,
    date: '2026-03-20',
    method: 'CASH' as PaymentMethod,
    reference: null,
    createdAt: '2026-03-20T10:00:00.000Z',
  },
  {
    id: '503',
    amount: 5000,
    date: '2026-02-28',
    method: 'ONLINE' as PaymentMethod,
    reference: 'NEFT20260228',
    createdAt: '2026-02-28T09:15:00.000Z',
  },
  {
    id: '504',
    amount: 2800,
    date: '2026-01-31',
    method: 'UPI' as PaymentMethod,
    reference: 'UPI789012',
    createdAt: '2026-01-31T07:45:00.000Z',
  },
  {
    id: '505',
    amount: 1500,
    date: '2025-12-30',
    method: 'OTHER' as PaymentMethod,
    reference: 'CHEQUE001',
    createdAt: '2025-12-30T11:00:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Monthly Bill
// ---------------------------------------------------------------------------

export const mockMonthlyBill: MonthlyBillDto = {
  customerId: '10',
  customerName: 'Anil Kumar',
  month: THIS_MONTH,
  billDetails: {
    byList: [
      {
        listName: 'Morning Milk',
        deliveries: 28,
        leaves: 2,
        quantity: 1,
        unit: 'litre',
        ratePerUnit: 60,
        subtotal: 1680,
      },
      {
        listName: 'Evening Milk',
        deliveries: 30,
        leaves: 0,
        quantity: 2,
        unit: 'litre',
        ratePerUnit: 55,
        subtotal: 3300,
      },
    ],
    extraCharges: [
      {
        date: `${THIS_MONTH}-10`,
        amount: 50,
        reason: 'Festival sweets',
        listName: 'Morning Milk',
      },
    ],
    subtotal: 5030,
    previousDue: 800,
    totalDue: 5830,
  },
  paymentStatus: 'pending' as PaymentStatus,
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export function buildMockCalendar(month: string): CustomerCalendarDto {
  const parts = month.split('-')
  const year = parseInt(parts[0] ?? '2026', 10)
  const mon = parseInt(parts[1] ?? '01', 10)
  // Build ~20 days of entries for a realistic calendar
  const days: CustomerCalendarDto['days'] = {}

  for (let day = 1; day <= 30; day++) {
    const dateKey = isoDate(year, mon, day)
    // Days 5, 12, 19, 26 are leaves; odd days are DELIVERED; even days alternate
    if (day % 13 === 5) {
      days[dateKey] = {
        deliveries: [
          {
            listName: 'Morning Milk',
            quantity: 1,
            unit: 'litre',
            status: 'LEAVE',
            amount: null,
          },
        ],
      }
    } else {
      days[dateKey] = {
        deliveries: [
          {
            listName: 'Morning Milk',
            quantity: 1,
            unit: 'litre',
            status: 'DELIVERED',
            amount: 60,
          },
          {
            listName: 'Evening Milk',
            quantity: 2,
            unit: 'litre',
            status: day % 7 === 0 ? 'LEAVE' : 'DELIVERED',
            amount: day % 7 === 0 ? null : 110,
          },
        ],
      }
    }
  }

  return { month, days }
}

// ---------------------------------------------------------------------------
// CustomerDetailDto builder
// ---------------------------------------------------------------------------

export function buildMockCustomerDetail(
  id: string,
  overrides: Partial<CustomerDetailDto> = {},
): CustomerDetailDto {
  return {
    id,
    name: 'Anil Kumar',
    phoneNumber: '+919876543210',
    email: 'anil@example.com',
    address: 'Flat 402, Tower B, Sunshine Apartments',
    area: 'Sector 15',
    language: 'hi',
    customerSince: '2026-01-15',
    status: 'ACTIVE',
    creditLimit: 6000,
    currentBalance: 4350,
    paymentScore: 92,
    creditUtilization: 72.5,
    subscriptions: mockSubscriptions,
    currentMonthBill: {
      month: THIS_MONTH,
      subtotal: 5030,
      previousDue: 800,
      totalDue: 5830,
      status: 'pending',
    },
    paymentHistory: mockPayments.slice(0, 5),
    createdAt: '2026-01-15T06:00:00.000Z',
    updatedAt: '2026-04-15T08:30:00.000Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Customer list — ≥30 entries spanning A–Z
// ---------------------------------------------------------------------------

interface RawCustomer {
  id: string
  name: string
  phone: string
  area: string
  address: string
  lists: string[]
  monthlyTotal: number
  paymentStatus: PaymentStatus
  currentBalance: number
  paymentScore: number
  since: string
}

const RAW_CUSTOMERS: RawCustomer[] = [
  { id: '1',  name: 'Anil Kumar',       phone: '+919876543210', area: 'Sector 15',   address: 'Flat 402, Tower B',      lists: ['Morning Milk'],             monthlyTotal: 1860, paymentStatus: 'pending',  currentBalance: 2200, paymentScore: 92, since: '2026-01-15' },
  { id: '2',  name: 'Bhavesh Patel',    phone: '+919876543211', area: 'Koramangala', address: '14 Residency Rd',        lists: ['Evening Milk'],              monthlyTotal: 3300, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 98, since: '2025-11-01' },
  { id: '3',  name: 'Chitra Rao',       phone: '+919876543212', area: 'Indiranagar', address: '88 Hill St',             lists: ['Morning Milk', 'Curd'],      monthlyTotal: 5030, paymentStatus: 'overdue',  currentBalance: 5830, paymentScore: 61, since: '2025-09-10' },
  { id: '4',  name: 'Deepak Verma',     phone: '+919876543213', area: 'Whitefield',  address: '7 Garden Ln',            lists: ['Morning Milk'],             monthlyTotal: 1680, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 85, since: '2026-02-01' },
  { id: '5',  name: 'Esha Nair',        phone: '+919876543214', area: 'HSR Layout',  address: '21 River Rd',            lists: ['Evening Milk'],              monthlyTotal: 3300, paymentStatus: 'pending',  currentBalance: 1500, paymentScore: 74, since: '2026-03-15' },
  { id: '6',  name: 'Farida Sheikh',    phone: '+919876543215', area: 'Banjara Hills',address: '3 Palm Grove',          lists: ['Morning Milk', 'Evening Milk'],monthlyTotal: 5160, paymentStatus: 'paid',    currentBalance: 0,    paymentScore: 99, since: '2025-08-20' },
  { id: '7',  name: 'Ganesh Iyer',      phone: '+919876543216', area: 'T. Nagar',    address: '55 Lake View',           lists: ['Curd'],                      monthlyTotal: 2100, paymentStatus: 'pending',  currentBalance: 700,  paymentScore: 80, since: '2026-01-01' },
  { id: '8',  name: 'Hema Krishnan',    phone: '+919876543217', area: 'Anna Nagar',  address: '9 Sunflower St',         lists: ['Morning Milk'],             monthlyTotal: 1680, paymentStatus: 'overdue',  currentBalance: 3360, paymentScore: 55, since: '2025-07-15' },
  { id: '9',  name: 'Irfan Shaikh',     phone: '+919876543218', area: 'Mohammed Ali Rd', address: '12 Market Ln',      lists: ['Evening Milk', 'Curd'],      monthlyTotal: 5400, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 95, since: '2025-10-05' },
  { id: '10', name: 'Jaya Menon',       phone: '+919876543219', area: 'Panjim',      address: '6 Sea View Apts',        lists: ['Morning Milk'],             monthlyTotal: 1860, paymentStatus: 'pending',  currentBalance: 900,  paymentScore: 77, since: '2026-04-01' },
  { id: '11', name: 'Kamal Sharma',     phone: '+919876543220', area: 'Civil Lines', address: '33 Patel Nagar',         lists: ['Morning Milk', 'Curd'],      monthlyTotal: 3780, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 90, since: '2025-12-10' },
  { id: '12', name: 'Lakshmi Devi',     phone: '+919876543221', area: 'Rajajinagar', address: '17 Temple Rd',           lists: ['Evening Milk'],              monthlyTotal: 3300, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 97, since: '2025-06-01' },
  { id: '13', name: 'Mahesh Gupta',     phone: '+919876543222', area: 'Lajpat Nagar',address: '8 Ring Rd',             lists: ['Morning Milk'],             monthlyTotal: 1680, paymentStatus: 'overdue',  currentBalance: 5040, paymentScore: 43, since: '2025-05-20' },
  { id: '14', name: 'Nandita Sen',      phone: '+919876543223', area: 'Salt Lake',   address: '22 Block B',             lists: ['Morning Milk', 'Evening Milk'],monthlyTotal: 4980, paymentStatus: 'pending', currentBalance: 2500, paymentScore: 68, since: '2026-01-20' },
  { id: '15', name: 'Omar Farooq',      phone: '+919876543224', area: 'Shivajinagar',address: '45 Camp Rd',            lists: ['Curd'],                      monthlyTotal: 2100, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 88, since: '2025-11-11' },
  { id: '16', name: 'Priya Kapoor',     phone: '+919876543225', area: 'Powai',       address: '101 Hiranandani',        lists: ['Morning Milk'],             monthlyTotal: 1860, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 93, since: '2026-02-14' },
  { id: '17', name: 'Qasim Ali',        phone: '+919876543226', area: 'Frazer Town', address: '78 Murphy Rd',           lists: ['Evening Milk', 'Curd'],      monthlyTotal: 5400, paymentStatus: 'pending',  currentBalance: 1200, paymentScore: 82, since: '2025-09-01' },
  { id: '18', name: 'Rekha Pillai',     phone: '+919876543227', area: 'Thampanoor',  address: '5 MG Rd',               lists: ['Morning Milk'],             monthlyTotal: 1680, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 96, since: '2025-10-25' },
  { id: '19', name: 'Suresh Babu',      phone: '+919876543228', area: 'Ameerpet',    address: '34 SR Nagar',            lists: ['Morning Milk', 'Evening Milk', 'Curd'], monthlyTotal: 7230, paymentStatus: 'pending', currentBalance: 3600, paymentScore: 71, since: '2025-08-08' },
  { id: '20', name: 'Tanvi Joshi',      phone: '+919876543229', area: 'Kothrud',     address: '19 Senapati Bapat Rd',   lists: ['Evening Milk'],              monthlyTotal: 3300, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 99, since: '2026-03-01' },
  { id: '21', name: 'Usha Rani',        phone: '+919876543230', area: 'Manorama',    address: '2 Jyothi Nivas Rd',      lists: ['Morning Milk'],             monthlyTotal: 1860, paymentStatus: 'overdue',  currentBalance: 3720, paymentScore: 49, since: '2025-07-07' },
  { id: '22', name: 'Vikram Singh',     phone: '+919876543231', area: 'Hazratganj',  address: '67 Lucknow Rd',          lists: ['Curd'],                      monthlyTotal: 2100, paymentStatus: 'pending',  currentBalance: 800,  paymentScore: 75, since: '2026-01-08' },
  { id: '23', name: 'Wasim Khan',       phone: '+919876543232', area: 'Bhopal',      address: '11 MP Nagar',            lists: ['Morning Milk', 'Curd'],      monthlyTotal: 3780, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 87, since: '2025-12-20' },
  { id: '24', name: 'Xavier D\'Souza',  phone: '+919876543233', area: 'Panjim',      address: '3 Fontainhas',           lists: ['Evening Milk'],              monthlyTotal: 3300, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 94, since: '2025-06-15' },
  { id: '25', name: 'Yamini Reddy',     phone: '+919876543234', area: 'Jubilee Hills',address: '99 Road No. 12',        lists: ['Morning Milk', 'Evening Milk'],monthlyTotal: 4980, paymentStatus: 'pending', currentBalance: 1800, paymentScore: 79, since: '2026-02-20' },
  { id: '26', name: 'Zaheer Abbas',     phone: '+919876543235', area: 'Abids',       address: '14 Nampally',            lists: ['Morning Milk'],             monthlyTotal: 1680, paymentStatus: 'overdue',  currentBalance: 5040, paymentScore: 38, since: '2025-05-01' },
  { id: '27', name: 'Arjun Mehta',      phone: '+919876543236', area: 'Andheri',     address: '52 Four Bungalows',      lists: ['Morning Milk', 'Curd'],      monthlyTotal: 3780, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 91, since: '2025-11-30' },
  { id: '28', name: 'Beena Thomas',     phone: '+919876543237', area: 'Kakkanad',    address: '8 Infopark Rd',          lists: ['Evening Milk'],              monthlyTotal: 3300, paymentStatus: 'pending',  currentBalance: 1600, paymentScore: 72, since: '2026-01-25' },
  { id: '29', name: 'Dinesh Chawla',    phone: '+919876543238', area: 'Pitampura',   address: '37 Netaji Subhash',      lists: ['Morning Milk'],             monthlyTotal: 1860, paymentStatus: 'paid',     currentBalance: 0,    paymentScore: 89, since: '2025-10-10' },
  { id: '30', name: 'Geeta Bhatt',      phone: '+919876543239', area: 'Navrangpura', address: '21 CG Rd',               lists: ['Morning Milk', 'Evening Milk'],monthlyTotal: 4980, paymentStatus: 'paid',    currentBalance: 0,    paymentScore: 96, since: '2025-09-05' },
  { id: '31', name: 'Harish Jain',      phone: '+919876543240', area: 'Sindhi Colony',address: '5 Ratlam',              lists: ['Curd'],                      monthlyTotal: 2100, paymentStatus: 'pending',  currentBalance: 400,  paymentScore: 83, since: '2026-04-10' },
  { id: '32', name: 'Indira Pandey',    phone: '+919876543241', area: 'Allahabad',   address: '60 Tagore Town',         lists: ['Morning Milk'],             monthlyTotal: 1680, paymentStatus: 'overdue',  currentBalance: 6720, paymentScore: 30, since: '2025-04-01' },
]

/** Full list of mock customers (owner view — all financial fields populated). */
export const mockCustomerList: CustomerListItemDto[] = RAW_CUSTOMERS.map((c) => ({
  id: c.id,
  name: c.name,
  phoneNumber: c.phone,
  address: c.address,
  area: c.area,
  customerSince: c.since,
  status: 'ACTIVE',
  supplyLists: c.lists,
  monthlyTotal: c.monthlyTotal,
  paymentStatus: c.paymentStatus,
  currentBalance: c.currentBalance,
  paymentScore: c.paymentScore,
}))

// ---------------------------------------------------------------------------
// Mock subscription for addSubscription response
// ---------------------------------------------------------------------------

export function buildMockSubscription(
  overrides: Partial<SubscriptionDto> = {},
): SubscriptionDto {
  return {
    subscriptionId: `sub-mock-${Date.now()}`,
    listId: '4',
    listName: 'Buttermilk',
    startTime: '07:00',
    quantity: 500,
    unit: 'ml',
    ratePerUnit: 20,
    frequency: 'DAILY',
    startDate: TODAY,
    endDate: null,
    isActive: true,
    isCustomRate: false,
    isCustomQuantity: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mock payment for recordPayment response
// ---------------------------------------------------------------------------

export function buildMockPayment(
  amount: number,
  method: PaymentMethod = 'CASH',
  reference: string | null = null,
): PaymentDto {
  return {
    id: `pay-mock-${Date.now()}`,
    amount,
    date: TODAY,
    method,
    reference,
    createdAt: new Date().toISOString(),
  }
}
