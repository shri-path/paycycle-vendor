/**
 * EnablePrepaidScreen [S4] (US-012, T-15, wireframe 2.36)
 * Purpose: Switch a customer to prepaid mode.
 *
 * Two-outcome handling (discriminated union):
 * - clearOutstandingRequired=true → show "collect ₹X first" CTA → record-payment
 * - clearOutstandingRequired=false → success → navigate back
 * 409 CONFLICT → friendly message (already prepaid)
 *
 * Owner-only: useRequireOwner().
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppText } from '@components/primitives/AppText'
import { AppToggle } from '@components/primitives/AppToggle'
import { AppCard } from '@components/primitives/AppCard'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import type { EnablePrepaidBlockedResult } from '../../../types/credit'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[16] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.background,
    gap: spacing[2],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
  },
  blockedCard: { padding: spacing[4], marginBottom: spacing[3] },
  desc: { marginBottom: spacing[4] },
  bullets: { gap: spacing[2], marginBottom: spacing[4] },
  bullet: { flexDirection: 'row', gap: spacing[2] },
})

function EnablePrepaidContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { customerId } = useLocalSearchParams<{ customerId: string }>()

  const { isMutating, mutationError, enablePrepaid, clearErrors } = useCreditStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      enablePrepaid: s.enablePrepaid,
      clearErrors: s.clearErrors,
    })),
  )

  const [clearOutstandingFirst, setClearOutstandingFirst] = useState(true)
  const [minimumBalanceText, setMinimumBalanceText] = useState('')
  const [minimumBalanceWarning, setMinimumBalanceWarning] = useState<number | undefined>()
  const [message, setMessage] = useState('')
  const [blockedResult, setBlockedResult] = useState<EnablePrepaidBlockedResult | null>(null)

  const busy = useRef(false)

  const handleMinBalanceChange = useCallback((text: string) => {
    setMinimumBalanceText(text)
    const parsed = parseFloat(text)
    setMinimumBalanceWarning(isNaN(parsed) ? undefined : parsed)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!customerId || busy.current || !isConnected) return
    busy.current = true
    clearErrors()
    setBlockedResult(null)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const result = await enablePrepaid(customerId, {
        clearOutstandingFirst,
        minimumBalanceWarning,
        message: message.trim() || undefined,
      })
      if (result.clearOutstandingRequired) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        setBlockedResult(result as EnablePrepaidBlockedResult)
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
      }
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      busy.current = false
    }
  }, [customerId, isConnected, clearErrors, clearOutstandingFirst, minimumBalanceWarning, message, enablePrepaid, router])

  const handleRecordPayment = useCallback(() => {
    if (!customerId) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/(app)/customers/${customerId}/record-payment` as Href)
  }, [customerId, router])

  const writesDisabled = !isConnected || isMutating

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('credit.enable_prepaid_title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {mutationError ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('common.error')} message={t(mutationError)} onClose={clearErrors} />
        </View>
      ) : null}

      {/* Blocked outcome — must collect first */}
      {blockedResult ? (
        <View style={styles.alertRow}>
          <AppCard style={styles.blockedCard}>
            <AppText variant="body" weight="semibold" color={colors.warning} style={{ marginBottom: spacing[2] }}>
              {t('credit.outstanding_required_title')}
            </AppText>
            <AppText variant="body" color={colors.textPrimary} style={{ marginBottom: spacing[3] }}>
              {t('credit.outstanding_required_message', {
                amount: formatCurrency(blockedResult.outstanding),
              })}
            </AppText>
            <AppButton
              label={t('credit.record_payment_cta')}
              variant="primary"
              onPress={handleRecordPayment}
              testID="collect-first-btn"
            />
          </AppCard>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="body" color={colors.textSecondary} style={styles.desc}>
          {t('credit.enable_prepaid_desc')}
        </AppText>

        <View style={styles.bullets}>
          {(['bullet_1', 'bullet_2', 'bullet_3'] as const).map((key) => (
            <View key={key} style={styles.bullet}>
              <AppText variant="body" color={colors.primary}>•</AppText>
              <AppText variant="body" color={colors.textPrimary}>{t(`credit.prepaid_${key}`)}</AppText>
            </View>
          ))}
        </View>

        {/* Require clear outstanding toggle */}
        <View style={styles.toggleRow}>
          <AppText variant="body" color={colors.textPrimary} style={{ flex: 1 }}>
            {t('credit.clear_outstanding_first_label')}
          </AppText>
          <AppToggle
            value={clearOutstandingFirst}
            onChange={setClearOutstandingFirst}
            disabled={writesDisabled}
          />
        </View>

        {/* Min balance warning */}
        <AppInput
          label={t('credit.min_balance_warning_label')}
          placeholder="500"
          value={minimumBalanceText}
          onChangeText={handleMinBalanceChange}
          keyboardType="numeric"
          editable={!writesDisabled}
          testID="min-balance-input"
        />

        {/* Optional message */}
        <AppInput
          label={t('credit.prepaid_message_label')}
          placeholder={t('credit.prepaid_message_placeholder')}
          value={message}
          onChangeText={setMessage}
          editable={!writesDisabled}
          testID="prepaid-message-input"
        />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('credit.enable_prepaid_submit')}
          variant="primary"
          disabled={writesDisabled}
          loading={isMutating}
          onPress={() => void handleSubmit()}
          testID="enable-prepaid-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function EnablePrepaidScreen() {
  return (
    <ScreenErrorBoundary>
      <EnablePrepaidContent />
    </ScreenErrorBoundary>
  )
}

EnablePrepaidScreen.displayName = 'EnablePrepaidScreen'
