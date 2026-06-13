/**
 * Notification Preferences route — /(app)/settings/notifications (US-011, S2).
 * Thin wrapper rendering NotificationPreferencesScreen.
 */

import NotificationPreferencesScreen from '@modules/settings/screens/NotificationPreferencesScreen'

export default function NotificationsRoute() {
  return <NotificationPreferencesScreen />
}
