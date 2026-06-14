/**
 * Credit Settings route — /(app)/customers/[customerId]/credit-settings (US-012)
 * Owner-only. SetCreditSettingsScreen handles the useRequireOwner() guard.
 */

import SetCreditSettingsScreen from '@modules/credit/screens/SetCreditSettingsScreen'

export default function CreditSettingsRoute() {
  return <SetCreditSettingsScreen />
}
