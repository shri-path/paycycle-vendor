/**
 * Add Customer route — /(app)/customers/add (US-008, owner-only).
 * Thin wrapper rendering AddCustomerScreen. Owner-only guard is enforced inside
 * the screen (useRequireOwner) as defence-in-depth.
 */

import AddCustomerScreen from '@modules/customers/screens/AddCustomerScreen'

export default function AddCustomerRoute() {
  return <AddCustomerScreen />
}
