/**
 * Bulk Send Reminders route — /(app)/settings/bulk/send-reminders (US-011, S5).
 * Thin wrapper rendering BulkSendRemindersScreen.
 */

import BulkSendRemindersScreen from '@modules/settings/screens/BulkSendRemindersScreen'

export default function BulkSendRemindersRoute() {
  return <BulkSendRemindersScreen />
}
