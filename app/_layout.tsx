/**
 * Root Layout
 * Entry point for the Deli Vendor app
 * Provides: NavigationContainer, Gesture Handler, Safe Area, Status Bar
 * Navigation setup from src/App.tsx (MainTabs)
 */

import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { MainTabs, useAppSetup } from '../src/App'

/**
 * RootLayout: Main entry point for the application
 * Uses NavigationIndependentTree to mark this NavigationContainer as independent
 * from Expo Router's NavigationContainer, preventing nesting conflicts
 */
export default function RootLayout() {
  // Initialize app-level setup
  useAppSetup()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationIndependentTree>
          <NavigationContainer>
            <MainTabs />
          </NavigationContainer>
        </NavigationIndependentTree>
        <StatusBar style="dark" backgroundColor="transparent" translucent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
