/**
 * Deliveries group layout — /(app)/deliveries/* (US-006).
 * Stack navigator for the delivery-tracking screens (per-list deliveries, quick
 * mark, mark leave, add extra charge, today overview). Role gating is enforced
 * inside each screen (useRequireOwner / useRole / canAccessList) as defence-in-
 * depth; the parent (app) layout already enforces authentication. Screens render
 * their own AppHeader, so the stack header is hidden — matching the existing
 * route-group convention.
 */

import { Stack } from 'expo-router'

export default function DeliveriesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
