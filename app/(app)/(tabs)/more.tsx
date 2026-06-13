/**
 * More tab route — /(app)/(tabs)/more (Bottom Navigation Feature)
 * Single route file that branches on role: owner → MoreMenuScreen,
 * staff (or unknown) → StaffMoreMenuScreen. This keeps the tab-set
 * declaration to a single <Tabs.Screen name="more" />.
 */

import React from 'react'
import { useRole } from '@modules/roles/hooks/useRole'
import MoreMenuScreen from '@modules/navigation/screens/MoreMenuScreen'
import StaffMoreMenuScreen from '@modules/navigation/screens/StaffMoreMenuScreen'

export default function MoreTabRoute() {
  const { isOwner } = useRole()

  return isOwner ? <MoreMenuScreen /> : <StaffMoreMenuScreen />
}
