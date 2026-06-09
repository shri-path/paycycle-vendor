/**
 * Staff Home route — /(app)/staff-home (US-002, WS-3).
 * Renders the staff-only landing screen. Role routing at /(app)/index sends staff
 * users here; owner-only screens redirect non-owners here as defence-in-depth.
 */

import StaffHomeScreen from '@modules/roles/screens/StaffHomeScreen'

export default function StaffHomeRoute() {
  return <StaffHomeScreen />
}
