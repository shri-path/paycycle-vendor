/**
 * AppTabBar Component (Bottom Navigation Feature)
 * Layer 2 - Layout Component
 *
 * Purpose: Custom bottom tab bar renderer for Expo Router <Tabs>.
 * Receives role-filtered items from the tab layout. Renders the persistent
 * navigation bar at 56px + safe-area inset with WhatsApp-style appearance.
 *
 * Key features:
 * - Animated active indicator (2px top bar, slides via reanimated)
 * - Filled vs outline icon + bold active label (color is NOT the only signal)
 * - Offline / syncing strip above the bar
 * - Haptic selection feedback on tab change
 * - 44×44 minimum touch targets (full-bar-height × equal-flex-width)
 * - accessibilityRole="tab" per item, "tablist" on container
 * - RTL-safe: start/end only, no left/right
 * - Reduce-motion aware: skips animations when system preference is set
 */

import React, { useEffect, useRef, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  I18nManager,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import type { TabNavigationState, ParamListBase } from '@react-navigation/native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

import { AppText } from '../primitives/AppText'
import { colors, spacing, fontSize, fontWeight, componentSizes, animation } from '@constants/tokens'
import { useTranslation } from '@hooks/useTranslation'
import type { TabItem } from '@modules/navigation/nav.config'

// ============================================================================
// TYPES
// ============================================================================

export interface AppTabBarProps {
  state: TabNavigationState<ParamListBase>
  navigation: BottomTabBarProps['navigation']
  items: TabItem[]
  isOnline: boolean
  isSyncing: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TAB_BAR_HEIGHT = 56
const INDICATOR_HEIGHT = 2
const ANIMATION_DURATION = animation.duration.fast // 150ms

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  offlineStrip: {
    backgroundColor: colors.warningBg,
  },
  syncStrip: {
    backgroundColor: colors.primaryBg,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    height: INDICATOR_HEIGHT,
    backgroundColor: colors.primary,
  },
  tabLabel: {
    marginTop: spacing[1],
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  tabLabelInactive: {
    color: colors.textSecondary,
    fontWeight: fontWeight.regular,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

export const AppTabBar = React.memo<AppTabBarProps>(function AppTabBar({
  state,
  navigation,
  items,
  isOnline,
  isSyncing,
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduceMotion = useRef(false)

  // Subscribe to reduce-motion preference — reads current value and listens for changes
  // (INFO-1: live updates when user toggles system accessibility preference)
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotion.current = enabled
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotion.current = enabled
    })
    return () => sub.remove()
  }, [])

  // Animated indicator x-position (proportional to tab index)
  const indicatorLeft = useSharedValue(0)
  const tabCount = items.length

  // Update indicator when active index changes
  useEffect(() => {
    const pct = tabCount > 0 ? state.index / tabCount : 0
    if (reduceMotion.current) {
      indicatorLeft.value = pct
    } else {
      indicatorLeft.value = withTiming(pct, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      })
    }
  }, [state.index, tabCount, indicatorLeft])

  // RTL-safe active indicator: use `right` in RTL layouts so the indicator
  // tracks the correct tab in bidirectional layouts (MAJOR-3)
  const indicatorStyle = useAnimatedStyle(() => {
    const pct = `${indicatorLeft.value * 100}%` as `${number}%`
    const width = `${(1 / tabCount) * 100}%` as `${number}%`
    return I18nManager.isRTL
      ? { right: pct, width }
      : { left: pct, width }
  })

  const handleTabPress = useCallback(
    (routeName: string, index: number) => {
      const isFocused = state.index === index
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes[index]?.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        // Haptic feedback on tab change
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync()
        }
        navigation.navigate(routeName)
      }
    },
    [state, navigation],
  )

  const showStatusStrip = !isOnline || isSyncing

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* Offline / syncing strip above the tab bar */}
      {showStatusStrip && (
        <View
          style={[
            styles.statusStrip,
            isSyncing ? styles.syncStrip : styles.offlineStrip,
          ]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name={isSyncing ? 'sync-outline' : 'cloud-offline-outline'}
            size={componentSizes.icon.xs}
            color={colors.textSecondary}
            importantForAccessibility="no"
          />
          <AppText style={styles.statusText}>
            {isSyncing ? t('nav.syncing') : t('nav.offline')}
          </AppText>
        </View>
      )}

      {/* Tab bar */}
      <View
        style={styles.tabBar}
        accessibilityRole="tablist"
      >
        {/* Active indicator — slides across the top of the bar */}
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />

        {items.map((item, index) => {
          const isActive = state.index === index
          const routeName = item.name

          return (
            <TouchableOpacity
              key={routeName}
              style={styles.tab}
              onPress={() => handleTabPress(routeName, index)}
              activeOpacity={animation.opacity.active}
              accessibilityRole="tab"
              accessibilityLabel={t(item.labelKey)}
              accessibilityState={{ selected: isActive }}
              testID={`tab-${routeName}`}
            >
              {/* Icon (filled = active, outline = inactive) */}
              {item.icon(isActive)}

              {/* Label */}
              <AppText
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {t(item.labelKey)}
              </AppText>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
})

AppTabBar.displayName = 'AppTabBar'

export default AppTabBar
