/**
 * My Lists route — /(app)/my-lists (US-005, WS-4, staff entry).
 * Thin wrapper rendering WS-3's StaffSupplyListsScreen (assigned lists only,
 * read-only). Staff tap a card to open the shared read-only detail screen.
 */

import StaffSupplyListsScreen from '@modules/supply-lists/screens/StaffSupplyListsScreen'

export default function MyListsRoute() {
  return <StaffSupplyListsScreen />
}
