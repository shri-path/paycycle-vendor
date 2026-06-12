/**
 * Subscription group layout — /(app)/subscription/* (US-009).
 * Stack navigator for the subscription screens (overview, upgrade, invoice detail).
 * Role gating is enforced inside each screen (useRequireOwner + route group) as
 * defence-in-depth. Screens render their own AppHeader, so the stack header is
 * hidden — matching the existing route-group convention (see activity/_layout.tsx).
 */

import { Stack } from 'expo-router'

export default function SubscriptionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
