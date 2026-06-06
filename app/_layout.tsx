/**
 * Root Layout
 * Entry point for the PayCycle Vendor app
 * Provides: Gesture Handler, Safe Area, Status Bar
 * Screens and navigation will be added by feature development
 */

import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Slot } from 'expo-router'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
        <StatusBar style="dark" backgroundColor="transparent" translucent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
