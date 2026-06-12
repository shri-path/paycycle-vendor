/**
 * Calendar group layout — /(app)/calendar/* (US-006, owner).
 * Stack navigator for the owner calendar + day-detail screens. Owner gating is
 * enforced inside each screen (useRequireOwner). Screens render their own
 * AppHeader, so the stack header is hidden.
 */

import { Stack } from 'expo-router'

export default function CalendarLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
