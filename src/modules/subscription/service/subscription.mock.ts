/**
 * Subscription mock fixtures (US-009).
 * Deterministic data for dev/mock mode. Mirrors the API_SPEC shapes exactly.
 * Covers: Growth ACTIVE (85/100/50% usage), Pro unlimited, EXPIRED, and 2 invoices.
 */

import type {
  PlanDto,
  SubscriptionViewDto,
  UpgradeResultDto,
  RenewResultDto,
  CancelResultDto,
  AutoRenewalResultDto,
  InvoiceDto,
  HistoryEventDto,
  PaginationMeta,
} from '../../../types/subscription'

// ---------------------------------------------------------------------------
// Plan catalog (mirrors API_SPEC §1 exactly)
// ---------------------------------------------------------------------------

export const mockPlans: PlanDto[] = [
  {
    id: '1',
    planCode: 'STARTER',
    planName: 'Starter',
    maxCustomers: 20,
    maxStaff: 1,
    maxSupplyLists: 5,
    priceMonthly: 0,
    priceYearly: null,
    features: {
      basic_delivery_tracking: true,
      customer_management: true,
    },
  },
  {
    id: '2',
    planCode: 'GROWTH',
    planName: 'Growth',
    maxCustomers: 150,
    maxStaff: 3,
    maxSupplyLists: 10,
    priceMonthly: 499,
    priceYearly: 4990,
    features: {
      basic_delivery_tracking: true,
      customer_management: true,
      staff_management: true,
      analytics: true,
      whatsapp_notifications: true,
      credit_control: true,
    },
  },
  {
    id: '3',
    planCode: 'PRO',
    planName: 'Pro',
    maxCustomers: 0,
    maxStaff: 0,
    maxSupplyLists: 0,
    priceMonthly: 999,
    priceYearly: 9990,
    features: {
      basic_delivery_tracking: true,
      customer_management: true,
      staff_management: true,
      analytics: true,
      whatsapp_notifications: true,
      credit_control: true,
      advanced_reports: true,
      api_access: true,
      priority_support: true,
    },
  },
]

// ---------------------------------------------------------------------------
// Subscription views
// ---------------------------------------------------------------------------

/** Growth ACTIVE @ 85/100/50% — matches API_SPEC §2 + wireframe. */
export const mockSubscriptionView: SubscriptionViewDto = {
  currentPlan: {
    subscriptionId: '10',
    planId: '2',
    planCode: 'GROWTH',
    planName: 'Growth',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    startDate: '2026-04-01',
    endDate: null,
    nextBillingDate: '2026-05-01',
    autoRenewal: true,
    isTrial: false,
    limits: {
      maxCustomers: 150,
      maxStaff: 3,
      maxSupplyLists: 10,
    },
  },
  usage: {
    customers: 127,
    staff: 3,
    supplyLists: 5,
  },
  utilizationPercentage: {
    customers: 85,
    staff: 100,
    supplyLists: 50,
  },
  canAddMore: {
    customers: true,
    staff: false,
    supplyLists: true,
  },
}

/** Pro plan — unlimited limits (all maxes = 0). */
export function buildProSubscriptionView(): SubscriptionViewDto {
  return {
    currentPlan: {
      subscriptionId: '11',
      planId: '3',
      planCode: 'PRO',
      planName: 'Pro',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      startDate: '2026-04-15',
      endDate: null,
      nextBillingDate: '2026-05-15',
      autoRenewal: true,
      isTrial: false,
      limits: {
        maxCustomers: 0,
        maxStaff: 0,
        maxSupplyLists: 0,
      },
    },
    usage: {
      customers: 210,
      staff: 5,
      supplyLists: 12,
    },
    utilizationPercentage: {
      customers: 0,
      staff: 0,
      supplyLists: 0,
    },
    canAddMore: {
      customers: true,
      staff: true,
      supplyLists: true,
    },
  }
}

/** Expired subscription variant. */
export function buildExpiredSubscriptionView(): SubscriptionViewDto {
  return {
    currentPlan: {
      subscriptionId: '9',
      planId: '1',
      planCode: 'STARTER',
      planName: 'Starter',
      status: 'EXPIRED',
      billingCycle: 'MONTHLY',
      startDate: '2026-03-01',
      endDate: '2026-04-01',
      nextBillingDate: '2026-04-01',
      autoRenewal: false,
      isTrial: false,
      limits: {
        maxCustomers: 20,
        maxStaff: 1,
        maxSupplyLists: 5,
      },
    },
    usage: {
      customers: 18,
      staff: 1,
      supplyLists: 4,
    },
    utilizationPercentage: {
      customers: 90,
      staff: 100,
      supplyLists: 80,
    },
    canAddMore: {
      customers: false,
      staff: false,
      supplyLists: false,
    },
  }
}

// ---------------------------------------------------------------------------
// Mock invoices
// ---------------------------------------------------------------------------

export const mockInvoices: InvoiceDto[] = [
  {
    id: '55',
    invoiceNumber: 'INV-2026-04-001',
    amount: 499,
    tax: 0,
    totalAmount: 499,
    invoiceDate: '2026-04-01',
    dueDate: '2026-04-06',
    paymentStatus: 'PAID',
    paymentDate: '2026-04-02',
    paymentMethod: 'UPI',
    paymentReference: 'UPI123456',
  },
  {
    id: '56',
    invoiceNumber: 'INV-2026-05-001',
    amount: 499,
    tax: 0,
    totalAmount: 499,
    invoiceDate: '2026-05-01',
    dueDate: '2026-05-06',
    paymentStatus: 'PENDING',
    paymentDate: null,
    paymentMethod: null,
    paymentReference: null,
  },
]

export const mockInvoicesMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
}

// ---------------------------------------------------------------------------
// Mock history events (service-parity; not surfaced in MVP UI — OQ-9)
// ---------------------------------------------------------------------------

export const mockHistoryEvents: HistoryEventDto[] = [
  {
    id: '200',
    eventType: 'UPGRADED',
    oldPlanName: 'Starter',
    newPlanName: 'Growth',
    reason: null,
    performedByUserId: '5',
    createdAt: '2026-04-01T06:00:00.000Z',
  },
  {
    id: '199',
    eventType: 'CREATED',
    oldPlanName: null,
    newPlanName: 'Starter',
    reason: null,
    performedByUserId: null,
    createdAt: '2026-01-01T06:00:00.000Z',
  },
]

export const mockHistoryMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
}

// ---------------------------------------------------------------------------
// Result builders (upgrade / renew / cancel / auto-renewal)
// ---------------------------------------------------------------------------

export function buildUpgradeResult(): UpgradeResultDto {
  return {
    subscription: {
      subscriptionId: '11',
      planId: '3',
      planCode: 'PRO',
      planName: 'Pro',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      startDate: '2026-04-15',
      endDate: null,
      nextBillingDate: '2026-05-15',
      autoRenewal: true,
    },
    invoice: {
      id: '57',
      invoiceNumber: 'INV-2026-04-002',
      amount: 250,
      tax: 0,
      totalAmount: 250,
      invoiceDate: '2026-04-15',
      dueDate: '2026-04-20',
      paymentStatus: 'PENDING',
      paymentUrl: 'https://payment.paycycle.app/invoice/57',
    },
  }
}

export function buildRenewResult(): RenewResultDto {
  return {
    subscription: {
      subscriptionId: '10',
      planId: '2',
      planCode: 'GROWTH',
      planName: 'Growth',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      startDate: '2026-05-01',
      endDate: null,
      nextBillingDate: '2026-06-01',
      autoRenewal: true,
    },
    invoice: {
      id: '58',
      invoiceNumber: 'INV-2026-05-002',
      amount: 499,
      tax: 0,
      totalAmount: 499,
      invoiceDate: '2026-05-01',
      dueDate: '2026-05-06',
      paymentStatus: 'PENDING',
      paymentUrl: 'https://payment.paycycle.app/invoice/58',
    },
  }
}

export function buildCancelResult(): CancelResultDto {
  return {
    subscriptionId: '10',
    status: 'CANCELLED',
    autoRenewal: false,
    activeUntil: '2026-05-01',
  }
}

export function buildAutoRenewalResult(enabled: boolean): AutoRenewalResultDto {
  return {
    subscriptionId: '10',
    autoRenewal: enabled,
  }
}
