/**
 * Tab Group Layout — app/(app)/(tabs)/_layout.tsx (Bottom Navigation Feature)
 * Purpose: Expo Router <Tabs> shell with a custom AppTabBar renderer.
 *
 * Role awareness:
 * - Owner  → 4 tabs: home, lists, customers, more
 * - Staff  → 3 tabs: staff-home, my-lists, more
 * - Unknown → staff set (least-privilege default)
 *
 * Performance:
 * - lazy={true} (Expo Router default) — tabs mount only when first visited
 * - items memoized on role so the array isn't recreated every render
 * - useShallow on appStore to avoid spurious re-renders
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
  const { isOwner, isStaff } = useRole()
  const { t } = useTranslation()
  const { isOnline, isSyncing } = useAppStore(
    useShallow((s) => ({ isOnline: s.isOnline, isSyncing: s.isSyncing })),
  )

  // Derive role string — null until resolved (renders staff set as least-privilege)
  const role: 'owner' | 'staff' | null = isOwner ? 'owner' : isStaff ? 'staff' : null

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
        lazy: true,
      }}
    >
      {/* Owner-only tabs — hidden for staff via href: null */}
      <Tabs.Screen
        name="home"
        options={{
          href: isOwner ? undefined : null,
          title: t('nav.tab.home'),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          href: isOwner ? undefined : null,
          title: t('nav.tab.lists'),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          href: isOwner ? undefined : null,
          title: t('nav.tab.customers'),
        }}
      />

      {/* Staff-only tabs — hidden for owner via href: null */}
      <Tabs.Screen
        name="staff-home"
        options={{
          href: isOwner ? null : undefined,
          title: t('nav.tab.home'),
        }}
      />
      <Tabs.Screen
        name="my-lists"
        options={{
          href: isOwner ? null : undefined,
          title: t('nav.tab.myLists'),
        }}
      />

      {/* Shared: More menu — always visible */}
      <Tabs.Screen
        name="more"
        options={{
          title: t('nav.tab.more'),
        }}
      />
    </Tabs>
  )
}
