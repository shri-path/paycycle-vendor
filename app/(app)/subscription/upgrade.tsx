/**
 * Upgrade plan route — /(app)/subscription/upgrade (US-009).
 * Owner-only; screen enforces `useRequireOwner` defence-in-depth.
 */

import UpgradePlanScreen from '@modules/subscription/screens/UpgradePlanScreen'

export default function UpgradeRoute() {
  return <UpgradePlanScreen />
}
