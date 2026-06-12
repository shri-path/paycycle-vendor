/**
 * Record Payment route — /(app)/customers/[customerId]/record-payment (US-008, owner-only).
 * Thin wrapper rendering RecordPaymentScreen, which reads `customerId` from the
 * route params itself via useLocalSearchParams. Owner-only guard enforced inside
 * the screen (useRequireOwner) as defence-in-depth.
 */

import RecordPaymentScreen from '@modules/customers/screens/RecordPaymentScreen'

export default function RecordPaymentRoute() {
  return <RecordPaymentScreen />
}
