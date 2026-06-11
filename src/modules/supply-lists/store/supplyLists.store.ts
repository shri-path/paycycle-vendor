/**
 * Supply Lists Store (US-005)
 * Purpose: Supply-list management state for the active vendor (owner + read-only staff).
 *
 * - Reads are offline-friendly: only the LEAN `lists` slice is persisted (ids/names/
 *   icons/schedule) so the Lists screen renders instantly on a 2G launch. Detail,
 *   customers and available carry phone/name/address PII → IN-MEMORY ONLY, never
 *   persisted to AsyncStorage.
 * - Writes (create/edit/archive/add-customers/assign/sub-edit) are security-sensitive
 *   and are NOT offline-queued (OQ-3 — screens disable submit offline). Archive / remove
 *   (end) / pause apply OPTIMISTICALLY online and ROLL BACK on failure.
 * - error fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'supply', action).
 * - clearSupplyLists() wipes all local data; auth.store.logout() should call it
 *   (auth.store is NOT owned by WS-1 — wiring flagged to the orchestrator).
 *
 * Security: vendorId always comes from auth.store.vendorContext (JWT-derived) — never
 * from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supplyListsService } from '../service/supplyLists.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  AddCustomersInput,
  AddCustomersResultDto,
  AvailableCustomerDto,
  CreateSupplyListInput,
  PaginationMeta,
  SubscriptionDto,
  SubscriptionStatus,
  SupplyListDto,
  SupplyListListDto,
  SupplyListStatus,
  UpdateSubscriptionInput,
  UpdateSupplyListInput,
} from '../../../types/supplyLists'

// SSR-safe storage (same pattern as roles.store / auth.store).
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

/** Options for fetching a customer page. */
export interface FetchCustomersOptions {
  search?: string
  status?: SubscriptionStatus
  page?: number
}

/** Options for fetching an available-customers page. */
export interface FetchAvailableOptions {
  search?: string
  page?: number
}

export interface SupplyListsState {
  // list screen
  lists: SupplyListListDto[]
  listsMeta: PaginationMeta | null
  listStatusFilter: SupplyListStatus
  isListsLoading: boolean
  listsError: string | null
  // detail
  detail: Record<string, SupplyListDto>
  isDetailLoading: boolean
  detailError: string | null
  // subscriptions per list
  customers: Record<string, SubscriptionDto[]>
  customersMeta: Record<string, PaginationMeta>
  isCustomersLoading: boolean
  // available customers (add screen)
  available: AvailableCustomerDto[]
  availableMeta: PaginationMeta | null
  isAvailableLoading: boolean

  // actions
  setListStatusFilter: (status: SupplyListStatus) => void
  fetchLists: (status?: SupplyListStatus, page?: number) => Promise<void>
  fetchDetail: (listId: string) => Promise<void>
  fetchCustomers: (listId: string, opts?: FetchCustomersOptions) => Promise<void>
  fetchAvailable: (listId: string, opts?: FetchAvailableOptions) => Promise<void>
  createList: (input: CreateSupplyListInput) => Promise<SupplyListDto>
  updateList: (listId: string, patch: UpdateSupplyListInput) => Promise<void>
  archiveList: (listId: string) => Promise<void>
  assignStaff: (listId: string, staffId: string, isPrimary: boolean) => Promise<void>
  unassignStaff: (listId: string, staffId: string) => Promise<void>
  addCustomers: (listId: string, input: AddCustomersInput) => Promise<AddCustomersResultDto>
  updateSubscription: (
    listId: string,
    subscriptionId: string,
    patch: UpdateSubscriptionInput,
  ) => Promise<void>
  endSubscription: (listId: string, subscriptionId: string) => Promise<void>
  clearError: () => void
  clearSupplyLists: () => void
}

/** Non-persisted slices reset on clear (carry PII or are transient). */
const initialNonPersisted = {
  listsMeta: null as PaginationMeta | null,
  isListsLoading: false,
  listsError: null as string | null,
  detail: {} as Record<string, SupplyListDto>,
  isDetailLoading: false,
  detailError: null as string | null,
  customers: {} as Record<string, SubscriptionDto[]>,
  customersMeta: {} as Record<string, PaginationMeta>,
  isCustomersLoading: false,
  available: [] as AvailableCustomerDto[],
  availableMeta: null as PaginationMeta | null,
  isAvailableLoading: false,
}

export const useSupplyListsStore = create<SupplyListsState>()(
  persist(
    (set, get) => ({
      lists: [],
      listStatusFilter: 'active',
      ...initialNonPersisted,

      setListStatusFilter: (status) => set({ listStatusFilter: status }),

      clearError: () => set({ listsError: null, detailError: null }),

      clearSupplyLists: () =>
        set({
          lists: [],
          listStatusFilter: 'active',
          ...initialNonPersisted,
        }),

      fetchLists: async (status, page = 1) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const filter = status ?? get().listStatusFilter
        set({ isListsLoading: true, listsError: null, listStatusFilter: filter })
        try {
          const { data, meta } = await supplyListsService.list(vendorId, {
            status: filter,
            page,
          })
          set((s) => ({
            lists: page > 1 ? [...s.lists, ...data] : data,
            listsMeta: meta,
            isListsLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SupplyLists',
            action: 'fetchLists',
            endpoint: 'GET /vendors/:id/supply-lists',
          })
          set({ isListsLoading: false, listsError: mapApiError(err, 'supply') })
        }
      },

      fetchDetail: async (listId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isDetailLoading: true, detailError: null })
        try {
          const detail = await supplyListsService.getDetail(vendorId, listId)
          set((s) => ({
            detail: { ...s.detail, [listId]: detail },
            isDetailLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'fetchDetail',
            endpoint: 'GET /vendors/:id/supply-lists/:listId',
          })
          set({ isDetailLoading: false, detailError: mapApiError(err, 'supply') })
        }
      },

      fetchCustomers: async (listId, opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const page = opts.page ?? 1
        set({ isCustomersLoading: true })
        try {
          const { data, meta } = await supplyListsService.listCustomers(vendorId, listId, {
            search: opts.search,
            status: opts.status,
            page,
          })
          set((s) => ({
            customers: {
              ...s.customers,
              [listId]: page > 1 ? [...(s.customers[listId] ?? []), ...data] : data,
            },
            customersMeta: { ...s.customersMeta, [listId]: meta },
            isCustomersLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'fetchCustomers',
            endpoint: 'GET /vendors/:id/supply-lists/:listId/customers',
          })
          set({ isCustomersLoading: false, detailError: mapApiError(err, 'supply') })
        }
      },

      fetchAvailable: async (listId, opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const page = opts.page ?? 1
        set({ isAvailableLoading: true })
        try {
          const { data, meta } = await supplyListsService.listAvailable(vendorId, listId, {
            search: opts.search,
            page,
          })
          set((s) => ({
            available: page > 1 ? [...s.available, ...data] : data,
            availableMeta: meta,
            isAvailableLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'AddCustomers',
            action: 'fetchAvailable',
            endpoint: 'GET /vendors/:id/supply-lists/:listId/available-customers',
          })
          set({ isAvailableLoading: false, detailError: mapApiError(err, 'supply') })
        }
      },

      createList: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        set({ isListsLoading: true, listsError: null })
        try {
          const created = await supplyListsService.create(vendorId, input)
          set((s) => ({
            lists: [created, ...s.lists],
            detail: { ...s.detail, [created.id]: created },
            isListsLoading: false,
          }))
          return created
        } catch (err) {
          void logError(err, {
            screen: 'CreateSupplyList',
            action: 'createList',
            endpoint: 'POST /vendors/:id/supply-lists',
          })
          set({ isListsLoading: false, listsError: mapApiError(err, 'supply', 'create') })
          throw err
        }
      },

      updateList: async (listId, patch) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        set({ isDetailLoading: true, detailError: null })
        try {
          const updated = await supplyListsService.update(vendorId, listId, patch)
          set((s) => ({
            detail: { ...s.detail, [listId]: updated },
            lists: s.lists.map((l) => (l.id === listId ? updated : l)),
            isDetailLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'EditSupplyList',
            action: 'updateList',
            endpoint: 'PATCH /vendors/:id/supply-lists/:listId',
          })
          set({ isDetailLoading: false, detailError: mapApiError(err, 'supply', 'update') })
          throw err
        }
      },

      // Optimistic: drop the list from the active cache immediately; roll back on failure.
      archiveList: async (listId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        const prevLists = get().lists
        set((s) => ({ lists: s.lists.filter((l) => l.id !== listId), detailError: null }))
        try {
          await supplyListsService.archive(vendorId, listId)
          set((s) => {
            const existing = s.detail[listId]
            if (!existing) return {}
            return {
              detail: { ...s.detail, [listId]: { ...existing, status: 'archived' } },
            }
          })
        } catch (err) {
          set({ lists: prevLists }) // rollback
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'archiveList',
            endpoint: 'DELETE /vendors/:id/supply-lists/:listId',
          })
          set({ detailError: mapApiError(err, 'supply') })
          throw err
        }
      },

      assignStaff: async (listId, staffId, isPrimary) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        set({ isDetailLoading: true, detailError: null })
        try {
          const updated = await supplyListsService.assignStaff(vendorId, listId, {
            staffId,
            isPrimary,
          })
          set((s) => ({
            detail: { ...s.detail, [listId]: updated },
            lists: s.lists.map((l) => (l.id === listId ? updated : l)),
            isDetailLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'assignStaff',
            endpoint: 'POST /vendors/:id/supply-lists/:listId/staff',
          })
          set({
            isDetailLoading: false,
            detailError: mapApiError(err, 'supply', 'assign_staff'),
          })
          throw err
        }
      },

      unassignStaff: async (listId, staffId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        set({ isDetailLoading: true, detailError: null })
        try {
          const updated = await supplyListsService.unassignStaff(vendorId, listId, staffId)
          set((s) => ({
            detail: { ...s.detail, [listId]: updated },
            lists: s.lists.map((l) => (l.id === listId ? updated : l)),
            isDetailLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'unassignStaff',
            endpoint: 'DELETE /vendors/:id/supply-lists/:listId/staff/:staffId',
          })
          set({
            isDetailLoading: false,
            detailError: mapApiError(err, 'supply', 'assign_staff'),
          })
          throw err
        }
      },

      addCustomers: async (listId, input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        set({ isCustomersLoading: true, detailError: null })
        try {
          const result = await supplyListsService.addCustomers(vendorId, listId, input)
          set((s) => ({
            customers: {
              ...s.customers,
              [listId]: [...result.subscriptions, ...(s.customers[listId] ?? [])],
            },
            isCustomersLoading: false,
          }))
          return result
        } catch (err) {
          void logError(err, {
            screen: 'AddCustomers',
            action: 'addCustomers',
            endpoint: 'POST /vendors/:id/supply-lists/:listId/customers',
          })
          set({
            isCustomersLoading: false,
            detailError: mapApiError(err, 'supply', 'add_customers'),
          })
          throw err
        }
      },

      // Optimistic pause/resume/qty/rate edit: apply to the cached row, roll back on failure.
      updateSubscription: async (listId, subscriptionId, patch) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        const prev = get().customers[listId] ?? []
        set((s) => ({
          customers: {
            ...s.customers,
            [listId]: prev.map((sub) =>
              sub.subscriptionId === subscriptionId
                ? {
                    ...sub,
                    quantity: patch.quantity ?? sub.quantity,
                    ratePerUnit: patch.ratePerUnit ?? sub.ratePerUnit,
                    amount:
                      (patch.quantity ?? sub.quantity) *
                      (patch.ratePerUnit ?? sub.ratePerUnit),
                    status: patch.status ?? sub.status,
                  }
                : sub,
            ),
          },
          detailError: null,
        }))
        try {
          const updated = await supplyListsService.updateSubscription(
            vendorId,
            listId,
            subscriptionId,
            patch,
          )
          set((s) => ({
            customers: {
              ...s.customers,
              [listId]: (s.customers[listId] ?? []).map((sub) =>
                sub.subscriptionId === subscriptionId ? updated : sub,
              ),
            },
          }))
        } catch (err) {
          set((s) => ({ customers: { ...s.customers, [listId]: prev } })) // rollback
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'updateSubscription',
            endpoint: 'PATCH /vendors/:id/supply-lists/:listId/customers/:subscriptionId',
          })
          set({ detailError: mapApiError(err, 'supply', 'update_subscription') })
          throw err
        }
      },

      // Optimistic remove: drop the subscription row immediately; roll back on failure.
      endSubscription: async (listId, subscriptionId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('supply.error_not_found')
        const prev = get().customers[listId] ?? []
        set((s) => ({
          customers: {
            ...s.customers,
            [listId]: prev.filter((sub) => sub.subscriptionId !== subscriptionId),
          },
          detailError: null,
        }))
        try {
          await supplyListsService.endSubscription(vendorId, listId, subscriptionId)
        } catch (err) {
          set((s) => ({ customers: { ...s.customers, [listId]: prev } })) // rollback
          void logError(err, {
            screen: 'SupplyListDetail',
            action: 'endSubscription',
            endpoint: 'DELETE /vendors/:id/supply-lists/:listId/customers/:subscriptionId',
          })
          set({ detailError: mapApiError(err, 'supply', 'update_subscription') })
          throw err
        }
      },
    }),
    {
      name: 'supply-lists-storage',
      storage: createJSONStorage(() => buildStorage()),
      // Persist ONLY the lean `lists` (ids/names/icons/schedule) for instant offline
      // render of the Lists screen. NO customer PII (phone/name/address) — detail,
      // customers and available are in-memory only and are deliberately omitted.
      partialize: (state) => ({
        lists: state.lists,
        listStatusFilter: state.listStatusFilter,
      }),
    },
  ),
)

export default useSupplyListsStore
