/**
 * Collections sub-group layout — /(app)/collections/* (US-012)
 * Stack navigator for priority list, reminder config, analytics.
 * Screens render their own AppHeader → headerShown: false.
 */

import { Stack } from 'expo-router'

export default function CollectionsSubLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
