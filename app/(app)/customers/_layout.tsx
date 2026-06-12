/**
 * Customers group layout — /(app)/customers/* (US-008).
 * Stack navigator for the customer management screens (list, add, detail, edit,
 * subscriptions, payments, credit limit). Role gating is enforced inside each
 * screen (useRole / RoleGate) as defence-in-depth; the parent (app) layout
 * already enforces authentication. Screens render their own AppHeader, so the
 * stack header is hidden — matching the existing route-group convention.
 */

import { Stack } from 'expo-router'

export default function CustomersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
