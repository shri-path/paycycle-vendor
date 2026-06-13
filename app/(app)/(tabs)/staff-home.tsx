/**
 * Staff Home tab route — /(app)/(tabs)/staff-home (Bottom Navigation Feature)
 * Thin re-export of StaffDashboardScreen into the tab group.
 * Staff-only. Logic and guards live in the screen itself.
 */

import StaffDashboardScreen from '@modules/dashboard/screens/StaffDashboardScreen'

export default function TabStaffHomeRoute() {
  return <StaffDashboardScreen />
}
