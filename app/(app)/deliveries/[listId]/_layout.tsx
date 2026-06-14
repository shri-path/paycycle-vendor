/**
 * [listId] nested stack layout (US-013).
 * Wraps: index (DeliveryListScreen) and voice (VoiceCommandScreen).
 * Screens render their own AppHeader, so Stack header is hidden.
 */

import { Stack } from 'expo-router'

export default function ListIdLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
