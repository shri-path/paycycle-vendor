/**
 * Settings route — /(app)/settings (US-011, S1, owner entry).
 * Thin wrapper rendering VendorSettingsScreen. The owner-only guard is
 * enforced inside the screen (useRequireOwner) as defence-in-depth.
 */

import VendorSettingsScreen from '@modules/settings/screens/VendorSettingsScreen'

export default function SettingsRoute() {
  return <VendorSettingsScreen />
}
