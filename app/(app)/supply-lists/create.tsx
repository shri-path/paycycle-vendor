/**
 * Create Supply List route — /(app)/supply-lists/create (US-005, WS-4, owner-only).
 * Thin wrapper rendering WS-2's CreateSupplyListScreen. One tap from the list.
 */

import CreateSupplyListScreen from '@modules/supply-lists/screens/CreateSupplyListScreen'

export default function CreateSupplyListRoute() {
  return <CreateSupplyListScreen />
}
