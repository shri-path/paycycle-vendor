/**
 * Staff Detail route — /(app)/staff/[staffId] (US-002, WS-3, owner-only).
 * Thin wrapper rendering WS-2's StaffDetailScreen, which reads `staffId` from the
 * route params itself via useLocalSearchParams.
 */

import StaffDetailScreen from '@modules/roles/screens/StaffDetailScreen'

export default function StaffDetailRoute() {
  return <StaffDetailScreen />
}
