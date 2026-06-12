/**
 * Staff Activity Log route — /(app)/activity (US-007).
 * Owner-only timeline; the screen enforces `useRequireOwner` defence-in-depth.
 */

import StaffActivityLogScreen from '@modules/audit/screens/StaffActivityLogScreen'

export default function ActivityIndexRoute() {
  return <StaffActivityLogScreen />
}
