/**
 * Today's Deliveries route — /(app)/deliveries/today (US-006, owner).
 * Thin wrapper rendering TodayOverviewScreen. Owner-only gating lives in the
 * screen via useRequireOwner (defence-in-depth over the route group).
 */

import TodayOverviewScreen from '@modules/delivery/screens/TodayOverviewScreen'

export default function TodayOverviewRoute() {
  return <TodayOverviewScreen />
}
