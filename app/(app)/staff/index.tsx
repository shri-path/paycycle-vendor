/**
 * Staff List route — /(app)/staff (US-002, WS-3, owner-only).
 * Thin wrapper rendering WS-2's StaffListScreen. The owner-only guard is enforced
 * inside the screen (useRequireOwner) as defence-in-depth over the route group.
 */

import StaffListScreen from '@modules/roles/screens/StaffListScreen'

export default function StaffListRoute() {
  return <StaffListScreen />
}
