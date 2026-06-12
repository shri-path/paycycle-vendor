/**
 * InviteStaffScreen — Owner-only (US-002, wireframe 2.14).
 * Purpose: Invite a delivery staff member — phone (required), optional name/area,
 * permission toggles, and a WhatsApp/SMS send channel. On success shows a bottom
 * sheet with the shareable invite link (paycyclevendor://join/<token> scheme,
 * embedded by the backend). List assignment is NOT offered at invite time — an
 * invited staff has no lists yet; assignment is managed from the supply-list
 * detail screen (US-005 OQ-2).
 *
 * 5 states: Loading, Error (inline field errors + API banner), Content,
 * Offline (submit disabled).
 *
 * OQ-5: 451 maps to a generic "staff limit reached" alert (no in-app upgrade).
 * Security mutation: online-only — submit is disabled offline.
 */

import React, { useCallback, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native'
import { ScrollView } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppPhoneInput } from '@components/primitives/AppPhoneInput'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppSection } from '@components/composite/AppSection'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { LimitReachedModal } from '@modules/subscription/components'
import { useLimitReached } from '@modules/subscription/hooks/useLimitReached'
import { PermissionToggleList, InviteShareSheet } from '../components'
import { useRolesStore } from '../store/roles.store'
import { useRequireOwner } from '../hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { LIMITS, validatePhone, validateStaffName, validateAreaLabel, sanitizeText } from '@utils/validation'
import type { PermissionKey, InviteStaffResult, InviteSendVia } from '../../../types/roles'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
})

const SEND_VIA: InviteSendVia[] = ['whatsapp', 'sms']
const DEFAULT_PERMISSIONS: PermissionKey[] = ['mark_deliveries', 'mark_leaves']

function InviteStaffScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    inviteStaff,
    staffError,
    isStaffLoading,
    clearStaffError,
  } = useRolesStore(
    useShallow((s) => ({
      inviteStaff: s.inviteStaff,
      staffError: s.staffError,
      isStaffLoading: s.isStaffLoading,
      clearStaffError: s.clearStaffError,
    })),
  )

  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [areaLabel, setAreaLabel] = useState('')
  const [permissions, setPermissions] = useState<PermissionKey[]>(DEFAULT_PERMISSIONS)
  const [sendViaIndex, setSendViaIndex] = useState(0)

  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [areaError, setAreaError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const [result, setResult] = useState<InviteStaffResult | null>(null)
  const limitReached = useLimitReached()

  const submitting = useRef(false)

  const onChangePhone = (code: string, number: string) => {
    setCountryCode(code)
    setPhone(number)
    if (touched) setPhoneError(validatePhone(number))
  }

  const onChangeName = (value: string) => {
    const clean = sanitizeText(value)
    setName(clean)
    if (touched) setNameError(validateStaffName(clean))
  }

  const onChangeArea = (value: string) => {
    const clean = sanitizeText(value)
    setAreaLabel(clean)
    if (touched) setAreaError(validateAreaLabel(clean))
  }

  const validateForm = (): boolean => {
    const pErr = validatePhone(phone)
    const nErr = validateStaffName(name)
    const aErr = validateAreaLabel(areaLabel)
    setPhoneError(pErr)
    setNameError(nErr)
    setAreaError(aErr)
    setTouched(true)
    return !pErr && !nErr && !aErr
  }

  const handleSubmit = async () => {
    if (submitting.current || isStaffLoading) return
    submitting.current = true
    clearStaffError()

    if (!validateForm()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      submitting.current = false
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const res = await inviteStaff({
        phone: `${countryCode}${phone}`,
        name: name.trim() || undefined,
        areaRouteLabel: areaLabel.trim() || undefined,
        permissions,
        sendVia: SEND_VIA[sendViaIndex],
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setResult(res)
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (limitReached.show(err, 'staff')) {
        // 451 — limit modal surfaced; nothing else to do
      }
    } finally {
      submitting.current = false
    }
  }

  // On dismiss return to Staff List, which refetches on focus/mount.
  const handleSheetDismiss = useCallback(() => {
    setResult(null)
    router.back()
  }, [router])

  // 451 staff-limit gets a dedicated generic alert (OQ-5); other API errors → banner.
  const isLimitError = staffError === 'roles.error_staff_limit'

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('roles.invite_staff')} showBack onBackPress={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isConnected ? (
            <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
          ) : null}

          {staffError && !isLimitError ? (
            <AppAlert type="error" title={t('common.error')} message={t(staffError)} />
          ) : null}
          {isLimitError ? (
            <AppAlert type="warning" title={t('roles.error_staff_limit')} />
          ) : null}

          <AppPhoneInput
            label={t('roles.staff_phone')}
            countryCode={countryCode}
            phone={phone}
            onChange={onChangePhone}
            onBlur={() => {
              setTouched(true)
              setPhoneError(validatePhone(phone))
            }}
            maxLength={LIMITS.phone}
            testID="invite-phone"
            error={phoneError ? t(phoneError) : undefined}
          />

          <AppInput
            label={t('roles.staff_name')}
            value={name}
            onChangeText={onChangeName}
            onBlur={() => {
              setTouched(true)
              setNameError(validateStaffName(name))
            }}
            placeholder={t('roles.staff_name_placeholder')}
            maxLength={LIMITS.name}
            testID="invite-name"
            error={nameError ? t(nameError) : undefined}
          />

          <AppInput
            label={t('roles.area_label')}
            value={areaLabel}
            onChangeText={onChangeArea}
            onBlur={() => {
              setTouched(true)
              setAreaError(validateAreaLabel(areaLabel))
            }}
            placeholder={t('roles.area_label_placeholder')}
            maxLength={LIMITS.areaLabel}
            testID="invite-area"
            error={areaError ? t(areaError) : undefined}
          />

          <AppSection title={t('roles.permissions')}>
            <PermissionToggleList
              value={permissions}
              onChange={setPermissions}
              editable
              testID="invite-perms"
            />
          </AppSection>

          <AppSection title={t('roles.send_via')}>
            <AppSegmentedControl
              segments={[t('roles.send_whatsapp'), t('roles.send_sms')]}
              selectedIndex={sendViaIndex}
              onChange={(i) => setSendViaIndex(i)}
            />
          </AppSection>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('roles.send_invite')}
            onPress={handleSubmit}
            variant="primary"
            fullWidth
            loading={isStaffLoading}
            disabled={isStaffLoading || !isConnected}
            testID="invite-submit"
          />
        </View>
      </KeyboardAvoidingView>

      <InviteShareSheet
        visible={result !== null}
        inviteUrl={result?.inviteUrl ?? null}
        expiresAt={result?.expiresAt ?? null}
        onDismiss={handleSheetDismiss}
      />

      <LimitReachedModal
        visible={limitReached.state.visible}
        resource={limitReached.state.resource}
        current={limitReached.state.current}
        max={limitReached.state.max}
        onUpgrade={limitReached.goUpgrade}
        onClose={limitReached.close}
      />
    </SafeAreaView>
  )
}

export default function InviteStaffScreen() {
  return (
    <ScreenErrorBoundary>
      <InviteStaffScreenContent />
    </ScreenErrorBoundary>
  )
}

InviteStaffScreen.displayName = 'InviteStaffScreen'
