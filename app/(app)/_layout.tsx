/**
 * App Group Layout
 * Purpose: Stack navigator for authenticated screens (placeholder — tabs added in future sprints)
 */

import { Stack } from 'expo-router'

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
