/**
 * Customer List route — /(app)/customers (US-008).
 * Thin wrapper rendering CustomerListScreen. Accessible to both owner and staff;
 * role-specific filtering is enforced inside the screen (useRole).
 */

import CustomerListScreen from '@modules/customers/screens/CustomerListScreen'

export default function CustomerListRoute() {
  return <CustomerListScreen />
}
