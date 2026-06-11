/**
 * Edit Supply List route — /(app)/supply-lists/[listId]/edit (US-005, WS-4, owner-only).
 * Thin wrapper rendering WS-2's EditSupplyListScreen, which reads `listId` from
 * the route params itself via useLocalSearchParams.
 */

import EditSupplyListScreen from '@modules/supply-lists/screens/EditSupplyListScreen'

export default function EditSupplyListRoute() {
  return <EditSupplyListScreen />
}
