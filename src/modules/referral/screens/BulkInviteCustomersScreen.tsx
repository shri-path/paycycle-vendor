/**
 * BulkInviteCustomersScreen (US-014)
 * Owner-only. Sends WhatsApp invites to customers not yet on PayCycle.
 * Customer counts derived from customers store (fall back to server skipped tallies).
 * totalSent:0 is a success (not an error).
 * Write-protected when offline.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useReferralStore } from '../store/referral.store'
import { CustomerStatusSummary, SmartInviteSettings } from '../components'
import type { BulkInviteTargetType, InviteLanguage, BulkInviteResultDto } from '../../../types/referral'

// Lazy-require customers store to avoid circular deps
function getCustomerCounts(): { total: number; onPaycycle: number; notOnPaycycle: number } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCustomersStore } = require('@modules/customers/store/customers.store') as {
      useCustomersStore: { getState: () => { customers?: { onPaycycle?: boolean }[] } }
    }
    const customers = useCustomersStore.getState().customers ?? []
    const onPaycycle = customers.filter((c) => c.onPaycycle === true).length
    return { total: customers.length, onPaycycle, notOnPaycycle: customers.length - onPaycycle }
  } catch {
    return { total: 0, onPaycycle: 0, notOnPaycycle: 0 }
  }
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  section: { marginBottom: spacing[2] },
  submit: { marginTop: spacing[2] },
  resultCard: { padding: spacing[4], backgroundColor: colors.gray50, borderRadius: 10, marginBottom: spacing[3] },
})

function BulkInviteContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const [target, setTarget] = useState<BulkInviteTargetType>('all_not_on_paycycle')
  const [language, setLanguage] = useState<InviteLanguage>('hi')
  const [result, setResult] = useState<BulkInviteResultDto | null>(null)

  const { isMutating, mutationError, sendBulkInvite, clearErrors } = useReferralStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      sendBulkInvite: s.sendBulkInvite,
      clearErrors: s.clearErrors,
    })),
  )

  useEffect(() => () => clearErrors(), [clearErrors])

  const counts = getCustomerCounts()

  const handleSend = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    try {
      const res = await sendBulkInvite({ targetType: target, messageLanguage: language })
      setResult(res)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [target, language, sendBulkInvite])

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <AppHeader title={t('referral.invite.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_writes_disabled')} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={s.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <CustomerStatusSummary
          total={counts.total}
          onPaycycle={counts.onPaycycle}
          notOnPaycycle={counts.notOnPaycycle}
        />

        <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.section}>
          {t('referral.invite.settings_title')}
        </AppText>

        <SmartInviteSettings
          target={target}
          language={language}
          onTargetChange={setTarget}
          onLanguageChange={setLanguage}
        />

        {result ? (
          <View style={s.resultCard} testID="bulk-invite-result">
            <AppText variant="body" weight="semibold" color={colors.success}>
              {t('referral.invite.result_sent', { count: result.totalSent })}
            </AppText>
            {result.skippedAlreadyOnPaycycle > 0 ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {t('referral.invite.result_skipped', { count: result.skippedAlreadyOnPaycycle })}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <AppButton
          label={t('referral.invite.send_button')}
          variant="primary"
          onPress={() => void handleSend()}
          loading={isMutating}
          disabled={!isConnected || isMutating || !!result}
          style={s.submit}
          testID="send-invites-btn"
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default function BulkInviteCustomersScreen() {
  return (
    <ScreenErrorBoundary>
      <BulkInviteContent />
    </ScreenErrorBoundary>
  )
}

BulkInviteCustomersScreen.displayName = 'BulkInviteCustomersScreen'
