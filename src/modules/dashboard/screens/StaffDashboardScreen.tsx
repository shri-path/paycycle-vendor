/**
 * StaffDashboardScreen (US-010, FEATURE_PLAN §2.2)
 * Purpose: Staff's home dashboard — today's progress, assigned lists,
 * pending count, start quick marking CTA, financial-owner-only note.
 *
 * SECURITY: This screen renders ZERO monetary/financial data. The staff DTO
 * (`StaffDashboardDto`) has no monetary fields at the type level.
 *
 * States: Loading skeleton / Error / Offline / Populated / Empty (no deliveries)
 * Auto-refresh: every 30 seconds (FEATURE_PLAN §4.2).
 */

import React, { useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { RoleBadge } from '@components/composite/RoleBadge'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useDashboardStore } from '../store/dashboard.store'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { StaffProgressCard } from '../components'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  skeletonCard: { height: 100, marginBottom: spacing[3], backgroundColor: colors.gray100, borderRadius: 8 },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  alertRow: { paddingHorizontal: spacing[4] },
  headerRow: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  todayCard: { padding: spacing[4], marginBottom: spacing[3] },
  todayTitle: { marginBottom: spacing[2] },
  progressNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  numCol: { alignItems: 'center', gap: spacing[1] },
  pctRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -spacing[2] },
  pendingRow: { marginBottom: spacing[3] },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
    padding: spacing[3],
  },
  quickMarkBtn: { marginBottom: spacing[3] },
})

function StaffDashboardSkeleton() {
  return (
    <View style={styles.content} testID="staff-dashboard-skeleton">
      {[0, 1, 2].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}><View /></AppCard>
      ))}
    </View>
  )
}

function StaffDashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const { roleContext } = useRole()
  const vendorName = useAuthStore(useShallow((s) => s.vendorContext?.vendorName ?? null))

  const {
    staffDashboard,
    isStaffLoading,
    staffError,
    fetchStaffDashboard,
    clearErrors,
  } = useDashboardStore(
    useShallow((s) => ({
      staffDashboard: s.staffDashboard,
      isStaffLoading: s.isStaffLoading,
      staffError: s.staffError,
      fetchStaffDashboard: s.fetchStaffDashboard,
      clearErrors: s.clearErrors,
    })),
  )

  const refresh = useCallback(() => {
    void fetchStaffDashboard()
  }, [fetchStaffDashboard])

  useFocusEffect(
    useCallback(() => {
      void fetchStaffDashboard()
      return () => clearErrors()
    }, [fetchStaffDashboard, clearErrors]),
  )

  // Auto-refresh every 30 seconds for staff (FEATURE_PLAN §4.2)
  useAutoRefresh(refresh, 30_000)

  const handleListPress = useCallback((listId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/(app)/deliveries/${listId}` as Href)
  }, [router])

  const handleStartQuickMarking = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/deliveries/quick-mark' as Href)
  }, [router])

  const header = <AppHeader title={vendorName ?? t('common.app_name')} />

  const badgeRow = roleContext ? (
    <View style={styles.headerRow}>
      <RoleBadge role={roleContext.role} areaLabel={null} testID="staff-dashboard-role-badge" />
    </View>
  ) : null

  // Loading (no cached data)
  if (isStaffLoading && !staffDashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {badgeRow}
        <StaffDashboardSkeleton />
      </SafeAreaView>
    )
  }

  // Error (no cached data)
  if (staffError && !staffDashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {badgeRow}
        <View style={styles.centeredState}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('dashboard.error_load_staff')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchStaffDashboard()}
          />
        </View>
      </SafeAreaView>
    )
  }

  const data = staffDashboard

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {badgeRow}

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {staffError && staffDashboard ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(staffError)} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isStaffLoading}
            onRefresh={() => { void refresh() }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Today's Progress Card */}
        {data ? (
          <AppCard style={styles.todayCard} testID="today-progress-card">
            <AppText variant="caption" color={colors.textSecondary} style={styles.todayTitle}>
              {t('dashboard.todays_lists').toUpperCase()} — {data.date}
            </AppText>
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {t('dashboard.your_deliveries')}
            </AppText>
            <View style={styles.progressNumbers}>
              <View style={styles.numCol}>
                <AppText variant="h2" weight="bold" color={colors.textPrimary}>
                  {data.todayProgress.total}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>{t('dashboard.total')}</AppText>
              </View>
              <View style={styles.numCol}>
                <AppText variant="h2" weight="bold" color={colors.success}>
                  {data.todayProgress.completed}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>{t('dashboard.completed')}</AppText>
              </View>
            </View>
            <AppProgressBar
              value={data.todayProgress.percentage}
              max={100}
              variant={data.todayProgress.percentage >= 100 ? 'success' : 'default'}
              animated
            />
            <View style={styles.pctRow}>
              <AppText variant="caption" color={colors.textSecondary}>
                {data.todayProgress.percentage}%
              </AppText>
            </View>
          </AppCard>
        ) : null}

        {/* Assigned Lists */}
        {data ? (
          <AppSection title={t('supply.my_lists_title')}>
            {data.assignedLists.length === 0 ? (
              <AppEmptyState
                icon={<Ionicons name="checkmark-done-circle-outline" size={componentSizes.icon.xxl} color={colors.success} />}
                title={t('dashboard.all_done')}
                description={t('dashboard.no_lists_today')}
              />
            ) : (
              data.assignedLists.map((list) => (
                <StaffProgressCard
                  key={list.id}
                  list={list}
                  onPress={() => handleListPress(list.id)}
                />
              ))
            )}
          </AppSection>
        ) : null}

        {/* Pending count */}
        {data && data.pendingCount > 0 ? (
          <AppText variant="body" color={colors.textSecondary} style={styles.pendingRow}>
            {t('dashboard.pending_count', { count: data.pendingCount })}
          </AppText>
        ) : null}

        {/* START QUICK MARKING */}
        <AppButton
          label={t('dashboard.start_quick_marking')}
          onPress={handleStartQuickMarking}
          variant="primary"
          fullWidth
          disabled={!isConnected}
          accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
          style={styles.quickMarkBtn}
          testID="start-quick-marking-btn"
        />

        {/* Financial data is owner-only note */}
        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={componentSizes.icon.sm} color={colors.textSecondary} />
          <AppText variant="caption" color={colors.textSecondary}>
            {t('dashboard.financial_owner_only')}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default function StaffDashboardScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffDashboardContent />
    </ScreenErrorBoundary>
  )
}

StaffDashboardScreen.displayName = 'StaffDashboardScreen'
