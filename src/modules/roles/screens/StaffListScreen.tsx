/**
 * StaffListScreen — Owner-only (US-002, wireframe 2.13).
 * Purpose: List active + disabled staff with an "Active: N" count, pull-to-refresh,
 * a card→detail tap, and a "+ Invite Staff" FAB (online-only).
 *
 * 5 states: Loading (skeleton cards), Empty, Error (inline retry), Content, Offline.
 * OQ-5: shows ONLY the real "Active: N" — the plan/staff-allowed line is omitted
 * (deferred to US-009).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, FlatList, StyleSheet, RefreshControl, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { AppSection } from '@components/composite/AppSection'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { StaffCard } from '../components/StaffCard'
import { useRolesStore } from '../store/roles.store'
import { useRequireOwner } from '../hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { StaffResponseDto } from '../../../types/roles'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  countRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  sectionTitle: { marginBottom: spacing[3] },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[20] },
  skeletonCard: { height: 84, marginBottom: spacing[2], backgroundColor: colors.gray100 },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
    minWidth: componentSizes.button.lg,
    minHeight: componentSizes.button.lg,
    paddingHorizontal: spacing[5],
    borderRadius: componentSizes.button.lg,
    elevation: 4,
  },
})

function StaffListSkeleton() {
  return (
    <View style={styles.listContent} testID="staff-list-skeleton">
      {[0, 1, 2].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function StaffListScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { staffList, isStaffLoading, staffError, fetchStaffList, fetchRole, roleContext } =
    useRolesStore(
      useShallow((s) => ({
        staffList: s.staffList,
        isStaffLoading: s.isStaffLoading,
        staffError: s.staffError,
        fetchStaffList: s.fetchStaffList,
        fetchRole: s.fetchRole,
        roleContext: s.roleContext,
      })),
    )

  // OQ-7: non-blocking "your permissions were updated" notice when a focus re-fetch
  // detects role/permission drift.
  const [permissionsUpdated, setPermissionsUpdated] = useState(false)
  const prevPermissions = useRef<string | null>(null)

  useEffect(() => {
    void fetchStaffList(1)
  }, [fetchStaffList])

  // OQ-7: snapshot permissions, re-fetch the role on focus, and flag drift.
  useFocusEffect(
    useCallback(() => {
      prevPermissions.current = roleContext ? [...roleContext.permissions].sort().join(',') : null
      void fetchRole()
    }, [fetchRole, roleContext]),
  )

  useEffect(() => {
    const next = roleContext ? [...roleContext.permissions].sort().join(',') : null
    if (prevPermissions.current !== null && next !== null && next !== prevPermissions.current) {
      setPermissionsUpdated(true)
    }
    prevPermissions.current = next
  }, [roleContext])

  const visibleStaff = useMemo(
    () => staffList.filter((s) => s.status !== 'REMOVED'),
    [staffList],
  )
  // "Active" section holds ACTIVE + INVITED (operational); "Disabled" is collapsed below.
  const activeStaff = useMemo(
    () => visibleStaff.filter((s) => s.status !== 'DISABLED'),
    [visibleStaff],
  )
  const disabledStaff = useMemo(
    () => visibleStaff.filter((s) => s.status === 'DISABLED'),
    [visibleStaff],
  )
  // OQ-5: "Active: N" counts only truly-active staff (not invited/disabled).
  const activeCount = useMemo(
    () => visibleStaff.filter((s) => s.status === 'ACTIVE').length,
    [visibleStaff],
  )

  // StaffCard fires the selection haptic; this just navigates.
  const goToDetail = useCallback(
    (staffId: string) => {
      router.push(`/(app)/staff/${staffId}`)
    },
    [router],
  )

  const goToInvite = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/staff/invite')
  }, [router])

  const renderItem = useCallback(
    ({ item }: { item: StaffResponseDto }) => (
      <StaffCard staff={item} onPress={goToDetail} testID={`staff-card-${item.staffId}`} />
    ),
    [goToDetail],
  )
  const keyExtractor = useCallback((s: StaffResponseDto) => s.staffId, [])

  // Disabled staff render in a collapsed footer section below the active list.
  const disabledFooter = useMemo(() => {
    if (disabledStaff.length === 0) return null
    return (
      <AppSection title={t('roles.disabled_staff', { count: disabledStaff.length })}>
        {disabledStaff.map((s) => (
          <StaffCard key={s.staffId} staff={s} onPress={goToDetail} testID={`staff-card-${s.staffId}`} />
        ))}
      </AppSection>
    )
  }, [disabledStaff, goToDetail, t])

  const header = (
    <AppHeader
      title={t('roles.staff_management')}
      showBack
      onBackPress={() => router.back()}
    />
  )

  // Loading (first load, no cached data yet)
  if (isStaffLoading && staffList.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <StaffListSkeleton />
      </SafeAreaView>
    )
  }

  // Error (no cached data to show)
  if (staffError && staffList.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t(staffError)}
          actionLabel={t('common.retry')}
          onActionPress={() => void fetchStaffList(1)}
        />
      </SafeAreaView>
    )
  }

  // Empty
  if (visibleStaff.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {!isConnected ? <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} /> : null}
        <AppEmptyState
          icon={<Ionicons name="people-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('roles.no_staff')}
          description={t('roles.no_staff_desc')}
          actionLabel={isConnected ? t('roles.invite_staff') : undefined}
          onActionPress={isConnected ? goToInvite : undefined}
        />
      </SafeAreaView>
    )
  }

  // Content (+ Offline banner)
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {!isConnected ? <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} /> : null}
      {permissionsUpdated ? (
        <AppAlert
          type="info"
          title={t('roles.permissions_updated')}
          onClose={() => setPermissionsUpdated(false)}
        />
      ) : null}
      <View style={styles.countRow}>
        <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
          {t('roles.active_count', { active: activeCount })}
        </AppText>
      </View>
      <FlatList
        data={activeStaff}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          activeStaff.length > 0 ? (
            <AppText variant="h4" weight="bold" style={styles.sectionTitle}>
              {t('roles.active_staff')}
            </AppText>
          ) : null
        }
        ListFooterComponent={disabledFooter}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isStaffLoading}
            onRefresh={() => void fetchStaffList(1)}
            tintColor={colors.primary}
          />
        }
      />
      <AppButton
        label={t('roles.invite_staff')}
        onPress={goToInvite}
        variant="primary"
        disabled={!isConnected}
        accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
        style={styles.fab}
        testID="invite-staff-fab"
        leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.white} />}
      />
    </SafeAreaView>
  )
}

export default function StaffListScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffListScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffListScreen.displayName = 'StaffListScreen'
