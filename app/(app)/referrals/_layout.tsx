/**
 * Referrals sub-group layout — /(app)/referrals/* (US-014)
 * Stack navigator. Screens render their own AppHeader → headerShown: false.
 */

import { Stack } from 'expo-router'

export default function ReferralsSubLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
