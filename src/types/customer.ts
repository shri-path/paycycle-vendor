/**
 * Customer Type Definitions (US-008)
 *
 * All shapes frozen against the paycycle_api API_SPEC (customer-management).
 * - All ids are strings (BigInt serialised as string on the server).
 * - Money fields are `number`.
 * - `status` is UPPERCASE (`ACTIVE | INACTIVE`).
 * - `paymentStatus` is lowercase (`paid | pending | overdue`).
 * - `paymentMethod` is UPPERCASE (`CASH | ONLINE | UPI | OTHER`).
 * - `vendorId` is NEVER sent from the client — it is JWT-derived on the server.
 */

export type CustomerStatus = 'ACTIVE' | 'INACTIVE'
export type PaymentStatus = 'paid' | 'pending' | 'overdue'
export type PaymentMethod = 'CASH' | 'ONLINE' | 'UPI' | 'OTHER'
export type CustomerStatusFilter = 'all' | 'paid' | 'pending' | 'overdue'

/** Row returned by GET /customers list. Financial fields are owner-only → number | null. */
export interface CustomerListItemDto {
  id: string
  name: string
  phoneNumber: string
  address: string | null
  area: string | null
  customerSince: string                  // YYYY-MM-DD
  status: CustomerStatus
  supplyLists: string[]                  // list names
  monthlyTotal: number | null            // owner-only
  paymentStatus: PaymentStatus | null    // owner-only
  currentBalance: number | null          // owner-only
  paymentScore: number | null            // owner-only
}

export interface SubscriptionDto {
  subscriptionId: string
  listId: string
  listName: string
  startTime: string                      // "18:00"
  quantity: number
  unit: string
  ratePerUnit: number
  frequency: string                      // "DAILY"
  startDate: string
  endDate: string | null
  isActive: boolean
  isCustomRate: boolean
  isCustomQuantity: boolean
}

export interface CurrentMonthBillSummary {
  month: string                          // YYYY-MM
  subtotal: number
  previousDue: number
  totalDue: number
  status: PaymentStatus
}

export interface PaymentDto {
  id: string
  amount: number
  date: string                           // YYYY-MM-DD
  method: PaymentMethod
  reference: string | null
  createdAt: string                      // ISO datetime
}

/**
 * Returned by create (201), get-detail (200), update (200).
 * Owner-only fields are null for staff: currentBalance, creditUtilization,
 * currentMonthBill, paymentHistory.
 */
export interface CustomerDetailDto {
  id: string
  name: string
  phoneNumber: string
  email: string | null
  address: string | null
  area: string | null
  language: string | null
  customerSince: string
  status: CustomerStatus
  creditLimit: number
  currentBalance: number | null          // owner-only
  paymentScore: number | null            // owner-only
  creditUtilization: number | null       // owner-only
  subscriptions: SubscriptionDto[]
  currentMonthBill: CurrentMonthBillSummary | null  // owner-only
  paymentHistory: PaymentDto[]           // owner-only (empty for staff)
  createdAt: string
  updatedAt: string
}

// GET .../bill/:month
export interface BillListLine {
  listName: string
  deliveries: number
  leaves: number
  quantity: number
  unit: string
  ratePerUnit: number
  subtotal: number
}

export interface BillExtraCharge {
  date: string
  amount: number
  reason: string
  listName: string
}

export interface MonthlyBillDto {
  customerId: string
  customerName: string
  month: string
  billDetails: {
    byList: BillListLine[]
    extraCharges: BillExtraCharge[]
    subtotal: number
    previousDue: number
    totalDue: number
  }
  paymentStatus: PaymentStatus
}

// GET .../calendar/:month  (reuse delivery calendar component if shape-compatible)
export interface CalendarDelivery {
  listName: string
  quantity: number
  unit: string
  status: string                         // UPPERCASE e.g. DELIVERED, LEAVE
  amount: number | null                  // owner-only
}

export interface CustomerCalendarDto {
  month: string
  days: Record<string, { deliveries: CalendarDelivery[] }>  // keyed YYYY-MM-DD
}

export interface SetCreditLimitResult {
  creditLimit: number
  creditUtilization: number
}

// ----- Input types (vendorId never sent — JWT-derived on server) -----

export interface CreateCustomerInput {
  name: string
  phone: string
  phoneCountryCode?: string              // default "+91"
  email?: string
  address?: string
  area?: string
  language?: string
  supplyListIds?: string[]               // default []
  startDate?: string                     // YYYY-MM-DD
  creditLimit?: number                   // default 0
  sendInvite?: boolean                   // default false
}

export interface UpdateCustomerInput {
  name?: string
  phone?: string
  email?: string
  address?: string
  area?: string
  language?: string
  status?: CustomerStatus
}

export interface AddSubscriptionInput {
  supplyListId: string
  startDate?: string
  customQuantity?: number | null
  customRatePerUnit?: number | null
}

export interface RecordPaymentInput {
  amount: number
  paymentDate: string                    // YYYY-MM-DD
  paymentMethod: PaymentMethod
  referenceNumber?: string
}

/** Standard pagination meta envelope (used by the payments list endpoint). */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
