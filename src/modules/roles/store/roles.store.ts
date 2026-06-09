/**
 * Roles Store (US-002)
 * Purpose: Role context + owner staff-management state for the active vendor.
 *
 * - Reads are cached (persisted roleContext/assignedListIds) so the correct home
 *   renders instantly offline; staffList/staffDetail are in-memory caches.
 * - Writes (invite/update/remove/assign/unassign) are security-sensitive and are
 *   NOT offline-queued (documented deviation in FEATURE_PLAN — screens disable the
 *   submit offline).
 * - error fields hold i18n KEYS (never raw messages); failures go through the
 *   shared logger (correlationId, no PII) + mapApiError.
 * - clearRoles() is called by auth.store.logout() to wipe all local role data.
 *
 * Security: vendorId always comes from auth.store.vendorContext (derived from the
 * JWT on the server) — never from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { rolesService } from '../service/roles.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  RoleContextDto,
  StaffResponseDto,
  StaffListMeta,
  InviteStaffInput,
  InviteStaffResult,
  UpdateStaffInput,
  SupplyListOptionDto,
} from '../../../types/roles'

// SSR-safe storage (same pattern as auth.store).
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

interface RolesState {
  // Role context for the ACTIVE vendor
  roleContext: RoleContextDto | null
  assignedListIds: string[]
  isRoleLoading: boolean
  roleError: string | null

  // Owner staff-management cache
  staffList: StaffResponseDto[]
  staffListMeta: StaffListMeta | null
  isStaffLoading: boolean
  staffError: string | null
  staffDetail: Record<string, StaffResponseDto>

  // Supply-list options for the assign UI (OQ-6, stub-backed until US-005)
  supplyListOptions: SupplyListOptionDto[]
  isSupplyListsLoading: boolean

  // Actions
  fetchRole: () => Promise<void>
  fetchStaffList: (page?: number) => Promise<void>
  fetchStaffDetail: (staffId: string) => Promise<void>
  inviteStaff: (input: InviteStaffInput) => Promise<InviteStaffResult>
  updateStaff: (staffId: string, patch: UpdateStaffInput) => Promise<void>
  removeStaff: (staffId: string) => Promise<void>
  fetchSupplyListOptions: () => Promise<void>
  assignLists: (staffId: string, listIds: string[]) => Promise<void>
  unassignList: (staffId: string, listId: string) => Promise<void>
  clearStaffError: () => void
  clearRoles: () => void
}

const initialNonPersisted = {
  isRoleLoading: false,
  roleError: null,
  staffList: [] as StaffResponseDto[],
  staffListMeta: null,
  isStaffLoading: false,
  staffError: null as string | null,
  staffDetail: {} as Record<string, StaffResponseDto>,
  supplyListOptions: [] as SupplyListOptionDto[],
  isSupplyListsLoading: false,
}

export const useRolesStore = create<RolesState>()(
  persist(
    (set, get) => ({
      roleContext: null,
      assignedListIds: [],
      ...initialNonPersisted,

      clearStaffError: () => set({ staffError: null }),

      clearRoles: () =>
        set({
          roleContext: null,
          assignedListIds: [],
          ...initialNonPersisted,
        }),

      fetchRole: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isRoleLoading: true, roleError: null })
        try {
          const role = await rolesService.getRole(vendorId)
          set({
            roleContext: role,
            assignedListIds: get().assignedListIds, // refreshed via supply-list/role later
            isRoleLoading: false,
          })
        } catch (err) {
          void logError(err, { screen: 'Role', action: 'fetchRole', endpoint: 'GET /vendors/:id/role' })
          set({ isRoleLoading: false, roleError: mapApiError(err, 'role') })
        }
      },

      fetchStaffList: async (page = 1) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isStaffLoading: true, staffError: null })
        try {
          const { staff, meta } = await rolesService.listStaff(vendorId, page)
          set((s) => ({
            staffList: page > 1 ? [...s.staffList, ...staff] : staff,
            staffListMeta: meta,
            isStaffLoading: false,
          }))
        } catch (err) {
          void logError(err, { screen: 'StaffList', action: 'fetchStaffList', endpoint: 'GET /vendors/:id/staff' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'staff') })
        }
      },

      fetchStaffDetail: async (staffId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isStaffLoading: true, staffError: null })
        try {
          const staff = await rolesService.getStaff(vendorId, staffId)
          set((s) => ({
            staffDetail: { ...s.staffDetail, [staffId]: staff },
            isStaffLoading: false,
          }))
        } catch (err) {
          void logError(err, { screen: 'StaffDetail', action: 'fetchStaffDetail', endpoint: 'GET /vendors/:id/staff/:staffId' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'staff') })
        }
      },

      inviteStaff: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('roles.error_no_membership')
        set({ isStaffLoading: true, staffError: null })
        try {
          const result = await rolesService.inviteStaff(vendorId, input)
          set((s) => ({
            staffList: [...s.staffList, result.staff],
            isStaffLoading: false,
          }))
          return result
        } catch (err) {
          void logError(err, { screen: 'InviteStaff', action: 'inviteStaff', endpoint: 'POST /vendors/:id/staff/invite' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'invite') })
          throw err
        }
      },

      updateStaff: async (staffId, patch) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('roles.error_no_membership')
        set({ isStaffLoading: true, staffError: null })
        try {
          const updated = await rolesService.updateStaff(vendorId, staffId, patch)
          set((s) => ({
            staffDetail: { ...s.staffDetail, [staffId]: updated },
            staffList: s.staffList.map((m) => (m.staffId === staffId ? updated : m)),
            isStaffLoading: false,
          }))
        } catch (err) {
          void logError(err, { screen: 'StaffDetail', action: 'updateStaff', endpoint: 'PATCH /vendors/:id/staff/:staffId' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'staff') })
          throw err
        }
      },

      removeStaff: async (staffId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('roles.error_no_membership')
        set({ isStaffLoading: true, staffError: null })
        try {
          await rolesService.removeStaff(vendorId, staffId)
          set((s) => {
            const nextDetail = { ...s.staffDetail }
            delete nextDetail[staffId]
            return {
              staffList: s.staffList.filter((m) => m.staffId !== staffId),
              staffDetail: nextDetail,
              isStaffLoading: false,
            }
          })
        } catch (err) {
          void logError(err, { screen: 'StaffDetail', action: 'removeStaff', endpoint: 'DELETE /vendors/:id/staff/:staffId' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'staff') })
          throw err
        }
      },

      fetchSupplyListOptions: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isSupplyListsLoading: true })
        try {
          const options = await rolesService.listSupplyLists(vendorId)
          set({ supplyListOptions: options, isSupplyListsLoading: false })
        } catch (err) {
          void logError(err, { screen: 'AssignLists', action: 'fetchSupplyListOptions', endpoint: 'GET /vendors/:id/supply-lists' })
          set({ isSupplyListsLoading: false, staffError: mapApiError(err, 'staff') })
        }
      },

      assignLists: async (staffId, listIds) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('roles.error_no_membership')
        set({ isStaffLoading: true, staffError: null })
        try {
          await rolesService.assignLists(vendorId, staffId, listIds)
          // Re-fetch detail so the assigned-lists section reflects the server truth.
          const updated = await rolesService.getStaff(vendorId, staffId)
          set((s) => ({
            staffDetail: { ...s.staffDetail, [staffId]: updated },
            staffList: s.staffList.map((m) => (m.staffId === staffId ? updated : m)),
            isStaffLoading: false,
          }))
        } catch (err) {
          void logError(err, { screen: 'StaffDetail', action: 'assignLists', endpoint: 'POST /vendors/:id/staff/:staffId/lists' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'staff') })
          throw err
        }
      },

      unassignList: async (staffId, listId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('roles.error_no_membership')
        set({ isStaffLoading: true, staffError: null })
        try {
          await rolesService.unassignList(vendorId, staffId, listId)
          const updated = await rolesService.getStaff(vendorId, staffId)
          set((s) => ({
            staffDetail: { ...s.staffDetail, [staffId]: updated },
            staffList: s.staffList.map((m) => (m.staffId === staffId ? updated : m)),
            isStaffLoading: false,
          }))
        } catch (err) {
          void logError(err, { screen: 'StaffDetail', action: 'unassignList', endpoint: 'DELETE /vendors/:id/staff/:staffId/lists/:listId' })
          set({ isStaffLoading: false, staffError: mapApiError(err, 'staff') })
          throw err
        }
      },
    }),
    {
      name: 'roles-storage',
      storage: createJSONStorage(() => buildStorage()),
      // Persist ONLY non-sensitive role context so the correct home renders
      // instantly offline. No tokens, no PII (phone/name) is persisted here.
      partialize: (state) => ({
        roleContext: state.roleContext,
        assignedListIds: state.assignedListIds,
      }),
    },
  ),
)

export default useRolesStore
