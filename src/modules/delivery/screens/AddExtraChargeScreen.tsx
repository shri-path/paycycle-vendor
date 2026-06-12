/**
 * AddExtraChargeScreen — /(app)/deliveries/add-extra-charge (US-006, WS-3).
 * Owner + staff with `add_extra_charges`. Pick the list, then the customer (radio,
 * sourced from that list's loaded deliveries), enter a non-zero amount (number-pad,
 * forgiving parse) and a required comment, with ReasonChips quick-select. Resolves
 * the `dailySupplyId` from the loaded delivery for that customer; if none exists,
 * blocks with `delivery.error_mark_delivery_first` (never calls the API). Today date
 * is read-only (locale). 5 states; submit disabled offline.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppInput } from '@components/primitives/AppInput'
import { AppTextArea } from '@components/primitives/AppTextArea'
import { AppButton } from '@components/primitives/AppButton'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { ReasonChips } from '../components/ReasonChips'
import { useDeliveryStore } from '../store/delivery.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { useRolesStore } from '@modules/roles/store/roles.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatLocaleDate } from '@utils/formatDate'
import {
  validateAmount,
  validateComment,
  parseAmount,
  sanitizeText,
  LIMITS,
} from '@utils/validation'
import { colors, spacing } from '@constants/tokens'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[3] },
  banner: { marginBottom: spacing[2] },
  dateRow: { marginBottom: spacing[1] },
  chipsLabel: { marginBottom: spacing[1] },
  skeletonWrap: { padding: spacing[4] },
  skeletonRow: {
    height: 72,
    borderRadius: spacing[2],
    backgroundColor: colors.gray100,
    marginBottom: spacing[3],
  },
})

function CustomerListSkeleton() {
  return (
    <View style={styles.skeletonWrap} testID="add-charge-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  )
}

function AddExtraChargeScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ listId?: string; customerId?: string }>()
  const { isConnected } = useNetworkStatus()
  const { isOwner, hasPermission } = useRole()
  const canAdd = isOwner || hasPermission('add_extra_charges')

  const supplyListOptions = useRolesStore(useShallow((s) => s.supplyListOptions))
  const {
    listDeliveries,
    isListLoading,
    isMutating,
    mutationError,
    addExtraCharge,
    fetchListDeliveries,
    clearError,
  } = useDeliveryStore(
    useShallow((s) => ({
      listDeliveries: s.listDeliveries,
      isListLoading: s.isListLoading,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      addExtraCharge: s.addExtraCharge,
      fetchListDeliveries: s.fetchListDeliveries,
      clearError: s.clearError,
    })),
  )

  const [listId, setListId] = useState<string>(params.listId ?? '')
  const [customerId, setCustomerId] = useState<string>(params.customerId ?? '')
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [amountTouched, setAmountTouched] = useState(false)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentTouched, setCommentTouched] = useState(false)

  useEffect(() => {
    if (listId && !listDeliveries[listId]) void fetchListDeliveries(listId)
  }, [listId, listDeliveries, fetchListDeliveries])

  const listSelectOptions = useMemo(
    () => supplyListOptions.map((o) => ({ label: o.name, value: o.listId })),
    [supplyListOptions],
  )

  const customerOptions = useMemo(() => {
    const rows = listDeliveries[listId] ?? []
    return rows.map((d) => ({ label: d.customer.name ?? t('common.you'), value: d.customer.id }))
  }, [listDeliveries, listId, t])

  // Resolve the dailySupplyId (delivery id) for the chosen customer on the chosen list.
  const resolvedDailySupplyId = useMemo(() => {
    const rows = listDeliveries[listId] ?? []
    return rows.find((d) => d.customer.id === customerId)?.id ?? null
  }, [listDeliveries, listId, customerId])

  const reasonChips = useMemo(
    () => [
      t('delivery.reason_extra_milk'),
      t('delivery.reason_festival'),
      t('delivery.reason_weekend'),
      t('delivery.reason_urgent'),
    ],
    [t],
  )

  const onChangeAmount = useCallback(
    (raw: string) => {
      setAmount(raw)
      if (amountTouched) setAmountError(validateAmount(raw))
    },
    [amountTouched],
  )

  const onChangeComment = useCallback(
    (raw: string) => {
      const v = sanitizeText(raw)
      setComment(v)
      if (commentTouched) setCommentError(validateComment(v))
    },
    [commentTouched],
  )

  const noDeliveryForCustomer = Boolean(listId && customerId && !resolvedDailySupplyId)

  const isValid =
    canAdd &&
    isConnected &&
    Boolean(listId) &&
    Boolean(customerId) &&
    !noDeliveryForCustomer &&
    validateAmount(amount) === null &&
    validateComment(comment) === null

  const onSubmit = useCallback(async () => {
    const aErr = validateAmount(amount)
    const cErr = validateComment(comment)
    setAmountTouched(true)
    setCommentTouched(true)
    setAmountError(aErr)
    setCommentError(cErr)
    if (aErr || cErr || !resolvedDailySupplyId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await addExtraCharge({
        dailySupplyId: resolvedDailySupplyId,
        amount: parseAmount(amount),
        comment: comment.trim(),
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [amount, comment, resolvedDailySupplyId, addExtraCharge, router])

  const header = (
    <AppHeader title={t('delivery.title_extra_charge')} showBack onBackPress={() => router.back()} />
  )

  // Loading — a list is chosen but its deliveries (customer roster) are still loading.
  if (listId && isListLoading && !listDeliveries[listId]?.length) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <CustomerListSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isConnected ? (
            <AppAlert
              type="warning"
              title={t('common.offline')}
              message={t('common.needs_connection')}
              containerStyle={styles.banner}
            />
          ) : null}
          {!canAdd ? (
            <AppAlert type="info" title={t('delivery.view_only')} containerStyle={styles.banner} />
          ) : null}
          {mutationError ? (
            <AppAlert type="error" title={t(mutationError)} onClose={clearError} containerStyle={styles.banner} />
          ) : null}

          <AppText variant="caption" color={colors.textSecondary} style={styles.dateRow}>
            {formatLocaleDate(new Date().toISOString())}
          </AppText>

          <AppRadioGroup
            label={t('delivery.select_lists')}
            options={listSelectOptions}
            value={listId}
            onChange={(v) => {
              setListId(String(v))
              setCustomerId('')
            }}
          />

          {listId ? (
            <AppRadioGroup
              label={t('delivery.select_customer')}
              options={customerOptions}
              value={customerId}
              onChange={(v) => setCustomerId(String(v))}
            />
          ) : null}

          {noDeliveryForCustomer ? (
            <AppAlert type="warning" title={t('delivery.error_mark_delivery_first')} />
          ) : null}

          <AppInput
            label={t('delivery.amount_label')}
            value={amount}
            onChangeText={onChangeAmount}
            onBlur={() => {
              setAmountTouched(true)
              setAmountError(validateAmount(amount))
            }}
            error={amountError ? t(amountError) : undefined}
            keyboardType="number-pad"
            prefix={t('common.currency_symbol')}
            maxLength={LIMITS.amount}
            testID="amount-input"
          />

          <View>
            <AppText variant="caption" color={colors.textSecondary} style={styles.chipsLabel}>
              {t('delivery.reason_label')}
            </AppText>
            <ReasonChips reasons={reasonChips} selected={comment} onSelect={onChangeComment} testID="reason-chips" />
          </View>

          <AppTextArea
            label={t('delivery.comment_label')}
            value={comment}
            onChangeText={onChangeComment}
            onBlur={() => {
              setCommentTouched(true)
              setCommentError(validateComment(comment))
            }}
            error={commentError ? t(commentError) : undefined}
            maxLength={LIMITS.comment}
          />

          <AppButton
            label={t('delivery.add_charge')}
            variant="primary"
            fullWidth
            disabled={!isValid || isMutating}
            loading={isMutating}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            onPress={onSubmit}
            testID="add-charge-btn"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function AddExtraChargeScreen() {
  return (
    <ScreenErrorBoundary>
      <AddExtraChargeScreenContent />
    </ScreenErrorBoundary>
  )
}

AddExtraChargeScreen.displayName = 'AddExtraChargeScreen'
