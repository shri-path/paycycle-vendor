/**
 * Invite Staff route — /(app)/staff/invite (US-002, WS-3, owner-only).
 * Thin wrapper rendering WS-2's InviteStaffScreen.
 */

import InviteStaffScreen from '@modules/roles/screens/InviteStaffScreen'

export default function InviteStaffRoute() {
  return <InviteStaffScreen />
}
