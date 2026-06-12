/**
 * Delivery Store (US-006)
 * Purpose: daily delivery tracking state for the active vendor (owner + staff).
 *
 * - Reads: only NON-PII aggregate slices are persisted — `calendar` (counts/
 *   revenue, no names) and `listProgress` — so the dashboards render instantly on
 *   a 2G launch. `listDeliveries`, `today` (conflict customer names), `quickQueue`,
 *   `leaves`, and `dayDetail` carry customer PII → IN-MEMORY ONLY, never persisted.
 * - Writes (mark / bulk / leave / extra-charge) are security-sensitive and ONLINE-
 *   ONLY (OQ-3) — screens disable submit offline; the store does NOT queue. `markDelivery`
 *   applies OPTIMISTICALLY and ROLLS BACK on failure.
 * - error fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'delivery', action).
 * - clearDelivery() wipes all local data; auth.store.logout() calls it (auth.store
 *   is NOT owned here — wiring flagged to the orchestrator).
 *
 * Security: vendorId always comes from auth.store.vendorContext (JWT-derived) —
 * never from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { deliveryService } from '../service/delivery.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  CalendarResultDto,
  CreateLeaveInput,
  DailySupplyStatus,
  DateDetailResultDto,
  DeliveryDto,
  ExtraChargeInput,
  ExtraChargeResultDto,
  ListDeliveriesOptions,
  ListLeavesResultDto,
  MarkableStatus,
  TodayResultDto,
} from '../../../types/delivery'

// SSR-safe storage (same pattern as supplyLists.store / auth.store).
function buildStorage(): StateStorage {
  if (Platform.OS !== 'web') return AsyncStorage
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return window.localStorage
}

/** Resolves the active vendorId from auth state (JWT-derived). */
function getActiveVendorId(): string | null {
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

/** Lean, non-PII per-list progress (persistable). */
export interface ListProgress {
  total: number
  delivered: number
  onLeave: number
  pending: number
}

function progressFrom(deliveries: DeliveryDto[]): ListProgress {
  return {
    total: deliveries.length,
    delivered: deliveries.filter((d) => d.status === 'DELIVERED').length,
    onLeave: deliveries.filter((d) => d.status === 'LEAVE').length,
    pending: deliveries.filter((d) => d.status === 'PENDING').length,
  }
}

export interface DeliveryState {
  // today (owner overview + staff summary). PII (conflict names) → in-memory only.
  today: TodayResultDto | null
  isTodayLoading: boolean
  todayError: string | null

  // per-list deliveries (PII → in-memory only) + lean persisted progress.
  listDeliveries: Record<string, DeliveryDto[]>
  listProgress: Record<string, ListProgress>
  isListLoading: boolean
  listError: string | null

  // quick-mark queue (PII → in-memory only).
  quickQueue: DeliveryDto[]
  quickIndex: number
  isQuickLoading: boolean
  quickError: string | null

  // leaves (PII → in-memory only).
  leaves: ListLeavesResultDto | null
  isLeavesLoading: boolean
  leavesError: string | null

  // calendar (non-PII counts → persisted).
  calendar: Record<string, CalendarResultDto>
  isCalendarLoading: boolean
  calendarError: string | null

  // day detail (PII → in-memory only).
  dayDetail: Record<string, DateDetailResultDto>
  isDayLoading: boolean
  dayError: string | null

  // shared mutation flags.
  isMutating: boolean
  mutationError: string | null

  // actions
  fetchToday: (opts?: { listId?: string; staffId?: string }) => Promise<void>
  fetchListDeliveries: (listId: string, opts?: ListDeliveriesOptions) => Promise<void>
  markDelivery: (listId: string, deliveryId: string, status: MarkableStatus) => Promise<void>
  markBulk: (listId: string, excludeDeliveryIds?: string[]) => Promise<void>
  buildQuickQueue: (listIds: string[]) => Promise<void>
  advanceQuick: () => void
  fetchLeaves: (opts?: { status?: 'today' | 'upcoming'; staffId?: string }) => Promise<void>
  createLeave: (input: CreateLeaveInput) => Promise<void>
  cancelLeave: (leaveId: string) => Promise<void>
  addExtraCharge: (input: ExtraChargeInput) => Promise<ExtraChargeResultDto>
  fetchCalendar: (month: string, opts?: { listId?: string; customerId?: string }) => Promise<void>
  fetchDayDetail: (date: string) => Promise<void>
  clearError: () => void
  clearDelivery: () => void
}

/** Non-persisted slices reset on clear (carry PII or are transient). */
const initialNonPersisted = {
  today: null as TodayResultDto | null,
  isTodayLoading: false,
  todayError: null as string | null,
  listDeliveries: {} as Record<string, DeliveryDto[]>,
  isListLoading: false,
  listError: null as string | null,
  quickQueue: [] as DeliveryDto[],
  quickIndex: 0,
  isQuickLoading: false,
  quickError: null as string | null,
  leaves: null as ListLeavesResultDto | null,
  isLeavesLoading: false,
  leavesError: null as string | null,
  isCalendarLoading: false,
  calendarError: null as string | null,
  dayDetail: {} as Record<string, DateDetailResultDto>,
  isDayLoading: false,
  dayError: null as string | null,
  isMutating: false,
  mutationError: null as string | null,
}

/** Resolves the today endpoint's `date` as the single source of truth for "today". */
function serverToday(state: DeliveryState): string {
  return state.today?.date ?? new Date().toISOString().slice(0, 10)
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      listProgress: {},
      calendar: {},
      ...initialNonPersisted,

      clearError: () =>
        set({
          todayError: null,
          listError: null,
          quickError: null,
          leavesError: null,
          calendarError: null,
          dayError: null,
          mutationError: null,
        }),

      clearDelivery: () => set({ listProgress: {}, calendar: {}, ...initialNonPersisted }),

      fetchToday: async (opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isTodayLoading: true, todayError: null })
        try {
          const today = await deliveryService.getToday(vendorId, opts)
          set({ today, isTodayLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'TodayOverview',
            action: 'fetchToday',
            endpoint: 'GET /vendors/:id/deliveries/today',
          })
          const key = mapApiError(err, 'delivery')
          const isOffline = key === 'common.offline_message'
          set({ isTodayLoading: false, todayError: key, ...(isOffline ? {} : { today: null }) })
        }
      },

      fetchListDeliveries: async (listId, opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isListLoading: true, listError: null })
        try {
          const { result } = await deliveryService.getListDeliveries(vendorId, listId, opts)
          set((s) => ({
            listDeliveries: { ...s.listDeliveries, [listId]: result.deliveries },
            listProgress: { ...s.listProgress, [listId]: result.progress },
            isListLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'DeliveryList',
            action: 'fetchListDeliveries',
            endpoint: 'GET /vendors/:id/supply-lists/:listId/deliveries',
          })
          const key = mapApiError(err, 'delivery')
          const errorKey = key === 'delivery.error_not_found' ? 'delivery.error_load_failed' : key
          const isOffline = errorKey === 'common.offline_message'
          set((s) => ({
            isListLoading: false,
            listError: errorKey,
            // Offline: keep cached deliveries so the screen stays usable. API errors:
            // clear stale rows so the error empty-state renders.
            ...(isOffline ? {} : { listDeliveries: { ...s.listDeliveries, [listId]: [] } }),
          }))
        }
      },

      // Optimistic: flip the row to the target status immediately; roll back on failure.
      markDelivery: async (listId, deliveryId, status) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('delivery.error_not_found')
        const prev = get().listDeliveries[listId] ?? []
        const optimistic = prev.map((d) =>
          d.id === deliveryId ? { ...d, status: status as DailySupplyStatus } : d,
        )
        set((s) => ({
          listDeliveries: { ...s.listDeliveries, [listId]: optimistic },
          listProgress: { ...s.listProgress, [listId]: progressFrom(optimistic) },
          isMutating: true,
          mutationError: null,
        }))
        try {
          const res = await deliveryService.markDelivery(vendorId, deliveryId, { status })
          set((s) => {
            const rows = (s.listDeliveries[listId] ?? []).map((d) =>
              d.id === deliveryId ? res.delivery : d,
            )
            return {
              listDeliveries: { ...s.listDeliveries, [listId]: rows },
              listProgress: { ...s.listProgress, [listId]: progressFrom(rows) },
              isMutating: false,
            }
          })
        } catch (err) {
          // rollback
          set((s) => ({
            listDeliveries: { ...s.listDeliveries, [listId]: prev },
            listProgress: { ...s.listProgress, [listId]: progressFrom(prev) },
            isMutating: false,
            mutationError: mapApiError(err, 'delivery', 'mark'),
          }))
          void logError(err, {
            screen: 'DeliveryList',
            action: 'markDelivery',
            endpoint: 'PATCH /vendors/:id/deliveries/:deliveryId/mark',
          })
          throw err
        }
      },

      markBulk: async (listId, excludeDeliveryIds) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('delivery.error_not_found')
        set({ isMutating: true, mutationError: null })
        try {
          await deliveryService.markBulk(vendorId, {
            supplyListId: listId,
            date: serverToday(get()),
            status: 'DELIVERED',
            excludeDeliveryIds,
          })
          // Re-fetch authoritative state after a bulk write.
          await get().fetchListDeliveries(listId)
          set({ isMutating: false })
        } catch (err) {
          void logError(err, {
            screen: 'DeliveryList',
            action: 'markBulk',
            endpoint: 'POST /vendors/:id/deliveries/mark-bulk',
          })
          set({ isMutating: false, mutationError: mapApiError(err, 'delivery', 'mark_bulk') })
          throw err
        }
      },

      buildQuickQueue: async (listIds) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isQuickLoading: true, quickError: null })
        try {
          const queue: DeliveryDto[] = []
          for (const listId of listIds) {
            // Sequential per-list fetch, flattened into a pending-only queue.
            const { result } = await deliveryService.getListDeliveries(vendorId, listId, {
              status: 'PENDING',
            })
            queue.push(...result.deliveries.filter((d) => d.status === 'PENDING'))
          }
          set({ quickQueue: queue, quickIndex: 0, isQuickLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'QuickMark',
            action: 'buildQuickQueue',
            endpoint: 'GET /vendors/:id/supply-lists/:listId/deliveries',
          })
          set({ isQuickLoading: false, quickError: mapApiError(err, 'delivery') })
        }
      },

      advanceQuick: () => set((s) => ({ quickIndex: s.quickIndex + 1 })),

      fetchLeaves: async (opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isLeavesLoading: true, leavesError: null })
        try {
          const leaves = await deliveryService.getLeaves(vendorId, opts)
          set({ leaves, isLeavesLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'Leaves',
            action: 'fetchLeaves',
            endpoint: 'GET /vendors/:id/leaves',
          })
          set({ isLeavesLoading: false, leavesError: mapApiError(err, 'delivery') })
        }
      },

      createLeave: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('delivery.error_not_found')
        set({ isMutating: true, mutationError: null })
        try {
          await deliveryService.createLeave(vendorId, input)
          set({ isMutating: false })
        } catch (err) {
          void logError(err, {
            screen: 'MarkLeave',
            action: 'createLeave',
            endpoint: 'POST /vendors/:id/leaves',
          })
          set({ isMutating: false, mutationError: mapApiError(err, 'delivery', 'create_leave') })
          throw err
        }
      },

      cancelLeave: async (leaveId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('delivery.error_not_found')
        const prev = get().leaves
        // Optimistic: drop the leave from both buckets; roll back on failure.
        set((s) => ({
          leaves: s.leaves
            ? {
                today: s.leaves.today.filter((l) => l.id !== leaveId),
                upcoming: s.leaves.upcoming.filter((l) => l.id !== leaveId),
              }
            : s.leaves,
          isMutating: true,
          mutationError: null,
        }))
        try {
          await deliveryService.cancelLeave(vendorId, leaveId)
          set({ isMutating: false })
        } catch (err) {
          set({ leaves: prev, isMutating: false, mutationError: mapApiError(err, 'delivery', 'cancel_leave') })
          void logError(err, {
            screen: 'Leaves',
            action: 'cancelLeave',
            endpoint: 'DELETE /vendors/:id/leaves/:leaveId',
          })
          throw err
        }
      },

      addExtraCharge: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('delivery.error_not_found')
        set({ isMutating: true, mutationError: null })
        try {
          const result = await deliveryService.addExtraCharge(vendorId, input)
          set({ isMutating: false })
          return result
        } catch (err) {
          void logError(err, {
            screen: 'AddExtraCharge',
            action: 'addExtraCharge',
            endpoint: 'POST /vendors/:id/extra-charges',
          })
          set({ isMutating: false, mutationError: mapApiError(err, 'delivery', 'extra_charge') })
          throw err
        }
      },

      fetchCalendar: async (month, opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isCalendarLoading: true, calendarError: null })
        try {
          const result = await deliveryService.getCalendar(vendorId, month, opts)
          set((s) => ({
            calendar: { ...s.calendar, [month]: result },
            isCalendarLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'Calendar',
            action: 'fetchCalendar',
            endpoint: 'GET /vendors/:id/deliveries/calendar',
          })
          set({ isCalendarLoading: false, calendarError: mapApiError(err, 'delivery') })
        }
      },

      fetchDayDetail: async (date) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isDayLoading: true, dayError: null })
        try {
          const detail = await deliveryService.getDateDetail(vendorId, date)
          set((s) => ({ dayDetail: { ...s.dayDetail, [date]: detail }, isDayLoading: false }))
        } catch (err) {
          void logError(err, {
            screen: 'DayDetail',
            action: 'fetchDayDetail',
            endpoint: 'GET /vendors/:id/deliveries/date/:date',
          })
          set({ isDayLoading: false, dayError: mapApiError(err, 'delivery') })
        }
      },
    }),
    {
      name: 'delivery-storage',
      storage: createJSONStorage(() => buildStorage()),
      // Persist ONLY non-PII aggregate slices for instant offline render: calendar
      // counts/revenue (no names) and lean list progress. All PII-bearing slices
      // (listDeliveries, today.conflicts, quickQueue, leaves, dayDetail) are
      // deliberately omitted — in-memory only.
      partialize: (state) => ({
        calendar: state.calendar,
        listProgress: state.listProgress,
      }),
    },
  ),
)

export default useDeliveryStore
