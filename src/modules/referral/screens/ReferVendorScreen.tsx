/**
 * ReferVendorScreen (US-014)
 * Owner-only screen to create a vendor-to-vendor referral.
 *
 * States: idle → submitting → success (shows code + WhatsApp CTA) | error
 * Disabled when offline (write guard).
 * Code card shows placeholder until the first successful create.
 */

import React, { useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppInput } from '@components/primitives/AppInput'
import { AppButton } from '@components/primitives/AppButton'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useReferralStore } from '../store/referral.store'
import {
  BenefitsCard,
  ReferralCodeCard,
  ReferralMessagePreview,
  ShareViaWhatsAppButton,
} from '../components'

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  input: { marginBottom: spacing[3] },
  submit: { marginBottom: spacing[4] },
})

function ReferVendorContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const [phone, setPhone] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { isMutating, lastReferral, createVendorReferral } = useReferralStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      lastReferral: s.lastReferral,
      createVendorReferral: s.createVendorReferral,
    })),
  )

  const handleSubmit = useCallback(async () => {
    if (!phone.trim()) return
    setSubmitError(null)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await createVendorReferral({ phoneNumber: phone.trim(), vendorName: vendorName.trim() || undefined })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setSubmitError(t('referral.error.generic'))
    }
  }, [phone, vendorName, createVendorReferral, t])

  const e164Phone = lastReferral
    ? (() => {
        const digits = lastReferral.referralCode ? phone.replace(/\D/g, '') : ''
        return digits.startsWith('91') ? digits : `91${digits}`
      })()
    : ''

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <AppHeader title={t('referral.refer.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_writes_disabled')} />
        </View>
      ) : null}

      {submitError ? (
        <View style={s.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={submitError} onClose={() => setSubmitError(null)} />
        </View>
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <BenefitsCard />

        <AppInput
          label={t('referral.refer.phone_label')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('referral.refer.phone_placeholder')}
          style={s.input}
          testID="referral-phone-input"
        />

        <AppInput
          label={t('referral.refer.vendor_name_label')}
          value={vendorName}
          onChangeText={setVendorName}
          placeholder={t('referral.refer.vendor_name_placeholder')}
          style={s.input}
          testID="referral-vendor-name-input"
        />

        <AppButton
          label={t('referral.refer.submit')}
          variant="primary"
          onPress={() => void handleSubmit()}
          loading={isMutating}
          disabled={!phone.trim() || isMutating || !isConnected}
          style={s.submit}
          testID="submit-referral-btn"
        />

        <ReferralCodeCard
          code={lastReferral?.referralCode ?? null}
          referralLink={lastReferral?.referralLink ?? null}
        />

        {lastReferral ? (
          <>
            <ReferralMessagePreview message={lastReferral.message} />
            <ShareViaWhatsAppButton
              phone={e164Phone}
              message={lastReferral.message}
              disabled={!e164Phone || !isConnected}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function ReferVendorScreen() {
  return (
    <ScreenErrorBoundary>
      <ReferVendorContent />
    </ScreenErrorBoundary>
  )
}

ReferVendorScreen.displayName = 'ReferVendorScreen'
