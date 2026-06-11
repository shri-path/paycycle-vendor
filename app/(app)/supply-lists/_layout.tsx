/**
 * Supply Lists group layout — /(app)/supply-lists/* (US-005, WS-4).
 * Stack navigator for the owner supply-list management screens (list, create,
 * detail, edit, add-customers). Owner gating is enforced inside each screen
 * (useRequireOwner / RoleGate) as defence-in-depth; the parent (app) layout
 * already enforces authentication. Screens render their own AppHeader, so the
 * stack header is hidden — matching the staff route group convention.
 */

import { Stack } from 'expo-router'

export default function SupplyListsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
