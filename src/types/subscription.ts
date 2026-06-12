/**
 * Subscription & Pricing Type Definitions (US-009)
 *
 * All shapes frozen against the paycycle_api API_SPEC
 * (`docs/features/us-009-subscription-pricing/API_SPEC.md`).
 *
 * Conventions:
 * - All ids are strings (BigInt serialised as string on the server).
 * - Money fields are plain `number` (INR, 2-decimal precision).
 * - Dates are ISO8601: `date` fields are `YYYY-MM-DD`; timestamps are full ISO.
 * - `max* = 0` means "Unlimited". Render `0` as "Unlimited" everywhere.
 * - Enums are UPPERCASE.
 * - `vendorId` is NEVER sent from the client — it is JWT-derived on the server.
 * - `currentSubscription` and `invoices` carry billing PII → IN-MEMORY ONLY.
 * - Only the `plans` catalog (public, non-PII) is persisted across restarts.
 */

/** Available subscription plan tiers. */
export type PlanCode = 'STARTER' | 'GROWTH' | 'PRO'

/** Billing cycle for subscription payments. */
export type BillingCycle = 'MONTHLY' | 'YEARLY'

/** Lifecycle status of a vendor subscription. */
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'

/** Payment status of an invoice. */
export type InvoicePaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE'

/** Event types recorded in subscription history. */
export type SubscriptionEventType =
  | 'CREATED'
  | 'UPGRADED'
  | 'DOWNGRADED'
  | 'RENEWED'
  | 'CANCELLED'
  | 'EXPIRED'

/** Plan feature flags — truthy keys indicate supported features. */
export type PlanFeatures = Record<string, boolean>

/** Plan from the catalog (GET /subscription-plans). */
export interface PlanDto {
  id: string
  planCode: PlanCode
  planName: string
  maxCustomers: number   // 0 = Unlimited
  maxStaff: number       // 0 = Unlimited
  maxSupplyLists: number // 0 = Unlimited
  priceMonthly: number
  priceYearly: number | null
  features: PlanFeatures
}

/** Resource limits embedded in CurrentPlanDto. */
export interface SubscriptionLimits {
  maxCustomers: number
  maxStaff: number
  maxSupplyLists: number
}

/** Current plan detail embedded in SubscriptionViewDto. */
export interface CurrentPlanDto {
  subscriptionId: string
  planId: string
  planCode: PlanCode
  planName: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  startDate: string        // YYYY-MM-DD
  endDate: string | null   // null = currently active (no scheduled end)
  nextBillingDate: string  // YYYY-MM-DD
  autoRenewal: boolean
  isTrial: boolean         // always false this iteration
  limits: SubscriptionLimits
}

/** Live resource usage counts. */
export interface UsageCounts {
  customers: number
  staff: number
  supplyLists: number
}

/** Usage as percentage of the limit (0 for unlimited limits). */
export interface UtilizationPercentage {
  customers: number
  staff: number
  supplyLists: number
}

/** Whether more resources can be added (false when at limit). */
export interface CanAddMore {
  customers: boolean
  staff: boolean
  supplyLists: boolean
}

/** Full payload of GET /vendors/:id/subscription. */
export interface SubscriptionViewDto {
  currentPlan: CurrentPlanDto
  usage: UsageCounts
  utilizationPercentage: UtilizationPercentage
  canAddMore: CanAddMore
}

/** Minimal subscription shape returned inside upgrade/renew results. */
export interface SubscriptionResultItem {
  subscriptionId: string
  planId: string
  planCode: PlanCode
  planName: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  startDate: string
  endDate: string | null
  nextBillingDate: string
  autoRenewal: boolean
}

/** Invoice embedded in upgrade/renew results. */
export interface ResultInvoiceItem {
  id: string
  invoiceNumber: string
  amount: number
  tax: number
  totalAmount: number
  invoiceDate: string
  dueDate: string
  paymentStatus: InvoicePaymentStatus
  paymentUrl: string // stub this iteration — never open
}

/** Response payload for POST .../upgrade. */
export interface UpgradeResultDto {
  subscription: SubscriptionResultItem
  invoice: ResultInvoiceItem
}

/** Response payload for POST .../renew. */
export interface RenewResultDto {
  subscription: SubscriptionResultItem
  invoice: ResultInvoiceItem
}

/** Response payload for POST .../cancel. */
export interface CancelResultDto {
  subscriptionId: string
  status: SubscriptionStatus
  autoRenewal: boolean
  activeUntil: string // = nextBillingDate; full access until this date
}

/** Response payload for PATCH .../auto-renewal. */
export interface AutoRenewalResultDto {
  subscriptionId: string
  autoRenewal: boolean
}

/** One invoice row (GET .../invoices list item or embedded in upgrade/renew). */
export interface InvoiceDto {
  id: string
  invoiceNumber: string
  amount: number
  tax: number
  totalAmount: number
  invoiceDate: string      // YYYY-MM-DD
  dueDate: string          // YYYY-MM-DD
  paymentStatus: InvoicePaymentStatus
  paymentDate: string | null
  paymentMethod: string | null
  paymentReference: string | null
}

/** One event in the subscription history (GET .../history). */
export interface HistoryEventDto {
  id: string
  eventType: SubscriptionEventType
  oldPlanName: string | null
  newPlanName: string | null
  reason: string | null
  performedByUserId: string | null
  createdAt: string // ISO8601
}

/** Pagination metadata (mirrors customers/audit stores). */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Request inputs
// ---------------------------------------------------------------------------

/** Body for POST .../upgrade. */
export interface UpgradeInput {
  newPlanId: string
  billingCycle: BillingCycle
}

/** Body for POST .../renew. */
export interface RenewInput {
  billingCycle: BillingCycle
}

/** Options for GET .../invoices and .../history (paginated). */
export interface ListInvoicesOptions {
  page?: number
  limit?: number
}
