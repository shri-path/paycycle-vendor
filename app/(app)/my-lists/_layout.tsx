/**
 * My Lists group layout — /(app)/my-lists/* (US-005, WS-4, staff entry).
 * Stack navigator for the staff read-only supply-list surface. Role gating
 * lives in the screen (useRole / RoleGate); the parent (app) layout enforces
 * authentication. The screen renders its own AppHeader, so the stack header is
 * hidden — matching the staff route group convention.
 */

import { Stack } from 'expo-router'

export default function MyListsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
