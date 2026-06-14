/**
 * Tab Group Layout — app/(app)/(tabs)/_layout.tsx (Bottom Navigation Feature)
 * Purpose: Expo Router <Tabs> shell with a custom AppTabBar renderer.
 *
 * Role awareness:
 * - Owner  → 4 tabs: home, lists, customers, more
 * - Staff  → 3 tabs: staff-home, my-lists, more
 * - Unknown → staff set (least-privilege default)
 *
 * IMPORTANT — why <Tabs.Protected> and NOT `href: null`:
 * `href: null` only hides a tab's button; Expo Router keeps the screen REGISTERED
 * in the navigator, and React Navigation v7 mounts inactive tab screens at least
 * once. That caused staff sessions to mount the owner-only screens (lists,
 * customers), whose on-mount data fetch hit owner-only endpoints → 403 → the
 * shared HTTP interceptor logged the user out (the "login then bounce" bug).
 * Tabs.Protected with a role guard EXCLUDES the screens from the navigator
 * entirely, so the wrong-role screens never mount. As a bonus, state.routes then
 * matches the role's tab set exactly.
 *
 * Offline / sync: reads isOnline / isSyncing from appStore and passes to AppTabBar
 * which renders a thin strip above the bar.
 */

import React, { useMemo, useCallback } from 'react'
import { Tabs } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'

import { AppTabBar } from '@components/layout/AppTabBar'
import { useRole } from '@modules/roles/hooks/useRole'
import { useAppStore } from '@store/appStore'
import { getTabsForRole } from '@modules/navigation/nav.config'
import { useTranslation } from '@hooks/useTranslation'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

export default function TabsLayout() {
  const { isOwner } = useRole()
  const { t } = useTranslation()
  const { isOnline, isSyncing } = useAppStore(
    useShallow((s) => ({ isOnline: s.isOnline, isSyncing: s.isSyncing })),
  )

  // Role string for the tab-bar item set — null/unknown falls back to the staff
  // (least-privilege) set, matching the !isOwner guard on the staff screen group.
  const role: 'owner' | 'staff' = isOwner ? 'owner' : 'staff'

  // Memoize tab items so the array identity is stable between renders
  const items = useMemo(() => getTabsForRole(role), [role])

  // Stable tab bar renderer — useCallback prevents remounting on isOnline/isSyncing/role changes
  // which would otherwise lose Reanimated shared-value state and cause jank (CRITICAL-2 / MINOR-4)
  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => (
      <AppTabBar
        {...props}
        items={items}
        isOnline={isOnline}
        isSyncing={isSyncing}
      />
    ),
    [items, isOnline, isSyncing],
  )

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Owner-only tabs — excluded from the navigator for non-owners */}
      <Tabs.Protected guard={isOwner}>
        <Tabs.Screen name="home" options={{ title: t('nav.tab.home') }} />
        <Tabs.Screen name="lists" options={{ title: t('nav.tab.lists') }} />
        <Tabs.Screen name="customers" options={{ title: t('nav.tab.customers') }} />
      </Tabs.Protected>

      {/* Staff (and unknown/loading) tabs — excluded for owners */}
      <Tabs.Protected guard={!isOwner}>
        <Tabs.Screen name="staff-home" options={{ title: t('nav.tab.home') }} />
        <Tabs.Screen name="my-lists" options={{ title: t('nav.tab.myLists') }} />
      </Tabs.Protected>

      {/* Shared: More menu — always registered */}
      <Tabs.Screen name="more" options={{ title: t('nav.tab.more') }} />
    </Tabs>
  )
}
