/**
 * Auth Group Layout
 * Purpose: Stack navigator for unauthenticated screens
 */

import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
