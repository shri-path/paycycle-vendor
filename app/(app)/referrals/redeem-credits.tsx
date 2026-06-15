/**
 * Route — /(app)/referrals/redeem-credits (US-014)
 * Owner-only: redeem credits toward subscription / upgrade (withdrawal disabled v1).
 */

import CreditRedemptionScreen from '@modules/referral/screens/CreditRedemptionScreen'

export default function RedeemCreditsRoute() {
  return <CreditRedemptionScreen />
}
