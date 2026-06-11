/**
 * Add Customers route — /(app)/supply-lists/[listId]/add-customers (US-005, WS-4, owner-only).
 * Thin wrapper rendering WS-3's AddCustomersScreen, which reads `listId` from the
 * route params itself via useLocalSearchParams.
 */

import AddCustomersScreen from '@modules/supply-lists/screens/AddCustomersScreen'

export default function AddCustomersRoute() {
  return <AddCustomersScreen />
}
