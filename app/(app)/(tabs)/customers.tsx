/**
 * Customers tab route — /(app)/(tabs)/customers (Bottom Navigation Feature)
 * Thin re-export of CustomerListScreen into the tab group.
 * Owner-only tab. Guard in screen.
 */

import CustomerListScreen from '@modules/customers/screens/CustomerListScreen'

export default function TabCustomersRoute() {
  return <CustomerListScreen />
}
