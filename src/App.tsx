/**
 * App.tsx
 * Purpose: Root navigation setup with BottomTabNavigator
 * Note: NavigationContainer is handled in app/_layout.tsx
 * Structure: BottomTabNavigator with Ionicons
 */

import React, { useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAppStore } from '@store/appStore'
import { useTranslation } from '@hooks/useTranslation'
import Ionicons from '@expo/vector-icons/Ionicons'

// Screens
import { HomeScreen } from './screens/HomeScreen'
import { CustomersScreen } from './screens/CustomersScreen'

// Navigation types
export type MainTabsParamList = {
  HomeTab: undefined
  CustomersTab: undefined
  MoreTab: undefined
}

const Tab = createBottomTabNavigator<MainTabsParamList>()

/**
 * More Screen (Placeholder)
 */
const MoreScreen = () => {
  return <></>
}

/**
 * Bottom Tab Navigator
 */
const MainTabs = () => {
  const { t } = useTranslation()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#075E54',
        tabBarInactiveTintColor: '#667781',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('home.title'),
          tabBarLabel: t('home.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersScreen}
        options={{
          title: t('customer.title'),
          tabBarLabel: t('customer.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{
          title: 'More',
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

/**
 * MainTabs Component - exported for use in app/_layout.tsx
 */
export { MainTabs }

/**
 * App Hook - setup app-level effects
 */
export function useAppSetup() {
  const { setOnline } = useAppStore()

  useEffect(() => {
    // TODO: Add network monitoring with react-native-netinfo
    setOnline(true)
  }, [setOnline])
}
