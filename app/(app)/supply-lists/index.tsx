/**
 * Supply Lists route — /(app)/supply-lists (US-005, WS-4, owner entry).
 * Thin wrapper rendering WS-2's SupplyListsScreen. The owner-only guard is
 * enforced inside the screen (useRequireOwner) as defence-in-depth.
 */

import SupplyListsScreen from '@modules/supply-lists/screens/SupplyListsScreen'

export default function SupplyListsRoute() {
  return <SupplyListsScreen />
}
