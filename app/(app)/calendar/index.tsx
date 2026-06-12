/**
 * Calendar route — /(app)/calendar (US-006, owner).
 * Thin wrapper rendering CalendarScreen. Owner-only gating via useRequireOwner.
 */

import CalendarScreen from '@modules/delivery/screens/CalendarScreen'

export default function CalendarRoute() {
  return <CalendarScreen />
}
