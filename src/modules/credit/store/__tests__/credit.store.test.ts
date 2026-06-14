/**
 * Credit Store Tests — T-26 (US-012)
 * Covers: query happy/error paths, command rethrow, skip-outcome (no refetch),
 *         per-card remind guard (`remindingCustomerIds`), clearCredit,
 *         historyMeta pagination guard (SHOULD-FIX-3).
 */

// ---------------------------------------------------------------------------
// Mocks — must precede imports
// ---------------------------------------------------------------------------

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ vendorContext: { vendorId: 'v1' } }),
  },
}))

jest.mock('@utils/logger', () => ({ logError: jest.fn() }))
jest.mock('@utils/errorMapper', () => ({
  mapApiError: jest.fn(() => 'credit.error_not_found'),
}))

const mockGetDashboard = jest.fn()
const mockGetPriorityList = jest.fn()
const mockGetAnalytics = jest.fn()
const mockGetReminderConfig = jest.fn()
const mockGetReminderHistory = jest.fn()
const mockUpdateCreditSettings = jest.fn()
const mockEnablePrepaid = jest.fn()
const mockSendReminder = jest.fn()
const mockSendBulkReminders = jest.fn()
const mockUpdateReminderConfig = jest.fn()

jest.mock('../../service/credit.service', () => ({
  creditService: {
    getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
    getPriorityList: (...args: unknown[]) => mockGetPriorityList(...args),
    getAnalytics: (...args: unknown[]) => mockGetAnalytics(...args),
    getAging: jest.fn(),
    getReminderConfig: (...args: unknown[]) => mockGetReminderConfig(...args),
    getReminderHistory: (...args: unknown[]) => mockGetReminderHistory(...args),
    updateCreditSettings: (...args: unknown[]) => mockUpdateCreditSettings(...args),
    enablePrepaid: (...args: unknown[]) => mockEnablePrepaid(...args),
    sendReminder: (...args: unknown[]) => mockSendReminder(...args),
    sendBulkReminders: (...args: unknown[]) => mockSendBulkReminders(...args),
    updateReminderConfig: (...args: unknown[]) => mockUpdateReminderConfig(...args),
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

import { act } from '@testing-library/react-native'
import { useCreditStore } from '../credit.store'
import {
  mockDashboard,
  mockPriorityList,
  mockAnalytics,
  mockReminderConfig,
  mockReminderHistory,
  mockCreditSettingsResult,
  mockEnablePrepaidSuccess,
  mockEnablePrepaidBlocked,
  mockSendReminderResult,
  mockBulkReminderResult,
} from '../../service/credit.mock'

const CUSTOMER_ID = 'c1'
const HISTORY_META = { page: 1, limit: 20, total: 3, totalPages: 1 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useCreditStore.setState({
    dashboard: null,
    isDashboardLoading: false,
    dashboardError: null,
    priorityList: null,
    isPriorityLoading: false,
    priorityError: null,
    prioritySort: 'oldest_first',
    analytics: null,
    isAnalyticsLoading: false,
    analyticsError: null,
    analyticsMonth: '2026-06',
    reminderConfig: null,
    isReminderConfigLoading: false,
    reminderConfigError: null,
    history: {},
    historyMeta: {},
    isHistoryLoading: false,
    historyError: null,
    isMutating: false,
    mutationError: null,
    remindingCustomerIds: [],
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCreditStore', () => {
  beforeEach(() => {
    resetStore()
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // fetchDashboard
  // -------------------------------------------------------------------------
  describe('fetchDashboard', () => {
    it('sets dashboard on success', async () => {
      mockGetDashboard.mockResolvedValueOnce(mockDashboard)
      await act(async () => {
        await useCreditStore.getState().fetchDashboard()
      })
      const state = useCreditStore.getState()
      expect(state.dashboard).toEqual(mockDashboard)
      expect(state.isDashboardLoading).toBe(false)
      expect(state.dashboardError).toBeNull()
    })

    it('sets dashboardError on failure and does not throw', async () => {
      mockGetDashboard.mockRejectedValueOnce(new Error('network'))
      await act(async () => {
        await useCreditStore.getState().fetchDashboard()
      })
      const state = useCreditStore.getState()
      expect(state.dashboard).toBeNull()
      expect(state.isDashboardLoading).toBe(false)
      expect(state.dashboardError).toBe('credit.error_not_found')
    })
  })

  // -------------------------------------------------------------------------
  // fetchPriorityList
  // -------------------------------------------------------------------------
  describe('fetchPriorityList', () => {
    it('sets priorityList on success', async () => {
      mockGetPriorityList.mockResolvedValueOnce(mockPriorityList)
      await act(async () => {
        await useCreditStore.getState().fetchPriorityList('oldest_first')
      })
      const state = useCreditStore.getState()
      expect(state.priorityList).toEqual(mockPriorityList)
      expect(state.isPriorityLoading).toBe(false)
    })

    it('updates prioritySort when sort arg provided', async () => {
      mockGetPriorityList.mockResolvedValueOnce(mockPriorityList)
      await act(async () => {
        await useCreditStore.getState().fetchPriorityList('amount_desc')
      })
      expect(useCreditStore.getState().prioritySort).toBe('amount_desc')
    })

    it('sets priorityError on failure', async () => {
      mockGetPriorityList.mockRejectedValueOnce(new Error('network'))
      await act(async () => {
        await useCreditStore.getState().fetchPriorityList()
      })
      expect(useCreditStore.getState().priorityError).toBe('credit.error_not_found')
    })
  })

  // -------------------------------------------------------------------------
  // fetchAnalytics
  // -------------------------------------------------------------------------
  describe('fetchAnalytics', () => {
    it('sets analytics on success', async () => {
      mockGetAnalytics.mockResolvedValueOnce(mockAnalytics)
      await act(async () => {
        await useCreditStore.getState().fetchAnalytics('2026-06')
      })
      expect(useCreditStore.getState().analytics).toEqual(mockAnalytics)
    })

    it('updates analyticsMonth when month arg provided', async () => {
      mockGetAnalytics.mockResolvedValueOnce(mockAnalytics)
      await act(async () => {
        await useCreditStore.getState().fetchAnalytics('2026-01')
      })
      expect(useCreditStore.getState().analyticsMonth).toBe('2026-01')
    })
  })

  // -------------------------------------------------------------------------
  // fetchReminderConfig
  // -------------------------------------------------------------------------
  describe('fetchReminderConfig', () => {
    it('sets reminderConfig on success', async () => {
      mockGetReminderConfig.mockResolvedValueOnce(mockReminderConfig)
      await act(async () => {
        await useCreditStore.getState().fetchReminderConfig()
      })
      expect(useCreditStore.getState().reminderConfig).toEqual(mockReminderConfig)
    })
  })

  // -------------------------------------------------------------------------
  // fetchReminderHistory — page 1 replace, page 2 append, meta stored
  // -------------------------------------------------------------------------
  describe('fetchReminderHistory', () => {
    it('stores history and meta for page 1', async () => {
      mockGetReminderHistory.mockResolvedValueOnce({ data: mockReminderHistory, meta: HISTORY_META })
      await act(async () => {
        await useCreditStore.getState().fetchReminderHistory(CUSTOMER_ID, 1)
      })
      const state = useCreditStore.getState()
      expect(state.history[CUSTOMER_ID]).toEqual(mockReminderHistory)
      expect(state.historyMeta[CUSTOMER_ID]).toEqual(HISTORY_META)
      expect(state.isHistoryLoading).toBe(false)
    })

    it('appends reminders on page 2 and updates meta', async () => {
      // Seed page 1
      useCreditStore.setState({
        history: { [CUSTOMER_ID]: mockReminderHistory },
        historyMeta: { [CUSTOMER_ID]: HISTORY_META },
      })
      const page2Meta = { page: 2, limit: 20, total: 6, totalPages: 2 }
      const page2Data = { ...mockReminderHistory, reminders: [{ id: 'rem-p2', amountDue: 1000, reminderDate: '2026-01-01', sentVia: 'whatsapp', status: 'sent' as const, responseType: null, responseAmount: null }] }
      mockGetReminderHistory.mockResolvedValueOnce({ data: page2Data, meta: page2Meta })

      await act(async () => {
        await useCreditStore.getState().fetchReminderHistory(CUSTOMER_ID, 2)
      })

      const state = useCreditStore.getState()
      // Reminders are appended
      const combinedCount = mockReminderHistory.reminders.length + page2Data.reminders.length
      expect(state.history[CUSTOMER_ID]!.reminders.length).toBe(combinedCount)
      // Meta updated to page 2 meta
      expect(state.historyMeta[CUSTOMER_ID]).toEqual(page2Meta)
    })

    it('sets historyError on failure', async () => {
      mockGetReminderHistory.mockRejectedValueOnce(new Error('network'))
      await act(async () => {
        await useCreditStore.getState().fetchReminderHistory(CUSTOMER_ID)
      })
      expect(useCreditStore.getState().historyError).toBe('credit.error_not_found')
    })
  })

  // -------------------------------------------------------------------------
  // updateCreditSettings — command: rethrows on failure
  // -------------------------------------------------------------------------
  describe('updateCreditSettings', () => {
    it('returns CreditSettingsResultDto on success', async () => {
      mockUpdateCreditSettings.mockResolvedValueOnce(mockCreditSettingsResult)
      let result: typeof mockCreditSettingsResult | undefined
      await act(async () => {
        result = await useCreditStore.getState().updateCreditSettings(CUSTOMER_ID, { creditType: 'normal' })
      })
      expect(result).toEqual(mockCreditSettingsResult)
      expect(useCreditStore.getState().isMutating).toBe(false)
    })

    it('sets mutationError and RETHROWS on failure', async () => {
      mockUpdateCreditSettings.mockRejectedValueOnce(new Error('network'))
      await expect(
        act(async () => {
          await useCreditStore.getState().updateCreditSettings(CUSTOMER_ID, {})
        }),
      ).rejects.toThrow()
      expect(useCreditStore.getState().mutationError).toBe('credit.error_not_found')
      expect(useCreditStore.getState().isMutating).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // enablePrepaid — two-outcome, command rethrows
  // -------------------------------------------------------------------------
  describe('enablePrepaid', () => {
    it('returns success outcome (clearOutstandingRequired=false)', async () => {
      mockEnablePrepaid.mockResolvedValueOnce(mockEnablePrepaidSuccess)
      let result: typeof mockEnablePrepaidSuccess | undefined
      await act(async () => {
        result = await useCreditStore.getState().enablePrepaid(CUSTOMER_ID, { clearOutstandingFirst: false })
      })
      expect(result!.clearOutstandingRequired).toBe(false)
    })

    it('returns blocked outcome (clearOutstandingRequired=true)', async () => {
      mockEnablePrepaid.mockResolvedValueOnce(mockEnablePrepaidBlocked)
      let result: typeof mockEnablePrepaidBlocked | undefined
      await act(async () => {
        result = await useCreditStore.getState().enablePrepaid(CUSTOMER_ID, { clearOutstandingFirst: true })
      })
      expect(result!.clearOutstandingRequired).toBe(true)
    })

    it('rethrows on failure', async () => {
      mockEnablePrepaid.mockRejectedValueOnce(new Error('conflict'))
      await expect(
        act(async () => {
          await useCreditStore.getState().enablePrepaid(CUSTOMER_ID, { clearOutstandingFirst: false })
        }),
      ).rejects.toThrow()
      expect(useCreditStore.getState().mutationError).toBe('credit.error_not_found')
    })
  })

  // -------------------------------------------------------------------------
  // sendReminder — per-card in-flight guard (remindingCustomerIds)
  // -------------------------------------------------------------------------
  describe('sendReminder', () => {
    it('adds customerId to remindingCustomerIds while in-flight then removes it', async () => {
      let capturedIds: string[] = []
      mockSendReminder.mockImplementationOnce(async () => {
        capturedIds = useCreditStore.getState().remindingCustomerIds
        return mockSendReminderResult
      })
      await act(async () => {
        await useCreditStore.getState().sendReminder(CUSTOMER_ID)
      })
      // Was in-flight during call
      expect(capturedIds).toContain(CUSTOMER_ID)
      // Removed after success
      expect(useCreditStore.getState().remindingCustomerIds).not.toContain(CUSTOMER_ID)
    })

    it('removes customerId from remindingCustomerIds on failure and rethrows', async () => {
      mockSendReminder.mockRejectedValueOnce(new Error('rate_limit'))
      await expect(
        act(async () => {
          await useCreditStore.getState().sendReminder(CUSTOMER_ID)
        }),
      ).rejects.toThrow()
      expect(useCreditStore.getState().remindingCustomerIds).not.toContain(CUSTOMER_ID)
    })

    it('returns skip-aware result (skipped=true) without throwing', async () => {
      const skippedResult = { ...mockSendReminderResult, skipped: true, skipReason: 'already_paid' as const }
      mockSendReminder.mockResolvedValueOnce(skippedResult)
      let result: { skipped: boolean; skipReason: string | null } | undefined
      await act(async () => {
        result = await useCreditStore.getState().sendReminder(CUSTOMER_ID)
      })
      expect(result!.skipped).toBe(true)
      expect(result!.skipReason).toBe('already_paid')
    })
  })

  // -------------------------------------------------------------------------
  // sendBulkReminders
  // -------------------------------------------------------------------------
  describe('sendBulkReminders', () => {
    it('returns BulkReminderResultDto on success', async () => {
      mockSendBulkReminders.mockResolvedValueOnce(mockBulkReminderResult)
      let result: typeof mockBulkReminderResult | undefined
      await act(async () => {
        result = await useCreditStore.getState().sendBulkReminders({ target: 'all_overdue' })
      })
      expect(result!.sent).toBe(mockBulkReminderResult.sent)
      expect(result!.skipped).toBe(mockBulkReminderResult.skipped)
    })

    it('rethrows on failure', async () => {
      mockSendBulkReminders.mockRejectedValueOnce(new Error('network'))
      await expect(
        act(async () => {
          await useCreditStore.getState().sendBulkReminders({ target: 'all_overdue' })
        }),
      ).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // updateReminderConfig
  // -------------------------------------------------------------------------
  describe('updateReminderConfig', () => {
    it('updates reminderConfig in store on success', async () => {
      const updated = { ...mockReminderConfig, autoRemindersEnabled: true }
      mockUpdateReminderConfig.mockResolvedValueOnce(updated)
      await act(async () => {
        await useCreditStore.getState().updateReminderConfig({ autoRemindersEnabled: true })
      })
      expect(useCreditStore.getState().reminderConfig?.autoRemindersEnabled).toBe(true)
    })

    it('rethrows on failure', async () => {
      mockUpdateReminderConfig.mockRejectedValueOnce(new Error('network'))
      await expect(
        act(async () => {
          await useCreditStore.getState().updateReminderConfig({})
        }),
      ).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // clearErrors
  // -------------------------------------------------------------------------
  describe('clearErrors', () => {
    it('resets all error flags to null', () => {
      useCreditStore.setState({
        dashboardError: 'credit.error_not_found',
        priorityError: 'credit.error_not_found',
        analyticsError: 'credit.error_not_found',
        reminderConfigError: 'credit.error_not_found',
        historyError: 'credit.error_not_found',
        mutationError: 'credit.error_not_found',
      })
      act(() => {
        useCreditStore.getState().clearErrors()
      })
      const state = useCreditStore.getState()
      expect(state.dashboardError).toBeNull()
      expect(state.priorityError).toBeNull()
      expect(state.analyticsError).toBeNull()
      expect(state.reminderConfigError).toBeNull()
      expect(state.historyError).toBeNull()
      expect(state.mutationError).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // clearCredit
  // -------------------------------------------------------------------------
  describe('clearCredit', () => {
    it('resets all slices to initial state', async () => {
      // Seed some data
      useCreditStore.setState({
        dashboard: mockDashboard,
        priorityList: mockPriorityList,
        analytics: mockAnalytics,
        reminderConfig: mockReminderConfig,
        history: { [CUSTOMER_ID]: mockReminderHistory },
        historyMeta: { [CUSTOMER_ID]: HISTORY_META },
        remindingCustomerIds: [CUSTOMER_ID],
      })

      act(() => {
        useCreditStore.getState().clearCredit()
      })

      const state = useCreditStore.getState()
      expect(state.dashboard).toBeNull()
      expect(state.priorityList).toBeNull()
      expect(state.analytics).toBeNull()
      expect(state.reminderConfig).toBeNull()
      expect(state.history).toEqual({})
      expect(state.historyMeta).toEqual({})
      expect(state.remindingCustomerIds).toEqual([])
    })
  })
})
