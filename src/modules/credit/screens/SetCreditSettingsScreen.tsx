/**
 * SetCreditSettingsScreen [S3] (US-012, T-14, wireframe 2.35)
 * Purpose: PATCH credit type, limit, warning threshold, breach action.
 *
 * Business rules enforced:
 * - warningThreshold integer 0–100 (client-side)
 * - creditType='unlimited' → force actionOnBreach='warn', disable field
 * - minimumBalanceWarning shown only when type='prepaid'
 * - warning='limit_below_outstanding' → inline non-blocking warning
 * - deliveriesPaused=true → info banner
 * - On success: invalidate customer detail (via store's lazy-require)
 *
 * 5 states: inline spinner on submit, offline disable, error banner.
 * Owner-only: useRequireOwner().
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppText } from '@components/primitives/AppText'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import {
  CreditTypeRadioGroup,
  SuggestedLimitChips,
  WarningThresholdField,
  BreachActionRadioGroup,
} from '../components'
import type { CreditType, ActionOnBreach } from '../../../types/credit'

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
  },
  sectionTitle: { marginTop: spacing[4], marginBottom: spacing[2] },
  prepaidToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
})

function SetCreditSettingsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { customerId } = useLocalSearchParams<{ customerId: string }>()

  const { isMutating, mutationError, updateCreditSettings, clearErrors } = useCreditStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      updateCreditSettings: s.updateCreditSettings,
      clearErrors: s.clearErrors,
    })),
  )

  const [creditType, setCreditType] = useState<CreditType>('normal')
  const [creditLimit, setCreditLimit] = useState<number | undefined>(undefined)
  const [creditLimitText, setCreditLimitText] = useState('')
  const [warningThreshold, setWarningThreshold] = useState<number | undefined>(80)
  const [actionOnBreach, setActionOnBreach] = useState<ActionOnBreach>('warn')
  const [minimumBalanceWarning, setMinimumBalanceWarning] = useState<number | undefined>(undefined)
  const [minimumBalanceText, setMinimumBalanceText] = useState('')
  const [thresholdError, setThresholdError] = useState<string | undefined>()
  const [warningBanner, setWarningBanner] = useState<string | null>(null)
  const [pausedBanner, setPausedBanner] = useState(false)
  // Track whether we have already initiated navigation after a post-save dismiss.
  // Both banners share this guard so router.back() fires only once regardless of
  // which banner the user closes first.
  const navigatingRef = useRef(false)

  const dismissPostSave = useCallback(() => {
    if (navigatingRef.current) return
    navigatingRef.current = true
    setWarningBanner(null)
    setPausedBanner(false)
    router.back()
  }, [router])

  const busy = useRef(false)

  const handleCreditLimitChange = useCallback((text: string) => {
    setCreditLimitText(text)
    const parsed = parseFloat(text)
    setCreditLimit(isNaN(parsed) ? undefined : parsed)
  }, [])

  const handleMinBalanceChange = useCallback((text: string) => {
    setMinimumBalanceText(text)
    const parsed = parseFloat(text)
    setMinimumBalanceWarning(isNaN(parsed) ? undefined : parsed)
  }, [])

  const validate = useCallback((): boolean => {
    if (warningThreshold !== undefined && (warningThreshold < 0 || warningThreshold > 100)) {
      setThresholdError(t('credit.error_threshold_range'))
      return false
    }
    setThresholdError(undefined)
    return true
  }, [warningThreshold, t])

  const handleSave = useCallback(async () => {
    if (!customerId || busy.current || !isConnected) return
    if (!validate()) return
    busy.current = true
    navigatingRef.current = false
    clearErrors()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const patch: Parameters<typeof updateCreditSettings>[1] = {}
    patch.creditType = creditType
    if (creditLimit !== undefined) patch.creditLimit = creditLimit
    if (warningThreshold !== undefined) patch.warningThreshold = warningThreshold
    patch.actionOnBreach = creditType === 'unlimited' ? 'warn' : actionOnBreach
    if (creditType === 'prepaid' && minimumBalanceWarning !== undefined) {
      patch.minimumBalanceWarning = minimumBalanceWarning
    }

    try {
      const result = await updateCreditSettings(customerId, patch)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const hasWarning = result.warning === 'limit_below_outstanding'
      const hasPaused = result.deliveriesPaused === true
      if (hasWarning) {
        setWarningBanner(t('credit.warning_limit_below_outstanding'))
      }
      if (hasPaused) {
        setPausedBanner(true)
      }
      // No banners to show → navigate immediately (the common success path)
      if (!hasWarning && !hasPaused) {
        router.back()
      }
      // Otherwise, dismissPostSave() will be called when the user closes whichever
      // banner they see first; the navigatingRef guard prevents a second back().
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      busy.current = false
    }
  }, [
    customerId,
    isConnected,
    validate,
    clearErrors,
    creditType,
    creditLimit,
    warningThreshold,
    actionOnBreach,
    minimumBalanceWarning,
    updateCreditSettings,
    dismissPostSave,
    router,
    t,
  ])

  const writesDisabled = !isConnected || isMutating

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('credit.credit_settings_title')} showBack onBackPress={() => router.back()} />

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

      {warningBanner ? (
        <View style={styles.alertRow}>
          <AppAlert
            type="warning"
            title={t('common.warning')}
            message={warningBanner}
            onClose={dismissPostSave}
          />
        </View>
      ) : null}

      {pausedBanner ? (
        <View style={styles.alertRow}>
          <AppAlert
            type="info"
            title={t('credit.deliveries_paused_title')}
            message={t('credit.deliveries_paused_message')}
            onClose={dismissPostSave}
          />
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CreditTypeRadioGroup
          value={creditType}
          onChange={setCreditType}
          disabled={writesDisabled}
        />

        {creditType !== 'unlimited' ? (
          <>
            <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
              {t('credit.credit_limit_label')}
            </AppText>
            <SuggestedLimitChips
              selectedLimit={creditLimit}
              onSelect={(limit) => {
                setCreditLimit(limit)
                setCreditLimitText(String(limit))
              }}
              disabled={writesDisabled}
            />
            <AppInput
              label={t('credit.credit_limit_custom_label')}
              placeholder="0"
              value={creditLimitText}
              onChangeText={handleCreditLimitChange}
              keyboardType="numeric"
              editable={!writesDisabled}
              testID="credit-limit-input"
            />
          </>
        ) : null}

        <WarningThresholdField
          value={warningThreshold}
          onChange={setWarningThreshold}
          error={thresholdError}
          disabled={writesDisabled}
        />

        <BreachActionRadioGroup
          value={actionOnBreach}
          onChange={setActionOnBreach}
          creditType={creditType}
          disabled={writesDisabled}
        />

        {creditType === 'prepaid' ? (
          <>
            <View style={styles.prepaidToggleRow}>
              <AppText variant="body" color={colors.textPrimary}>
                {t('credit.min_balance_warning_label')}
              </AppText>
            </View>
            <AppInput
              label={t('credit.min_balance_amount_label')}
              placeholder="0"
              value={minimumBalanceText}
              onChangeText={handleMinBalanceChange}
              keyboardType="numeric"
              editable={!writesDisabled}
              testID="min-balance-input"
            />
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('common.save')}
          variant="primary"
          disabled={writesDisabled}
          loading={isMutating}
          onPress={() => void handleSave()}
          testID="save-credit-settings-btn"
        />
      </View>
    </SafeAreaView>
  )
}

export default function SetCreditSettingsScreen() {
  return (
    <ScreenErrorBoundary>
      <SetCreditSettingsContent />
    </ScreenErrorBoundary>
  )
}

SetCreditSettingsScreen.displayName = 'SetCreditSettingsScreen'
