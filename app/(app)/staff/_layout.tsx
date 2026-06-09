/**
 * Staff group layout — /(app)/staff/* (US-002, WS-3).
 * Stack navigator for the owner-only staff-management screens (list, invite, detail).
 * This route group is only reached by owners; the screens add useRequireOwner as
 * defence-in-depth and the parent (app) layout already enforces authentication.
 */

import { Stack } from 'expo-router'

export default function StaffLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
