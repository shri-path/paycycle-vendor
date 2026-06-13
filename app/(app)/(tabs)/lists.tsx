/**
 * Lists tab route — /(app)/(tabs)/lists (Bottom Navigation Feature)
 * Thin re-export of SupplyListsScreen into the tab group.
 * Owner-only tab. Guard is in the screen (useRequireOwner).
 */

import SupplyListsScreen from '@modules/supply-lists/screens/SupplyListsScreen'

export default function TabListsRoute() {
  return <SupplyListsScreen />
}
