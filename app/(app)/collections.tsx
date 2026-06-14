/**
 * Collections route — /(app)/collections (US-012)
 * Repointed from US-010 CollectionsScreen to the richer US-012 CollectionsDashboardScreen.
 * Owner-only guard is enforced inside the screen.
 */

import CollectionsDashboardScreen from '@modules/credit/screens/CollectionsDashboardScreen'

export default function CollectionsRoute() {
  return <CollectionsDashboardScreen />
}
