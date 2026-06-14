/**
 * Credit Service Mock Fixtures (US-012)
 * Realistic data matching wireframe numbers for all GET responses.
 */

import type {
  CollectionsDashboardDto,
  PriorityListDto,
  CollectionAnalyticsDto,
  AgingDto,
  ReminderConfigDto,
  ReminderHistoryDto,
  BulkReminderResultDto,
  CreditSettingsResultDto,
  EnablePrepaidResultDto,
  SendReminderResultDto,
} from '../../../types/credit'

export const mockDashboard: CollectionsDashboardDto = {
  outstandingOverview: {
    totalOutstanding: 48500,
    fresh_0_30: { amount: 22000, customerCount: 18 },
    overdue_30_60: { amount: 15500, customerCount: 9 },
    critical_60_plus: { amount: 11000, customerCount: 5 },
  },
  advanceCredit: { totalAmount: 3200, customerCount: 4 },
  netReceivable: 45300,
  thisMonthProgress: {
    totalBilled: 72000,
    collected: 54000,
    percentage: 75,
    target: 70000,
    gap: 16000,
  },
  customersAtLimit: [
    { customerId: '11', name: 'Rajesh Kumar', utilizationPercentage: 100 },
    { customerId: '14', name: 'Priya Sharma', utilizationPercentage: 97 },
    { customerId: '22', name: 'Mohan Verma', utilizationPercentage: 95 },
  ],
}

export const mockPriorityList: PriorityListDto = {
  highPriority: [
    {
      customerId: '11',
      customerName: 'Rajesh Kumar',
      phoneNumber: '9876543210',
      outstanding: 8500,
      daysOverdue: 72,
      creditLimit: 8000,
      utilizationPercentage: 106,
      lastPaymentDate: null,
      paymentScore: 2,
      creditType: 'normal',
    },
    {
      customerId: '14',
      customerName: 'Priya Sharma',
      phoneNumber: '9876543211',
      outstanding: 6200,
      daysOverdue: 65,
      creditLimit: 6400,
      utilizationPercentage: 97,
      lastPaymentDate: '2026-04-10',
      paymentScore: 3,
      creditType: 'normal',
    },
  ],
  mediumPriority: [
    {
      customerId: '22',
      customerName: 'Mohan Verma',
      phoneNumber: '9876543212',
      outstanding: 4800,
      daysOverdue: 38,
      creditLimit: 5000,
      utilizationPercentage: 96,
      lastPaymentDate: '2026-05-01',
      paymentScore: 5,
      creditType: 'normal',
    },
  ],
  lowPriority: [
    {
      customerId: '30',
      customerName: 'Sunita Rao',
      phoneNumber: '9876543213',
      outstanding: 1200,
      daysOverdue: 12,
      creditLimit: 3000,
      utilizationPercentage: 40,
      lastPaymentDate: '2026-06-01',
      paymentScore: 8,
      creditType: 'normal',
    },
  ],
  advanceCredit: [
    { customerId: '5', customerName: 'Deepak Jain', creditBalance: -1500, monthsCovered: 2 },
    { customerId: '8', customerName: 'Anita Patel', creditBalance: -900, monthsCovered: 1 },
  ],
}

export const mockAnalytics: CollectionAnalyticsDto = {
  month: '2026-06',
  monthlySummary: {
    totalBilled: 72000,
    collected: 54000,
    outstanding: 18000,
    collectionPercentage: 75,
    target: 70000,
  },
  paymentModeBreakdown: {
    upi: { amount: 28000, percentage: 52 },
    cash: { amount: 15000, percentage: 28 },
    bank: { amount: 6000, percentage: 11 },
    online: { amount: 3000, percentage: 6 },
    other: { amount: 2000, percentage: 3 },
  },
  collectionTrend: [
    { month: '2026-01', percentage: 68 },
    { month: '2026-02', percentage: 72 },
    { month: '2026-03', percentage: 70 },
    { month: '2026-04', percentage: 78 },
    { month: '2026-05', percentage: 74 },
    { month: '2026-06', percentage: 75 },
  ],
  topPayers: [
    { customerId: '5', customerName: 'Deepak Jain', amount: 4500 },
    { customerId: '8', customerName: 'Anita Patel', amount: 3800 },
    { customerId: '12', customerName: 'Kavya Nair', amount: 3200 },
  ],
  defaulters: [
    { customerId: '11', customerName: 'Rajesh Kumar', amount: 8500, daysOverdue: 72 },
    { customerId: '14', customerName: 'Priya Sharma', amount: 6200, daysOverdue: 65 },
  ],
}

export const mockAging: AgingDto = {
  totalOutstanding: 48500,
  fresh_0_30: { amount: 22000, customerCount: 18 },
  overdue_30_60: { amount: 15500, customerCount: 9 },
  critical_60_plus: { amount: 11000, customerCount: 5 },
}

export const mockReminderConfig: ReminderConfigDto = {
  autoRemindersEnabled: false,
  schedule3Days: true,
  schedule15Days: true,
  schedule30Days: true,
  reminderTemplate: null,
  excludedCustomerIds: [],
}

export const mockReminderHistory: ReminderHistoryDto = {
  totalReminders: 3,
  successRate: 67,
  reminders: [
    {
      id: 'rem-1',
      amountDue: 8500,
      reminderDate: '2026-06-10',
      sentVia: 'whatsapp',
      status: 'delivered',
      responseType: 'paid_partial',
      responseAmount: 2000,
    },
    {
      id: 'rem-2',
      amountDue: 8500,
      reminderDate: '2026-05-25',
      sentVia: 'whatsapp',
      status: 'sent',
      responseType: null,
      responseAmount: null,
    },
    {
      id: 'rem-3',
      amountDue: 10500,
      reminderDate: '2026-05-10',
      sentVia: 'whatsapp',
      status: 'failed',
      responseType: null,
      responseAmount: null,
    },
  ],
}

export const mockCreditSettingsResult: CreditSettingsResultDto = {
  customerId: '11',
  creditType: 'normal',
  creditLimit: 8000,
  warningThreshold: 80,
  actionOnBreach: 'warn',
  minimumBalanceWarning: null,
  currentBalance: 8500,
  creditUtilization: 106,
  breached: true,
  deliveriesPaused: false,
  warning: 'limit_below_outstanding',
}

export const mockEnablePrepaidSuccess: EnablePrepaidResultDto = {
  customerId: '11',
  creditType: 'prepaid',
  minimumBalanceWarning: 500,
  clearOutstandingRequired: false,
}

export const mockEnablePrepaidBlocked: EnablePrepaidResultDto = {
  customerId: '11',
  creditType: 'normal',
  clearOutstandingRequired: true,
  outstanding: 8500,
}

export const mockSendReminderResult: SendReminderResultDto = {
  reminderId: 'rem-99',
  customerId: '11',
  amountDue: 8500,
  sentVia: 'whatsapp',
  status: 'sent',
  reminderDate: new Date().toISOString().slice(0, 10),
  skipped: false,
  skipReason: null,
}

export const mockBulkReminderResult: BulkReminderResultDto = {
  sent: 18,
  skipped: 4,
  failed: 1,
}
