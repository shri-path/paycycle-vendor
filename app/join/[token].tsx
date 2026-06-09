/**
 * Staff Join route — /join/[token] (US-002, WS-3, public).
 * Resolves the `paycyclevendor://join/<token>` invite deep link (OQ-4). The
 * `paycyclevendor` scheme is declared in app.json, so Expo Router maps the link to
 * this file automatically — no extra linking config is needed. Lives OUTSIDE the
 * (app) auth group so it is reachable while logged out (and while logged in, where
 * the screen requires an explicit sign-out first per OQ-2).
 */

import StaffJoinScreen from '@modules/roles/screens/StaffJoinScreen'

export default function StaffJoinRoute() {
  return <StaffJoinScreen />
}
