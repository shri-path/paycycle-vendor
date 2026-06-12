/**
 * Collections route — /(app)/collections (US-010)
 * Owner-only drill-down. useRequireOwner() is called inside CollectionsScreen.
 */

import CollectionsScreen from '@modules/dashboard/screens/CollectionsScreen'

export default function CollectionsRoute() {
  return <CollectionsScreen />
}
