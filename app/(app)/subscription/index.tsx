/**
 * Subscription overview route — /(app)/subscription (US-009).
 * Owner-only; screen enforces `useRequireOwner` defence-in-depth.
 */

import SubscriptionScreen from '@modules/subscription/screens/SubscriptionScreen'

export default function SubscriptionIndexRoute() {
  return <SubscriptionScreen />
}
