/**
 * MarkLeaveScreen — /(app)/deliveries/mark-leave (US-006, WS-3).
 * Owner + staff with `mark_leaves`. Progressive disclosure: pick a customer (radio,
 * from the caller's accessible lists' deliveries), then the supply lists (multi-
 * select checkboxes, pre-checked), then date mode (Today only / Date range) with
 * pickers when range. Smart defaults: "Today only" + all the customer's lists
 * pre-checked. Validation: customer + ≥1 list + end≥start, inline errors, selection
 * preserved. 5 states; submit disabled offline.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useDeliveryStore } from '../store/delivery.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { useRolesStore } from '@modules/roles/store/roles.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[3] },
  banner: { marginBottom: spacing[2] },
  sectionLabel: { marginBottom: spacing[1] },
  errorText: { marginTop: spacing[1] },
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
    <View style={styles.skeletonWrap} testID="mark-leave-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  )
}

function MarkLeaveScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const { isOwner, hasPermission } = useRole()
  const canMarkLeave = isOwner || hasPermission('mark_leaves')

  const supplyListOptions = useRolesStore(useShallow((s) => s.supplyListOptions))
  const {
    listDeliveries,
    isListLoading,
    isMutating,
    mutationError,
    createLeave,
    fetchListDeliveries,
    clearError,
  } = useDeliveryStore(
    useShallow((s) => ({
      listDeliveries: s.listDeliveries,
      isListLoading: s.isListLoading,
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      createLeave: s.createLeave,
      fetchListDeliveries: s.fetchListDeliveries,
      clearError: s.clearError,
    })),
  )

  // Load deliveries for each accessible list so we can build the customer roster.
  useEffect(() => {
    supplyListOptions.forEach((o) => {
      if (!listDeliveries[o.listId]) void fetchListDeliveries(o.listId)
    })
  }, [supplyListOptions, listDeliveries, fetchListDeliveries])

  // Map: customerId → { name, listIds[] } across all accessible lists.
  const customerMap = useMemo(() => {
    const map = new Map<string, { name: string | null; listIds: string[] }>()
    for (const opt of supplyListOptions) {
      const rows = listDeliveries[opt.listId] ?? []
      for (const d of rows) {
        const existing = map.get(d.customer.id)
        if (existing) {
          if (!existing.listIds.includes(opt.listId)) existing.listIds.push(opt.listId)
        } else {
          map.set(d.customer.id, { name: d.customer.name, listIds: [opt.listId] })
        }
      }
    }
    return map
  }, [supplyListOptions, listDeliveries])

  const [customerId, setCustomerId] = useState('')
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [dateMode, setDateMode] = useState(0) // 0 = today only, 1 = range
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  const listNameById = useMemo(() => {
    const m = new Map<string, string>()
    supplyListOptions.forEach((o) => m.set(o.listId, o.name))
    return m
  }, [supplyListOptions])

  const customerOptions = useMemo(
    () =>
      Array.from(customerMap.entries()).map(([id, info]) => ({
        label: info.name ?? t('common.you'),
        value: id,
        description: t('delivery.in_lists', { count: info.listIds.length }),
      })),
    [customerMap, t],
  )

  const customerListIds = customerId ? (customerMap.get(customerId)?.listIds ?? []) : []

  const onSelectCustomer = useCallback(
    (value: string | number) => {
      const id = String(value)
      setCustomerId(id)
      // Smart default: pre-check all of this customer's accessible lists.
      setSelectedListIds(customerMap.get(id)?.listIds ?? [])
      setError(null)
    },
    [customerMap],
  )

  const toggleList = useCallback((listId: string, checked: boolean) => {
    setSelectedListIds((prev) =>
      checked ? [...new Set([...prev, listId])] : prev.filter((l) => l !== listId),
    )
  }, [])

  const validate = useCallback((): string | null => {
    if (!customerId) return 'validation.required'
    if (selectedListIds.length === 0) return 'validation.required'
    if (dateMode === 1 && toISODate(endDate) < toISODate(startDate)) return 'validation.invalid_input'
    return null
  }, [customerId, selectedListIds, dateMode, startDate, endDate])

  const isValid = canMarkLeave && isConnected && validate() === null

  const onSubmit = useCallback(async () => {
    const err = validate()
    setError(err)
    if (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    const start = dateMode === 0 ? toISODate(new Date()) : toISODate(startDate)
    const end = dateMode === 0 ? start : toISODate(endDate)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await createLeave({ customerId, supplyListIds: selectedListIds, startDate: start, endDate: end })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [validate, dateMode, startDate, endDate, createLeave, customerId, selectedListIds, router])

  const header = (
    <AppHeader title={t('delivery.title_mark_leave')} showBack onBackPress={() => router.back()} />
  )

  // Loading — building the customer roster from the accessible lists' deliveries.
  if (isListLoading && customerOptions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <CustomerListSkeleton />
      </SafeAreaView>
    )
  }

  // Empty — no customers in accessible lists.
  if (customerOptions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="people-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('delivery.empty_customers')}
        />
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
          {!canMarkLeave ? (
            <AppAlert type="info" title={t('delivery.view_only')} containerStyle={styles.banner} />
          ) : null}
          {mutationError ? (
            <AppAlert type="error" title={t(mutationError)} onClose={clearError} containerStyle={styles.banner} />
          ) : null}

          <AppRadioGroup
            label={t('delivery.select_customer')}
            options={customerOptions}
            value={customerId}
            onChange={onSelectCustomer}
          />

          {customerId ? (
            <View>
              <AppText variant="label" weight="semibold" style={styles.sectionLabel}>
                {t('delivery.select_lists')}
              </AppText>
              {customerListIds.map((listId) => (
                <AppCheckbox
                  key={listId}
                  label={listNameById.get(listId) ?? listId}
                  checked={selectedListIds.includes(listId)}
                  onChange={(checked) => toggleList(listId, checked)}
                />
              ))}
            </View>
          ) : null}

          {customerId ? (
            <AppSegmentedControl
              segments={[t('delivery.date_today_only'), t('delivery.date_range')]}
              selectedIndex={dateMode}
              onChange={(index) => setDateMode(index)}
            />
          ) : null}

          {customerId && dateMode === 1 ? (
            <View>
              <AppDatePicker
                label={t('delivery.start_date')}
                value={startDate}
                onChange={setStartDate}
                mode="date"
              />
              <AppDatePicker
                label={t('delivery.end_date')}
                value={endDate}
                onChange={setEndDate}
                mode="date"
                minimumDate={startDate}
              />
            </View>
          ) : null}

          {error ? (
            <AppText variant="caption" color={colors.error} style={styles.errorText}>
              {t(error)}
            </AppText>
          ) : null}

          <AppButton
            label={t('delivery.confirm_leave')}
            variant="primary"
            fullWidth
            disabled={!isValid || isMutating}
            loading={isMutating}
            accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
            onPress={onSubmit}
            testID="confirm-leave-btn"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default function MarkLeaveScreen() {
  return (
    <ScreenErrorBoundary>
      <MarkLeaveScreenContent />
    </ScreenErrorBoundary>
  )
}

MarkLeaveScreen.displayName = 'MarkLeaveScreen'
