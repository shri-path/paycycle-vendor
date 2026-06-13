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
import { StyleSheet, Platform } from 'react-native'
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
import { colors } from '@constants/tokens'
import { logError } from '@utils/logger'

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

function StaffMoreMenuScreenContent(): React.ReactElement {
  const { t } = useTranslation()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const { hasPermission } = useRole()

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

  // Memoize sections
  const sections = useMemo(
    () => getMoreSections('staff', hasPermission, { navigate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission],
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

  return (
    <SafeAreaView style={styles.safe}>
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
