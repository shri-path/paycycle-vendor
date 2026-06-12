/**
 * Home Screen — /(app)/home (US-010)
 * Owner's landing screen. Renders OwnerDashboardScreen which includes the
 * SubscriptionBanner (US-009) and all dashboard sections.
 *
 * US-009 note: SubscriptionBanner is now mounted inside OwnerDashboardScreen
 * so this route file stays thin (following FEATURE_PLAN §5).
 */

import OwnerDashboardScreen from '@modules/dashboard/screens/OwnerDashboardScreen'

export default function HomeRoute() {
  return <OwnerDashboardScreen />
}
