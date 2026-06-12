/**
 * StaffHomeScreen — Staff-only landing (US-002, wireframe 3.1).
 * Purpose: The limited staff view so delivery staff never see the owner dashboard.
 * Shows a today summary (placeholder until US-006 wires real stats), the staff's
 * assigned supply lists (resolved from the stub-backed supply-list options, OQ-6),
 * and a "financial data visible to owner only" note. Financial sections are
 * owner-only and are simply absent here.
 *
 * 5 states: Loading skeleton, Empty ("no lists assigned — contact owner"), Error
 * (retry), Content, Offline (cached role/lists + banner).
 *
 * RoleGate guards the staff-only content; a non-staff caller (defence-in-depth) is
 * routed away by the role router at /(app)/index.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppStatsCard } from '@components/composite/AppStatsCard'
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { RoleBadge } from '@components/composite/RoleBadge'
import { RoleGate } from '@components/composite/RoleGate'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRolesStore } from '../store/roles.store'
import { useRole } from '../hooks/useRole'
import { useDeliveryToday } from '@modules/delivery/hooks/useDeliveryToday'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { colors, spacing, componentSizes } from '@constants/tokens'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },
  headerRow: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  listCard: { marginBottom: spacing[3] },
  noteRow: { marginTop: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  skeletonCard: { height: 96, marginBottom: spacing[3], backgroundColor: colors.gray100 },
  listsSection: { marginTop: spacing[4] },
  listItemBtn: { marginTop: spacing[2] },
  quickMarkBtn: { marginTop: spacing[5] },
})

function StaffHomeSkeleton() {
  return (
    <View style={styles.scrollContent} testID="staff-home-skeleton">
      {[0, 1, 2].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function StaffHomeScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const { roleContext, isLoading, error } = useRole()
  const vendorName = useAuthStore(useShallow((s) => s.vendorContext?.vendorName ?? null))

  const { assignedListIds, supplyListOptions, fetchRole, fetchSupplyListOptions } = useRolesStore(
    useShallow((s) => ({
      assignedListIds: s.assignedListIds,
      supplyListOptions: s.supplyListOptions,
      fetchRole: s.fetchRole,
      fetchSupplyListOptions: s.fetchSupplyListOptions,
    })),
  )

  // US-006: real today summary (delivered/total) from the delivery store.
  const { delivered, total, refetch: refetchToday } = useDeliveryToday()

  // OQ-7: non-blocking notice when a focus re-fetch detects permission drift.
  const [permissionsUpdated, setPermissionsUpdated] = useState(false)
  const prevPermissions = useRef<string | null>(null)

  useEffect(() => {
    void fetchSupplyListOptions()
  }, [fetchSupplyListOptions])

  useEffect(() => {
    refetchToday()
  }, [refetchToday])

  // OQ-7 + security: re-fetch the role on every focus (catches mid-session staff
  // disable/permission change), snapshotting permissions to detect drift.
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

  // Resolve assigned list IDs to human labels using the cached options.
  const assignedLists = useMemo(() => {
    const byId = new Map(supplyListOptions.map((o) => [o.listId, o.name]))
    return assignedListIds.map((id) => ({ listId: id, name: byId.get(id) ?? id }))
  }, [assignedListIds, supplyListOptions])

  const onOpenList = useCallback(
    (listId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      router.push(`/(app)/deliveries/${listId}` as Href)
    },
    [router],
  )

  const onStartQuickMarking = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/(app)/deliveries/quick-mark' as Href)
  }, [router])

  const header = (
    <AppHeader title={vendorName ?? t('common.app_name')} />
  )

  const badgeRow = roleContext ? (
    <View style={styles.headerRow}>
      <RoleBadge role={roleContext.role} areaLabel={null} testID="staff-home-role-badge" />
    </View>
  ) : null

  // Loading (no cached role yet)
  if (isLoading && !roleContext) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <StaffHomeSkeleton />
      </SafeAreaView>
    )
  }

  // Error (no cached role to fall back to)
  if (error && !roleContext) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t(error)}
          actionLabel={t('common.retry')}
          onActionPress={() => void fetchRole()}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {badgeRow}
      {!isConnected ? (
        <View style={styles.headerRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}
      {permissionsUpdated ? (
        <View style={styles.headerRow}>
          <AppAlert
            type="info"
            title={t('roles.permissions_updated')}
            onClose={() => setPermissionsUpdated(false)}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Today summary — real delivered/total from the delivery store (US-006). */}
        <AppStatsCard
          label={t('roles.today_summary')}
          value={t('roles.today_done', { done: delivered, total })}
          icon="cube-outline"
        />

        <AppSection title={t('roles.your_supply_lists')} containerStyle={styles.listsSection}>
          {assignedLists.length === 0 ? (
            <AppEmptyState
              icon={<Ionicons name="list-outline" size={componentSizes.icon.xxl} color={colors.primary} />}
              title={t('roles.no_lists_assigned')}
              description={t('roles.contact_owner')}
            />
          ) : (
            <>
            <AppButton
              label={t('supply.my_lists_title')}
              onPress={() => router.push('/(app)/my-lists' as Href)}
              variant="primary"
              fullWidth
              style={styles.listItemBtn}
              testID="staff-home-my-lists"
            />
            {assignedLists.map((list) => (
              <AppCard key={list.listId} variant="elevated" style={styles.listCard} testID={`staff-list-${list.listId}`}>
                <AppText variant="h4" weight="semibold">
                  {list.name}
                </AppText>
                <AppButton
                  label={t('delivery.open_list')}
                  onPress={() => onOpenList(list.listId)}
                  variant="secondary"
                  size="sm"
                  style={styles.listItemBtn}
                  testID={`staff-list-open-${list.listId}`}
                />
              </AppCard>
            ))}
            </>
          )}
        </AppSection>

        {/* Footer-anchored primary CTA — start fast swipe marking (US-006).
            Disabled offline (writes are online-only). */}
        {assignedLists.length > 0 ? (
          <AppButton
            label={t('delivery.start_quick_marking')}
            onPress={onStartQuickMarking}
            variant="primary"
            fullWidth
            disabled={!isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            style={styles.quickMarkBtn}
            testID="staff-home-quick-mark"
          />
        ) : null}

        {/* Financial data is owner-only. Staff see the explanatory note instead of
            any financial figures; the gate is defence-in-depth over the route guard. */}
        <RoleGate
          require="owner"
          fallback={
            <View style={styles.noteRow}>
              <Ionicons name="lock-closed-outline" size={componentSizes.icon.sm} color={colors.textSecondary} />
              <AppText variant="caption" color={colors.textSecondary}>
                {t('roles.financial_owner_only')}
              </AppText>
            </View>
          }
        >
          {null}
        </RoleGate>
      </ScrollView>
    </SafeAreaView>
  )
}

export default function StaffHomeScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffHomeScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffHomeScreen.displayName = 'StaffHomeScreen'
