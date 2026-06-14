/**
 * Reminder History route — /(app)/customers/[customerId]/reminder-history (US-012)
 * Owner-only. ReminderHistoryScreen handles the useRequireOwner() guard.
 */

import ReminderHistoryScreen from '@modules/credit/screens/ReminderHistoryScreen'

export default function ReminderHistoryRoute() {
  return <ReminderHistoryScreen />
}
