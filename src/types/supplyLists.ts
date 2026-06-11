/**
 * Supply Lists Type Definitions (US-005)
 * Purpose: DTOs + input types aligned with paycycle_api supply-list module contracts.
 *
 * These shapes are FROZEN against `paycycle_api/src/modules/supply-list/supply-list.types.ts`
 * (field names, nullability, unions). Do not invent or change them — coordinate with the
 * backend contract.
 *
 * Backend reconciliation invariants (see FEATURE_PLAN → Backend Reconciliation):
 *   R1  All ids are STRINGS (BigInt serialised) — never `number`.
 *   R3  `frequency` is UPPERCASE Prisma enum: DAILY | WEEKLY | MONTHLY.
 *   R4  `status` (list) is LOWERCASE: active | archived. Subscription status is
 *       LOWERCASE: active | paused | ended. Do NOT conflate with `frequency`.
 *   R7  `frequencyDays` is a number[] — WEEKLY → ISO 1..7 (Mon=1), MONTHLY → 1..31,
 *       DAILY → [].
 */

/** Supply schedule frequency (Prisma enum — uppercase). R3 */
export type SupplyFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

/** Derived list status (lowercase). R4 */
export type SupplyListStatus = 'active' | 'archived'

/** Subscription lifecycle status (lowercase). R4/R11 — `ended` is terminal. */
export type SubscriptionStatus = 'active' | 'paused' | 'ended'

/** Supply units offered when creating a list (selection over free text). */
export type SupplyUnit = 'ltr' | 'kg' | 'pieces' | 'grams' | 'numbers' | 'packets'

/** An assigned staff member as seen on a supply list. */
export interface AssignedStaffDto {
  staffId: string
  staffName: string | null
  phoneNumber?: string | null
  isPrimary: boolean
}

/** Today's delivery roll-up (zeroed by the backend stub until US-006). */
export interface TodayStatsDto {
  date: string
  delivered: number
  onLeave: number
  pending: number
  totalQuantity: number
}

/** This month's delivery roll-up (zeroed by the backend stub until US-006). */
export interface MonthStatsDto {
  month: string
  daysCompleted: number
  totalQuantity: number
  revenue: number
}

/** Row in the supply-list listing. All ids strings (R1). */
export interface SupplyListListDto {
  id: string
  name: string
  supplyType: string | null
  unit: string
  defaultQuantity: number | null
  defaultRatePerUnit: number | null
  startTime: string | null
  frequency: SupplyFrequency
  status: SupplyListStatus
  assignedStaff: AssignedStaffDto[]
  customerCount: number
  todayStats: TodayStatsDto
}

/** Full supply-list detail (adds schedule days + month stats). */
export interface SupplyListDto extends SupplyListListDto {
  frequencyDays: number[]
  monthStats: MonthStatsDto
}

/** A customer subscription as returned to clients. Carries PII — never persist. */
export interface SubscriptionDto {
  subscriptionId: string
  customerId: string
  customerName: string | null
  phoneNumber?: string | null
  address?: string | null
  quantity: number
  ratePerUnit: number
  amount: number
  isCustomQuantity: boolean
  isCustomRate: boolean
  startDate: string | null
  status: SubscriptionStatus
  otherLists: string[]
  otherListsCount: number
}

/** A vendor customer eligible to be added to a list (add-customers screen). */
export interface AvailableCustomerDto {
  customerId: string
  name: string | null
  phone: string | null
  otherLists: string[]
  otherListsCount: number
}

/** Bulk add-customers result (R5 — added/skipped summary). */
export interface AddCustomersResultDto {
  addedCount: number
  skippedCount: number
  subscriptions: SubscriptionDto[]
  skipped: { customerId: string; reason: string }[]
}

/** DELETE list response (R10). */
export interface ArchiveListResultDto {
  id: string
  status: 'archived'
}

/** DELETE subscription response (R10). */
export interface EndSubscriptionResultDto {
  subscriptionId: string
  status: 'ended'
  endDate: string
}

/** Pagination metadata returned alongside list responses. */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============================================================================
// INPUT TYPES (request bodies — frozen against backend zod validators)
// vendorId is NEVER part of the body: it is JWT-derived server-side (multi-tenancy).
// ============================================================================

/**
 * Create body. `frequencyDays` is required for WEEKLY (1..7) / MONTHLY (1..31) and
 * empty/omitted for DAILY (R7). `primaryStaffId` must be a member of `staffIds`.
 */
export interface CreateSupplyListInput {
  name: string
  supplyType?: string | null
  unit: SupplyUnit
  defaultQuantity?: number | null
  defaultRatePerUnit?: number | null
  startTime?: string
  frequency: SupplyFrequency
  frequencyDays?: number[]
  staffIds?: string[]
  primaryStaffId?: string
}

/** Update body (PATCH partial — at least one field; sends only changed fields). */
export interface UpdateSupplyListInput {
  name?: string
  supplyType?: string | null
  unit?: SupplyUnit
  defaultQuantity?: number | null
  defaultRatePerUnit?: number | null
  startTime?: string | null
  frequency?: SupplyFrequency
  frequencyDays?: number[]
}

/**
 * Add-customers body. `customQuantity` is required when `useDefaultQuantity` is false;
 * `customRate` is required when `useDefaultRate` is false.
 */
export interface AddCustomersInput {
  customerIds: string[]
  useDefaultQuantity?: boolean
  customQuantity?: number
  useDefaultRate?: boolean
  customRate?: number
  startDate?: string
}

/** Update-subscription body (R11 — only active⇄paused; ENDED is terminal). */
export interface UpdateSubscriptionInput {
  quantity?: number | null
  ratePerUnit?: number | null
  status?: 'active' | 'paused'
}
