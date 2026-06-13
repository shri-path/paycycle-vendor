/**
 * StaffMoreMenuScreen — Staff More Tab (Bottom Navigation Feature)
 * Route: /(app)/(tabs)/more (when role = staff or unknown)
 *
 * Renders the staff More menu using MoreMenuList + getMoreSections.
 * Staff menu includes: Today's Leaves, My Delivery History, Change Password (disabled),
 * Notifications, Help (disabled), Contact Owner (disabled).
 *
 * Logout: same flow as owner — confirm dialog → store.logout() → redirect to login.
 * Wrapped in ScreenErrorBoundary so a render crash never takes down the tab bar.
 */

import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Platform, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'

import { AppHeader } from '@components/layout/AppHeader'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { MoreMenuList } from '../components/MoreMenuList'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { getMoreSections } from '../nav.config'
import { colors, spacing } from '@constants/tokens'
import { logError } from '@utils/logger'

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

function StaffMoreMenuScreenContent(): React.ReactElement {
  const { t } = useTranslation()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const { hasPermission, isLoading } = useRole()

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Navigate handler passed to getMoreSections — keeps config pure
  const navigate = useCallback(
    (href: string) => {
      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync()
      }
      router.push(href as Parameters<typeof router.push>[0])
    },
    [router],
  )

  // Memoize sections — include `navigate` in deps to avoid stale-closure on router changes
  // (MAJOR-4: removing the eslint-disable suppression; navigate is useCallback'd on [router]
  //  so it only triggers a rebuild when the router identity changes, which is rare)
  const sections = useMemo(
    () => getMoreSections('staff', hasPermission, { navigate }),
    [hasPermission, navigate],
  )

  const handleLogoutPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
    setShowLogoutConfirm(true)
  }, [])

  const handleLogoutConfirm = useCallback(async () => {
    setShowLogoutConfirm(false)
    try {
      await logout()
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      router.replace('/(auth)/login')
    } catch (err) {
      void logError(err, { screen: 'StaffMore', action: 'logout' })
    }
  }, [logout, router])

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirm(false)
  }, [])

  // MAJOR-5: Loading state while role is still resolving from store hydration
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <AppHeader title={t('nav.more.title')} />
        <View style={styles.loadingContainer} testID="staff-more-menu-loading">
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel={t('common.loading')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    // CRITICAL-3: omit 'bottom' edge — AppTabBar already applies paddingBottom: insets.bottom
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader title={t('nav.more.title')} />

      <MoreMenuList sections={sections} onLogout={handleLogoutPress} />

      <AppConfirmDialog
        visible={showLogoutConfirm}
        title={t('nav.logout.confirmTitle')}
        description={t('nav.logout.confirmBody')}
        confirmLabel={t('nav.logout.confirm')}
        cancelLabel={t('nav.logout.cancel')}
        confirmVariant="danger"
        onConfirm={() => void handleLogoutConfirm()}
        onCancel={handleLogoutCancel}
      />
    </SafeAreaView>
  )
}

export default function StaffMoreMenuScreen(): React.ReactElement {
  return (
    <ScreenErrorBoundary>
      <StaffMoreMenuScreenContent />
    </ScreenErrorBoundary>
  )
}
