/**
 * Set Credit Limit route — /(app)/customers/[customerId]/credit-limit (US-008, owner-only).
 * Thin wrapper rendering SetCreditLimitScreen, which reads `customerId` from the
 * route params itself via useLocalSearchParams. Owner-only guard enforced inside
 * the screen (useRequireOwner) as defence-in-depth.
 */

import SetCreditLimitScreen from '@modules/customers/screens/SetCreditLimitScreen'

export default function SetCreditLimitRoute() {
  return <SetCreditLimitScreen />
}
