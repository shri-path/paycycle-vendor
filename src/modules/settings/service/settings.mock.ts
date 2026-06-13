/**
 * Settings mock fixtures (US-011).
 * Deterministic data for dev/mock mode. Mirrors the US-011 API contract shapes.
 *
 * Edge cases covered:
 *   - all notification channels enabled (default)
 *   - auto-send bills enabled with a scheduled time
 *   - credit limit with warn action
 *   - bulk leave affecting multiple customers with revenue impact
 *   - bulk rate adjustment (increase) with customer notification
 *   - bulk reminders with partial delivery failures
 */

import type {
  VendorSettingsDto,
  BulkLeaveImpactDto,
  BulkLeaveResultDto,
  BulkRateImpactDto,
  BulkRateResultDto,
  BulkReminderResultDto,
} from '../../../types/settings'

// ---------------------------------------------------------------------------
// Vendor Settings
// ---------------------------------------------------------------------------

export const mockVendorSettings: VendorSettingsDto = {
  autoMarkEnabled: true,
  autoSendBillsEnabled: true,
  autoSendBillsTime: '20:00',
  defaultCreditLimit: 2000,
  defaultCreditAction: 'warn',
  notificationPreferences: {
    channels: {
      push: true,
      whatsapp: true,
      sms: false,
    },
    payment: {
      paymentReceived: true,
      outstandingAlert: true,
      creditLimitBreach: true,
    },
    customer: {
      customerMarkedLeave: true,
      customerAdjustedQty: false,
      newCustomerJoined: true,
      customerOverride: true,
    },
    operations: {
      lowStockAlert: true,
      staffActivitySummary: false,
      dailyDigest: true,
    },
  },
}

/** Edge case: all notifications off */
export const mockVendorSettingsAllOff: VendorSettingsDto = {
  ...mockVendorSettings,
  autoMarkEnabled: false,
  autoSendBillsEnabled: false,
  notificationPreferences: {
    channels: { push: false, whatsapp: false, sms: false },
    payment: { paymentReceived: false, outstandingAlert: false, creditLimitBreach: false },
    customer: {
      customerMarkedLeave: false,
      customerAdjustedQty: false,
      newCustomerJoined: false,
      customerOverride: false,
    },
    operations: { lowStockAlert: false, staffActivitySummary: false, dailyDigest: false },
  },
}

// ---------------------------------------------------------------------------
// Bulk Leave
// ---------------------------------------------------------------------------

export const mockBulkLeaveImpact: BulkLeaveImpactDto = {
  customersAffected: 28,
  days: 1,
  totalLeaves: 28,
  revenueImpact: -1680,
}

export const mockBulkLeaveResult: BulkLeaveResultDto = {
  operationId: 'bulk-leave-001',
  summary: {
    customersAffected: 28,
    days: 1,
    totalLeaves: 28,
    revenueImpact: -1680,
  },
}

/** Edge case: range leave covering multiple days */
export const mockBulkLeaveImpactMultiDay: BulkLeaveImpactDto = {
  customersAffected: 45,
  days: 3,
  totalLeaves: 135,
  revenueImpact: -8100,
}

// ---------------------------------------------------------------------------
// Bulk Rate Adjustment
// ---------------------------------------------------------------------------

export const mockBulkRateImpact: BulkRateImpactDto = {
  listsAffected: 1,
  customersAffected: 52,
  rateChange: 5,
  monthlyImpact: 7800,
}

export const mockBulkRateResult: BulkRateResultDto = {
  operationId: 'bulk-rate-001',
  summary: {
    listsAffected: 1,
    customersAffected: 52,
    rateChange: 5,
    monthlyImpact: 7800,
  },
}

/** Edge case: rate = 0 (free) */
export const mockBulkRateImpactFree: BulkRateImpactDto = {
  listsAffected: 1,
  customersAffected: 52,
  rateChange: -60,
  monthlyImpact: -3120,
}

// ---------------------------------------------------------------------------
// Bulk Send Reminders
// ---------------------------------------------------------------------------

export const mockBulkReminderResult: BulkReminderResultDto = {
  operationId: 'bulk-reminder-001',
  summary: {
    totalSent: 18,
    delivered: 16,
    failed: 2,
  },
}

/** Edge case: all delivered */
export const mockBulkReminderResultAllDelivered: BulkReminderResultDto = {
  operationId: 'bulk-reminder-002',
  summary: {
    totalSent: 12,
    delivered: 12,
    failed: 0,
  },
}
