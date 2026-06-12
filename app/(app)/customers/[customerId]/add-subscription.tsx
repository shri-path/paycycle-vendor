/**
 * Add Subscription route — /(app)/customers/[customerId]/add-subscription (US-008, owner-only).
 * Thin wrapper rendering AddSubscriptionScreen, which reads `customerId` from the
 * route params itself via useLocalSearchParams. Owner-only guard enforced inside
 * the screen (useRequireOwner) as defence-in-depth.
 */

import AddSubscriptionScreen from '@modules/customers/screens/AddSubscriptionScreen'

export default function AddSubscriptionRoute() {
  return <AddSubscriptionScreen />
}
