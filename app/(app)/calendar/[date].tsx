/**
 * Day Detail route — /(app)/calendar/[date] (US-006, owner).
 * Thin wrapper rendering DayDetailScreen, which reads `date` from route params.
 * Owner-only gating via useRequireOwner.
 */

import DayDetailScreen from '@modules/delivery/screens/DayDetailScreen'

export default function DayDetailRoute() {
  return <DayDetailScreen />
}
