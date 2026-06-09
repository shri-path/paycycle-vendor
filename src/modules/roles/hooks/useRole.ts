/**
 * useRole (US-002)
 * Purpose: Derived, selector-based access to the caller's role for the active
 * vendor. Pure read hook — no side effects. Consumed by RoleGate, screens, and
 * other stories' gated controls.
 *
 * Semantics:
 * - Owner is all-allow: hasPermission() and canAccessList() are always true.
 * - Staff: hasPermission checks roleContext.permissions; canAccessList checks the
 *   staff's assignedListIds.
 */

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useRolesStore } from '../store/roles.store'
import type { PermissionKey, RoleContextDto } from '../../../types/roles'

export interface UseRoleResult {
  roleContext: RoleContextDto | null
  isOwner: boolean
  isStaff: boolean
  hasPermission: (key: PermissionKey) => boolean
  canAccessList: (listId: string) => boolean
  isLoading: boolean
  error: string | null
}

export function useRole(): UseRoleResult {
  const { roleContext, assignedListIds, isRoleLoading, roleError } = useRolesStore(
    useShallow((s) => ({
      roleContext: s.roleContext,
      assignedListIds: s.assignedListIds,
      isRoleLoading: s.isRoleLoading,
      roleError: s.roleError,
    })),
  )

  const isOwner = roleContext?.role === 'owner'
  const isStaff = roleContext?.role === 'staff'

  const hasPermission = useCallback(
    (key: PermissionKey): boolean => {
      if (!roleContext) return false
      if (roleContext.role === 'owner') return true
      return roleContext.permissions.includes(key)
    },
    [roleContext],
  )

  const canAccessList = useCallback(
    (listId: string): boolean => {
      if (!roleContext) return false
      if (roleContext.role === 'owner') return true
      return assignedListIds.includes(listId)
    },
    [roleContext, assignedListIds],
  )

  return {
    roleContext,
    isOwner,
    isStaff,
    hasPermission,
    canAccessList,
    isLoading: isRoleLoading,
    error: roleError,
  }
}

export default useRole
