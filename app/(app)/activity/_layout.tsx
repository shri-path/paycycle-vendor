/**
 * Activity group layout — /(app)/activity/* (US-007).
 * Stack navigator for the audit & accountability screens (activity log, conflicts,
 * staff summary, my activity). Role gating is enforced inside each screen
 * (useRequireOwner / route group) as defence-in-depth; the parent (app) layout
 * already enforces authentication. Screens render their own AppHeader, so the stack
 * header is hidden — matching the existing route-group convention.
 */

import { Stack } from 'expo-router'

export default function ActivityLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
