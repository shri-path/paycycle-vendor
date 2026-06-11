/**
 * Supply List Detail route — /(app)/supply-lists/[listId] (US-005, WS-4).
 * Thin wrapper rendering WS-3's SupplyListDetailScreen, which reads `listId`
 * from the route params itself via useLocalSearchParams. Reached by owners and
 * assigned staff; role gating lives in the screen (RoleGate / useRole).
 */

import SupplyListDetailScreen from '@modules/supply-lists/screens/SupplyListDetailScreen'

export default function SupplyListDetailRoute() {
  return <SupplyListDetailScreen />
}
