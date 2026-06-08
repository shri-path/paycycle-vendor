/**
 * RoleGate — composite. Purpose: conditionally render children based on the
 * caller's role/permission/list access for the active vendor. Used by US-005/006/
 * 008/009 to show/hide controls. Pure presentational wrapper over the role hooks.
 *
 * Usage (exactly ONE condition prop):
 *   <RoleGate require="owner"><OwnerOnlyButton /></RoleGate>
 *   <RoleGate permission="mark_deliveries"><MarkButton /></RoleGate>
 *   <RoleGate listId={listId} fallback={<Locked />}><Row /></RoleGate>
 *
 * Security note: this is a CONVENIENCE gate for UX only. The server is the
 * authority for every data-access decision; hiding a control here never replaces
 * server-side authorization.
 */

import React from 'react'
import { useRole } from '@modules/roles/hooks/useRole'
import type { PermissionKey } from '../../types/roles'

export interface RoleGateProps {
  /** Render children only for the owner role. */
  require?: 'owner'
  /** Render children only if the caller has this permission (owner = always). */
  permission?: PermissionKey
  /** Render children only if the caller can access this supply list (owner = always). */
  listId?: string
  /** Rendered when the condition is not met (default: nothing). */
  fallback?: React.ReactNode
  /** Gated content. */
  children: React.ReactNode
}

export const RoleGate: React.FC<RoleGateProps> = ({
  require,
  permission,
  listId,
  fallback = null,
  children,
}) => {
  const { isOwner, hasPermission, canAccessList } = useRole()

  let allowed = false
  if (require === 'owner') {
    allowed = isOwner
  } else if (permission) {
    allowed = hasPermission(permission)
  } else if (listId) {
    allowed = canAccessList(listId)
  }

  return <>{allowed ? children : fallback}</>
}

export default RoleGate
