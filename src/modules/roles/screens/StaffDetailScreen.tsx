/**
 * StaffDetailScreen — Owner-only (US-002, wireframe 2.15).
 * Purpose: View + manage one staff member — profile, assigned supply lists (full
 * OQ-6 assign/unassign), month stats (placeholder until US-006), area-label inline
 * edit, permission edit, temporarily disable/enable, and remove (with confirms).
 *
 * Reads `staffId` from the route params (so the WS-3 route file is a thin wrapper).
 * 5 states: Loading skeleton, Error (404 → "no longer exists"), Content, Offline
 * (all mutations disabled). Owner-self actions are never rendered.
 *
 * Security mutations (update/remove/assign/unassign) are online-only.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppCard } from '@components/primitives/AppCard'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppLoader } from '@components/primitives/AppLoader'
import { AppSection } from '@components/composite/AppSection'
import { AppBottomSheet } from '@components/composite/AppBottomSheet'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { RoleBadge } from '@components/composite/RoleBadge'
import { PermissionToggleList } from '../components/PermissionToggleList'
import { SupplyListMultiSelect } from '../components/SupplyListMultiSelect'
import { useRolesStore } from '../store/roles.store'
import { useRequireOwner } from '../hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { LIMITS, validateAreaLabel, sanitizeText } from '@utils/validation'
import type { PermissionKey, StaffResponseDto, SupplyListOptionDto } from '../../../types/roles'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { marginVertical: spacing[3], alignItems: 'center', gap: spacing[1] },
  profileMeta: { alignItems: 'center', gap: spacing[1], marginTop: spacing[2] },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  actions: { gap: spacing[2], marginTop: spacing[4] },
  saveBtn: { marginTop: spacing[2] },
})

function StaffDetailSkeleton() {
  return (
    <View style={styles.center} testID="staff-detail-skeleton">
      <AppLoader />
    </View>
  )
}

function StaffDetailScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ staffId: string }>()
  const staffId = params.staffId

  const {
    staffDetail,
    isStaffLoading,
    staffError,
    fetchStaffDetail,
    updateStaff,
    removeStaff,
    assignLists,
    unassignList,
    supplyListOptions,
    isSupplyListsLoading,
    fetchSupplyListOptions,
    clearStaffError,
  } = useRolesStore(
    useShallow((s) => ({
      staffDetail: s.staffDetail,
      isStaffLoading: s.isStaffLoading,
      staffError: s.staffError,
      fetchStaffDetail: s.fetchStaffDetail,
      updateStaff: s.updateStaff,
      removeStaff: s.removeStaff,
      assignLists: s.assignLists,
      unassignList: s.unassignList,
      supplyListOptions: s.supplyListOptions,
      isSupplyListsLoading: s.isSupplyListsLoading,
      fetchSupplyListOptions: s.fetchSupplyListOptions,
      clearStaffError: s.clearStaffError,
    })),
  )

  const staff: StaffResponseDto | undefined = staffId ? staffDetail[staffId] : undefined

  // Editable local copies (seeded from server data when it loads).
  const [permissions, setPermissions] = useState<PermissionKey[]>([])
  const [areaLabel, setAreaLabel] = useState('')
  const [areaError, setAreaError] = useState<string | null>(null)

  const [assignSheetOpen, setAssignSheetOpen] = useState(false)
  const [pendingAssign, setPendingAssign] = useState<string[]>([])
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [unassignTarget, setUnassignTarget] = useState<string | null>(null)

  const busy = useRef(false)

  useEffect(() => {
    if (staffId) void fetchStaffDetail(staffId)
  }, [staffId, fetchStaffDetail])

  // Seed editable fields whenever the server record changes.
  useEffect(() => {
    if (staff) {
      setPermissions(staff.permissions)
      setAreaLabel(staff.areaRouteLabel ?? '')
    }
  }, [staff])

  const isOwnerRow = staff?.role === 'owner'

  const mutate = useCallback(
    async (fn: () => Promise<void>, onDone?: () => void) => {
      if (busy.current || !isConnected) return
      busy.current = true
      clearStaffError()
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      try {
        await fn()
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        onDone?.()
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } finally {
        busy.current = false
      }
    },
    [isConnected, clearStaffError],
  )

  const handleSavePermissions = useCallback(() => {
    if (!staffId) return
    void mutate(() => updateStaff(staffId, { permissions }))
  }, [staffId, permissions, mutate, updateStaff])

  const handleSaveArea = useCallback(() => {
    if (!staffId) return
    const err = validateAreaLabel(areaLabel)
    setAreaError(err)
    if (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    void mutate(() => updateStaff(staffId, { areaRouteLabel: areaLabel.trim() || null }))
  }, [staffId, areaLabel, mutate, updateStaff])

  const handleToggleStatus = useCallback(() => {
    if (!staffId || !staff) return
    const next = staff.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
    if (next === 'DISABLED') {
      setConfirmDisable(true)
      return
    }
    void mutate(() => updateStaff(staffId, { status: 'ACTIVE' }))
  }, [staffId, staff, mutate, updateStaff])

  const confirmDisableNow = useCallback(() => {
    setConfirmDisable(false)
    if (!staffId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    void mutate(() => updateStaff(staffId, { status: 'DISABLED' }))
  }, [staffId, mutate, updateStaff])

  const confirmRemoveNow = useCallback(() => {
    setConfirmRemove(false)
    if (!staffId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    void mutate(
      () => removeStaff(staffId),
      () => router.back(),
    )
  }, [staffId, mutate, removeStaff, router])

  const openAssignSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setPendingAssign(staff?.assignedListIds ?? [])
    setAssignSheetOpen(true)
    void fetchSupplyListOptions()
  }, [staff, fetchSupplyListOptions])

  const handleSaveAssignments = useCallback(() => {
    if (!staffId) return
    void mutate(
      () => assignLists(staffId, pendingAssign),
      () => setAssignSheetOpen(false),
    )
  }, [staffId, pendingAssign, mutate, assignLists])

  const confirmUnassignNow = useCallback(() => {
    const listId = unassignTarget
    setUnassignTarget(null)
    if (!staffId || !listId) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    void mutate(() => unassignList(staffId, listId))
  }, [staffId, unassignTarget, mutate, unassignList])

  // Resolve assigned list ids → names via the (stub-backed) options, OQ-6.
  const assignedListNames = useMemo(() => {
    if (!staff) return [] as { listId: string; name: string }[]
    return staff.assignedListIds.map((listId) => {
      const opt = supplyListOptions.find((o: SupplyListOptionDto) => o.listId === listId)
      return { listId, name: opt?.name ?? listId }
    })
  }, [staff, supplyListOptions])

  const header = (
    <AppHeader
      title={t('roles.staff_detail_title', { name: staff?.name ?? '' })}
      showBack
      onBackPress={() => router.back()}
    />
  )

  // Loading (no cached record yet)
  if (isStaffLoading && !staff) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <StaffDetailSkeleton />
      </SafeAreaView>
    )
  }

  // Error / 404 — staff removed elsewhere or load failed
  if (!staff) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <View style={styles.center}>
          <AppText variant="h3" weight="bold">
            {t('roles.error_staff_not_found')}
          </AppText>
          <AppButton label={t('common.retry')} variant="link" onPress={() => staffId && void fetchStaffDetail(staffId)} />
          <AppButton label={t('common.close')} variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    )
  }

  const mutationsDisabled = !isConnected || isOwnerRow

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        ) : null}
        {staffError ? (
          <AppAlert type="error" title={t('common.error')} message={t(staffError)} />
        ) : null}

        {/* Profile */}
        <AppCard variant="elevated" style={styles.profileCard}>
          <AppAvatar initials={(staff.name ?? staff.phone ?? '?').slice(0, 2)} size="lg" />
          <AppText variant="h3" weight="bold">
            {staff.name ?? '—'}
          </AppText>
          {staff.phone ? (
            <AppText variant="body" color={colors.textSecondary}>
              {staff.phone}
            </AppText>
          ) : null}
          <View style={styles.profileMeta}>
            <RoleBadge role={staff.role} areaLabel={staff.areaRouteLabel} testID="detail-role-badge" />
            {staff.joinedAt ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {t('roles.joined_on', { date: staff.joinedAt })}
              </AppText>
            ) : null}
          </View>
        </AppCard>

        {/* Assigned Supply Lists (OQ-6) */}
        <AppSection title={t('roles.assigned_lists')}>
          {assignedListNames.length === 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {t('roles.no_lists_assigned')}
            </AppText>
          ) : (
            assignedListNames.map(({ listId, name }) => (
              <View key={listId} style={styles.listRow}>
                <AppText variant="body" numberOfLines={1}>
                  {name}
                </AppText>
                <AppButton
                  label={t('roles.unassign')}
                  variant="link"
                  onPress={() => setUnassignTarget(listId)}
                  disabled={mutationsDisabled}
                  testID={`unassign-${listId}`}
                />
              </View>
            ))
          )}
          {!isOwnerRow ? (
            <AppButton
              label={t('roles.assign_another')}
              variant="secondary"
              onPress={openAssignSheet}
              disabled={mutationsDisabled}
              testID="assign-another"
              leftIcon={<Ionicons name="add" size={componentSizes.icon.md} color={colors.primary} />}
            />
          ) : null}
        </AppSection>

        {/* Month stats (placeholder until US-006) */}
        <AppSection title={t('roles.month_stats')}>
          <AppCard variant="default">
            <View style={styles.statRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('roles.days_active')}</AppText>
              <AppText variant="body" weight="semibold">—</AppText>
            </View>
            <View style={styles.statRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('roles.deliveries')}</AppText>
              <AppText variant="body" weight="semibold">—</AppText>
            </View>
            <View style={styles.statRow}>
              <AppText variant="body" color={colors.textSecondary}>{t('roles.avg_per_day')}</AppText>
              <AppText variant="body" weight="semibold">—</AppText>
            </View>
          </AppCard>
        </AppSection>

        {/* Area / route label inline edit */}
        {!isOwnerRow ? (
          <AppSection title={t('roles.area_label')}>
            <AppInput
              value={areaLabel}
              onChangeText={(v) => {
                const clean = sanitizeText(v)
                setAreaLabel(clean)
                setAreaError(validateAreaLabel(clean))
              }}
              placeholder={t('roles.area_label_placeholder')}
              maxLength={LIMITS.areaLabel}
              editable={!mutationsDisabled}
              testID="detail-area"
              error={areaError ? t(areaError) : undefined}
            />
            <AppButton
              label={t('roles.edit_label')}
              variant="secondary"
              onPress={handleSaveArea}
              disabled={mutationsDisabled}
              style={styles.saveBtn}
              testID="detail-save-area"
            />
          </AppSection>
        ) : null}

        {/* Permissions */}
        {!isOwnerRow ? (
          <AppSection title={t('roles.permissions')}>
            <PermissionToggleList
              value={permissions}
              onChange={setPermissions}
              editable={!mutationsDisabled}
              testID="detail-perms"
            />
            <AppButton
              label={t('roles.save_changes')}
              variant="primary"
              onPress={handleSavePermissions}
              disabled={mutationsDisabled}
              style={styles.saveBtn}
              testID="detail-save-perms"
            />
          </AppSection>
        ) : null}

        {/* Destructive actions */}
        {!isOwnerRow ? (
          <View style={styles.actions}>
            <AppButton
              label={staff.status === 'DISABLED' ? t('roles.enable_staff') : t('roles.temporarily_disable')}
              variant="secondary"
              onPress={handleToggleStatus}
              disabled={mutationsDisabled}
              testID="detail-toggle-status"
            />
            <AppButton
              label={t('roles.remove_staff')}
              variant="danger"
              onPress={() => setConfirmRemove(true)}
              disabled={mutationsDisabled}
              testID="detail-remove"
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Assign-lists bottom sheet (OQ-6) */}
      <AppBottomSheet
        visible={assignSheetOpen}
        onDismiss={() => setAssignSheetOpen(false)}
        title={t('roles.select_lists')}
      >
        <SupplyListMultiSelect
          options={supplyListOptions}
          value={pendingAssign}
          onChange={setPendingAssign}
          isLoading={isSupplyListsLoading}
          testID="assign-sheet-lists"
        />
        <AppButton
          label={t('roles.save_assignments')}
          variant="primary"
          fullWidth
          onPress={handleSaveAssignments}
          disabled={mutationsDisabled}
          style={styles.saveBtn}
          testID="assign-sheet-save"
        />
      </AppBottomSheet>

      <AppConfirmDialog
        visible={confirmDisable}
        title={t('roles.disable_confirm_title')}
        description={t('roles.disable_confirm_body', { name: staff.name ?? '' })}
        confirmLabel={t('roles.temporarily_disable')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={confirmDisableNow}
        onCancel={() => setConfirmDisable(false)}
      />

      <AppConfirmDialog
        visible={confirmRemove}
        title={t('roles.remove_confirm_title')}
        description={t('roles.remove_confirm_body', { name: staff.name ?? '' })}
        confirmLabel={t('roles.remove_staff')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={confirmRemoveNow}
        onCancel={() => setConfirmRemove(false)}
      />

      <AppConfirmDialog
        visible={unassignTarget !== null}
        title={t('roles.unassign_confirm_title')}
        description={t('roles.unassign_confirm_body', { name: staff.name ?? '' })}
        confirmLabel={t('roles.unassign')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={confirmUnassignNow}
        onCancel={() => setUnassignTarget(null)}
      />
    </SafeAreaView>
  )
}

export default function StaffDetailScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffDetailScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffDetailScreen.displayName = 'StaffDetailScreen'
