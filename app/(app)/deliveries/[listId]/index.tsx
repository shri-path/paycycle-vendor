/**
 * Supply List Deliveries route — /(app)/deliveries/[listId] (US-006).
 * Thin wrapper rendering DeliveryListScreen, which reads `listId` from the route
 * params itself. Reached by owners and assigned staff; role/list-access gating
 * lives in the screen (useRole / canAccessList).
 */

import DeliveryListScreen from '@modules/delivery/screens/DeliveryListScreen'

export default function DeliveryListRoute() {
  return <DeliveryListScreen />
}
