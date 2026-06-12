/**
 * AddSubscriptionScreen — Owner-only (US-008, FEATURE_PLAN §3.5).
 * Purpose: Add a customer to another supply list. Shows only lists the customer
 * is NOT already subscribed to (filtered client-side). Optional start date,
 * custom quantity, and custom rate per unit. 409 → "already subscribed" error.
 * Online-only; success → appends subscription to cached detail and navigates back.
 *
 * 5 states: Content | Offline banner | Error banner |
 * Submitting (button spinner) | Validation errors.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, View, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppButton } from '@components/primitives/AppButton'
import { AppInput } from '@components/primitives/AppInput'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppAlert } from '@components/primitives/AppAlert'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useCustomersStore } from '../store/customers.store'
import { useSupplyListsStore } from '@modules/supply-lists/store/supplyLists.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import type { AddSubscriptionInput } from '../../../types/customer'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  errorText: { marginTop: spacing[1] },
})

function AddSubscriptionScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ customerId: string }>()
  const customerId = params.customerId

  const { detail, fetchCustomer, addSubscription, isMutating, mutationError, clearError } =
    useCustomersStore(
      useShallow((s) => ({
        detail: s.detail,
        fetchCustomer: s.fetchCustomer,
        addSubscription: s.addSubscription,
        isMutating: s.isMutating,
        mutationError: s.mutationError,
        clearError: s.clearError,
      })),
    )

  const { lists, fetchLists } = useSupplyListsStore(
    useShallow((s) => ({
      lists: s.lists,
      fetchLists: s.fetchLists,
    })),
  )

  const customer = customerId ? detail[customerId] : undefined

  // Fetch customer and supply lists if not yet cached.
  useEffect(() => {
    if (customerId && !customer) void fetchCustomer(customerId)
    void fetchLists()
    return () => clearError()
  }, [customerId, customer, fetchCustomer, fetchLists, clearError])

  // Supply lists the customer is NOT already subscribed to.
  const availableListOptions = useMemo(() => {
    const subscribedIds = new Set((customer?.subscriptions ?? []).map((s) => s.listId))
    return lists
      .filter((l) => !subscribedIds.has(l.id))
      .map((l) => ({ label: l.name, value: l.id }))
  }, [lists, customer])

  const [supplyListId, setSupplyListId] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [customQty, setCustomQty] = useState('')
  const [customRate, setCustomRate] = useState('')
  const [listError, setListError] = useState<string | null>(null)

  const submitting = useRef(false)

  const handleSubmit = useCallback(async () => {
    if (submitting.current || isMutating || !customerId) return

    if (!supplyListId) {
      setListError('validation.required')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    submitting.current = true
    clearError()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const input: AddSubscriptionInput = {
      supplyListId,
      ...(startDate ? { startDate: startDate.toISOString().slice(0, 10) } : {}),
      ...(customQty.trim() ? { customQuantity: Number(customQty) } : {}),
      ...(customRate.trim() ? { customRatePerUnit: Number(customRate) } : {}),
    }

    try {
      await addSubscription(customerId, input)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      submitting.current = false
    }
  }, [isMutating, customerId, supplyListId, startDate, customQty, customRate, clearError, addSubscription, router])

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('customer.add_subscription')}
        showBack
        onBackPress={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isConnected ? (
            <AppAlert
              type="warning"
              title={t('common.offline')}
              message={t('common.offline_message')}
            />
          ) : null}

          {mutationError ? (
            <AppAlert
              type="error"
              title={t('common.error')}
              message={t(mutationError)}
              onClose={clearError}
            />
          ) : null}

          {/* AppSelect has no testID prop — wrap in View */}
          <View testID="sub-list-select">
            <AppSelect
              label={t('customer.form_supply_lists')}
              options={availableListOptions}
              value={supplyListId}
              onChange={(v) => {
                setSupplyListId(String(v))
                setListError(null)
              }}
              placeholder={t('customer.form_supply_lists')}
              error={listError ? t(listError) : undefined}
            />
          </View>

          {/* AppDatePicker has no testID prop — wrap in View */}
          <View testID="sub-start-date">
            <AppDatePicker
              label={t('customer.form_start_date')}
              value={startDate}
              onChange={(d) => setStartDate(d)}
              mode="date"
              placeholder={t('customer.form_start_date')}
            />
          </View>

          <AppInput
            label={t('customer.custom_quantity')}
            value={customQty}
            onChangeText={setCustomQty}
            keyboardType="numeric"
            placeholder={t('customer.custom_quantity')}
            testID="sub-custom-qty"
          />

          <AppInput
            label={t('customer.custom_rate')}
            value={customRate}
            onChangeText={setCustomRate}
            keyboardType="numeric"
            prefix="₹"
            placeholder={t('customer.custom_rate')}
            testID="sub-custom-rate"
          />
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={t('customer.add_subscription')}
            onPress={() => void handleSubmit()}
            variant="primary"
            fullWidth
            loading={isMutating}
            disabled={isMutating || !isConnected}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            testID="sub-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function AddSubscriptionScreen() {
  return (
    <ScreenErrorBoundary>
      <AddSubscriptionScreenContent />
    </ScreenErrorBoundary>
  )
}

AddSubscriptionScreen.displayName = 'AddSubscriptionScreen'
