/**
 * StaffDetailScreen — Owner-only (US-002, wireframe 2.15).
 * Purpose: View + manage one staff member — profile, assigned supply lists
 * (READ-ONLY; assignment is managed from the supply-list detail screen per
 * US-005 OQ-2), month stats (placeholder until US-006), area-label inline edit,
 * permission edit, resend invite (US-004), temporarily disable/enable, and remove
 * (with confirms).
 *
 * Reads `staffId` from the route params (so the WS-3 route file is a thin wrapper).
 * 5 states: Loading skeleton, Error (404 → "no longer exists"), Content, Offline
 * (all mutations disabled). Owner-self actions are never rendered.
 *
 * Security mutations (update/remove/permissions/resend) are online-only.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
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
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { AppConfirmDialog } from '@components/composite/AppConfirmDialog'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { RoleBadge } from '@components/composite/RoleBadge'
import { PermissionToggleList, InviteShareSheet } from '../components'
import { useRolesStore } from '../store/roles.store'
import { useRequireOwner } from '../hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { LIMITS, validateAreaLabel, validateStaffName, sanitizeText } from '@utils/validation'
import { formatLocaleDate } from '@utils/formatDate'
import { ALL_PERMISSION_KEYS } from '../../../types/roles'
import type {
  PermissionKey,
  StaffResponseDto,
  SupplyListOptionDto,
  InviteSendVia,
  ResendInviteResponseDto,
} from '../../../types/roles'

const SEND_VIA: InviteSendVia[] = ['whatsapp', 'sms']

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
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
  skeletonProfile: { height: 120, marginVertical: spacing[3], backgroundColor: colors.gray100 },
  skeletonSection: { height: 80, marginBottom: spacing[3], backgroundColor: colors.gray100 },
  skeletonStats: { height: 100, marginBottom: spacing[3], backgroundColor: colors.gray100 },
})

// Shape-matching skeleton (NOT a spinner): mirrors the populated layout — a profile
// card, the assigned-lists section, and the month-stats card — like StaffListSkeleton.
function StaffDetailSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="staff-detail-skeleton">
      <AppCard variant="flat" style={styles.skeletonProfile}>
        <View />
      </AppCard>
      <AppCard variant="flat" style={styles.skeletonSection}>
        <View />
      </AppCard>
      <AppCard variant="flat" style={styles.skeletonStats}>
        <View />
      </AppCard>
    </ScrollView>
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
    fetchRole,
    fetchStaffDetail,
    updateStaff,
    updatePermissions,
    resendInvite,
    removeStaff,
    supplyListOptions,
    fetchSupplyListOptions,
    clearStaffError,
  } = useRolesStore(
    useShallow((s) => ({
      staffDetail: s.staffDetail,
      isStaffLoading: s.isStaffLoading,
      staffError: s.staffError,
      fetchRole: s.fetchRole,
      fetchStaffDetail: s.fetchStaffDetail,
      updateStaff: s.updateStaff,
      updatePermissions: s.updatePermissions,
      resendInvite: s.resendInvite,
      removeStaff: s.removeStaff,
      supplyListOptions: s.supplyListOptions,
      fetchSupplyListOptions: s.fetchSupplyListOptions,
      clearStaffError: s.clearStaffError,
    })),
  )

  const staff: StaffResponseDto | undefined = staffId ? staffDetail[staffId] : undefined

  // Editable local copies (seeded from server data when it loads).
  const [permissions, setPermissions] = useState<PermissionKey[]>([])
  const [areaLabel, setAreaLabel] = useState('')
  const [areaError, setAreaError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  // Resend invite (US-004) — channel + the freshly-issued link surfaced via the sheet.
  const [resendViaIndex, setResendViaIndex] = useState(0)
  const [resendResult, setResendResult] = useState<ResendInviteResponseDto | null>(null)

  const busy = useRef(false)

  useEffect(() => {
    if (staffId) void fetchStaffDetail(staffId)
  }, [staffId, fetchStaffDetail])

  // Load supply-list options to resolve assigned list ids → names for the
  // read-only assigned-lists section (assignment itself lives in US-005's
  // supply-list detail screen, OQ-2).
  useEffect(() => {
    void fetchSupplyListOptions()
  }, [fetchSupplyListOptions])

  // OQ-7: re-fetch the role every time the screen regains focus so a mid-session
  // owner demotion is caught (the 401/403 interceptor handles in-flight calls;
  // this catches the case where the owner returns to this screen).
  useFocusEffect(useCallback(() => { void fetchRole() }, [fetchRole]))

  // Seed editable fields whenever the server record changes.
  useEffect(() => {
    if (staff) {
      setPermissions(staff.permissions)
      setAreaLabel(staff.areaRouteLabel ?? '')
      setName(staff.name ?? '')
    }
  }, [staff])

  const isOwnerRow = staff?.role === 'owner'

  const mutate = useCallback(
    async (fn: () => Promise<void>, onDone?: () => void, onError?: () => void) => {
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
        onError?.()
      } finally {
        busy.current = false
      }
    },
    [isConnected, clearStaffError],
  )

  const handleSavePermissions = useCallback(() => {
    if (!staffId) return
    // US-004: hit the dedicated /permissions endpoint with the FULL 3-key grant map
    // (every key stated ⇒ MERGE is deterministic). The store seeds toggles from the
    // returned server state.
    const grants = ALL_PERMISSION_KEYS.map((key) => ({
      key,
      granted: permissions.includes(key),
    }))
    void mutate(() => updatePermissions(staffId, grants))
  }, [staffId, permissions, mutate, updatePermissions])

  const handleSaveName = useCallback(() => {
    if (!staffId) return
    const err = validateStaffName(name)
    setNameError(err)
    if (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    void mutate(() => updateStaff(staffId, { name: name.trim() }))
  }, [staffId, name, mutate, updateStaff])

  const handleResend = useCallback(() => {
    if (!staffId) return
    void mutate(
      async () => {
        // Surface the freshly-issued invite link via the share sheet on success.
        const result = await resendInvite(staffId, SEND_VIA[resendViaIndex])
        setResendResult(result)
      },
      undefined,
      // 422 race: the member may have joined between list load and this tap.
      // Re-fetch detail so the resend section disappears if no longer INVITED.
      () => void fetchStaffDetail(staffId),
    )
  }, [staffId, mutate, resendInvite, resendViaIndex, fetchStaffDetail])

  const handleResendViaChange = useCallback((i: number) => setResendViaIndex(i), [])

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

  // Resolve assigned list ids → names via the (stub-backed) options for the
  // read-only display. Assignment is managed elsewhere (US-005 OQ-2).
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
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('roles.error_staff_not_found')}
          actionLabel={t('common.retry')}
          onActionPress={() => staffId && void fetchStaffDetail(staffId)}
        />
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
                {t('roles.joined_on', { date: formatLocaleDate(staff.joinedAt) })}
              </AppText>
            ) : null}
          </View>
        </AppCard>

        {/* Assigned Supply Lists — READ-ONLY (US-005 OQ-2: assignment is managed
            from the supply-list detail screen, the single source of truth). */}
        <AppSection title={t('roles.assigned_lists')}>
          {assignedListNames.length === 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {t('roles.no_lists_assigned')}
            </AppText>
          ) : (
            assignedListNames.map(({ listId, name }) => (
              <View key={listId} style={styles.listRow}>
                <AppText variant="body" numberOfLines={1} testID={`assigned-list-${listId}`}>
                  {name}
                </AppText>
              </View>
            ))
          )}
          <AppText variant="caption" color={colors.textSecondary}>
            {t('roles.assign_lists_managed_elsewhere')}
          </AppText>
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

        {/* Resend invite — pending (INVITED) staff only (US-004) */}
        {!isOwnerRow && staff.status === 'INVITED' ? (
          <AppSection title={t('roles.resend_invite_section')}>
            <AppSegmentedControl
              segments={[t('roles.send_whatsapp'), t('roles.send_sms')]}
              selectedIndex={resendViaIndex}
              onChange={handleResendViaChange}
            />
            <AppButton
              label={t('roles.resend_invite')}
              variant="secondary"
              onPress={handleResend}
              disabled={mutationsDisabled}
              accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
              style={styles.saveBtn}
              testID="detail-resend-invite"
              leftIcon={<Ionicons name="paper-plane-outline" size={componentSizes.icon.md} color={colors.primary} />}
            />
          </AppSection>
        ) : null}

        {/* Inline name edit (US-004) */}
        {!isOwnerRow ? (
          <AppSection title={t('roles.staff_name')}>
            <AppInput
              value={name}
              onChangeText={(v) => {
                const clean = sanitizeText(v)
                setName(clean)
                setNameError(validateStaffName(clean))
              }}
              placeholder={t('roles.staff_name_placeholder')}
              maxLength={LIMITS.name}
              editable={!mutationsDisabled}
              testID="detail-name"
              error={nameError ? t(nameError) : undefined}
            />
            <AppButton
              label={t('roles.save_name')}
              variant="secondary"
              onPress={handleSaveName}
              disabled={mutationsDisabled}
              style={styles.saveBtn}
              testID="detail-save-name"
            />
          </AppSection>
        ) : null}

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

      {/* Resend invite share sheet (US-004) — opens with the fresh invite link */}
      <InviteShareSheet
        visible={resendResult !== null}
        inviteUrl={resendResult?.inviteUrl ?? null}
        expiresAt={resendResult?.expiresAt ?? null}
        onDismiss={() => setResendResult(null)}
        title={t('roles.resend_invite_sent')}
        testID="resend-share-sheet"
      />

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
