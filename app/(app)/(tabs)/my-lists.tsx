/**
 * My Lists tab route — /(app)/(tabs)/my-lists (Bottom Navigation Feature)
 * Thin re-export of StaffSupplyListsScreen into the tab group.
 * Staff-only tab.
 */

import StaffSupplyListsScreen from '@modules/supply-lists/screens/StaffSupplyListsScreen'

export default function TabMyListsRoute() {
  return <StaffSupplyListsScreen />
}
