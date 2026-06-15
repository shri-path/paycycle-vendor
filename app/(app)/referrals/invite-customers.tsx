/**
 * Route — /(app)/referrals/invite-customers (US-014)
 * Owner-only: bulk WhatsApp invite to customers not yet on PayCycle.
 */

import BulkInviteCustomersScreen from '@modules/referral/screens/BulkInviteCustomersScreen'

export default function InviteCustomersRoute() {
  return <BulkInviteCustomersScreen />
}
