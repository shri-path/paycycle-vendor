/**
 * Root Layout
 * Entry point for the PayCycle Vendor app
 * Provides: Tamagui (design system), Gesture Handler, Safe Area, Status Bar
 *
 * TamaguiProvider MUST wrap the tree — screens render Tamagui primitives
 * (YStack/XStack/ScrollView), which cannot render without the config + provider.
 */

import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Slot } from 'expo-router'
import { TamaguiProvider } from 'tamagui'
import tamaguiConfig from '../src/tamagui.config'
import { installWebFocusRing } from '../src/styles/webFocusRing'

// Install the global brand focus-ring on web (no-op on native).
installWebFocusRing()

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Slot />
          <StatusBar style="dark" backgroundColor="transparent" translucent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </TamaguiProvider>
  )
}
