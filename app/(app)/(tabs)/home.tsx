/**
 * Owner Home tab route — /(app)/(tabs)/home (Bottom Navigation Feature)
 * Thin re-export of OwnerDashboardScreen into the tab group.
 * Owner-only. Logic and guards live in the screen itself.
 */

import OwnerDashboardScreen from '@modules/dashboard/screens/OwnerDashboardScreen'

export default function TabHomeRoute() {
  return <OwnerDashboardScreen />
}
