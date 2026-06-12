/**
 * Staff Home route — /(app)/staff-home (US-010)
 * Renders StaffDashboardScreen which supersedes the old StaffHomeScreen (US-002).
 * See FEATURE_PLAN OQ-4: the new richer staff dashboard replaces the placeholder.
 * The old StaffHomeScreen is left in place (unreferenced) to avoid breaking US-002 tests.
 */

import StaffDashboardScreen from '@modules/dashboard/screens/StaffDashboardScreen'

export default function StaffHomeRoute() {
  return <StaffDashboardScreen />
}
