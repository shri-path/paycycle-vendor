/**
 * Edit Customer route — /(app)/customers/[customerId]/edit (US-008, owner-only).
 * Thin wrapper rendering EditCustomerScreen, which reads `customerId` from the
 * route params itself via useLocalSearchParams. Owner-only guard enforced inside
 * the screen (useRequireOwner) as defence-in-depth.
 */

import EditCustomerScreen from '@modules/customers/screens/EditCustomerScreen'

export default function EditCustomerRoute() {
  return <EditCustomerScreen />
}
