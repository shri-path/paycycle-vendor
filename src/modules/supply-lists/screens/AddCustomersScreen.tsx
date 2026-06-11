/**
 * AddCustomersScreen — Owner-only (US-005, WS-3 / OQ-6).
 * Purpose: Add one or more of the vendor's customers to a supply list as subscriptions.
 * Sources candidates from `GET .../available-customers` (paginated, server search by
 * name/phone). A sticky footer collects: quantity (default | custom), rate (default |
 * custom) with progressive-disclosure custom inputs, an optional start date, and a primary
 * "ADD N CUSTOMERS" action (disabled when nothing is selected or offline — writes are
 * online-only, OQ-3). On success it surfaces the added/skipped summary (R5) and returns to
 * detail; 409 (all already subscribed) is shown inline keeping the selection.
 *
 * Reads `listId` from the route params. Empty available → an INFORMATIVE empty state that
 * points to Customer Management (US-008), never a dead end. 5 states throughout.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, FlatList, Pressable, StyleSheet, Platform } from 'react-native'
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
import { AppAlert } from '@components/primitives/AppAlert'
import { AppCheckbox } from '@components/primitives/AppCheckbox'
import { AppRadioGroup } from '@components/primitives/AppRadioGroup'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppSearchBar } from '@components/composite/AppSearchBar'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useSupplyListsStore } from '../store/supplyLists.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { maskPhone } from '@utils/formatters'
import { colors, spacing, componentSizes, interaction } from '@constants/tokens'
import type { AddCustomersInput, AvailableCustomerDto } from '../../../types/supplyLists'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  search: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2] },
  defaultsCaption: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  row: {
    minHeight: interaction.minTouchTarget,
    paddingVertical: spacing[2],
    justifyContent: 'center',
  },
  rowSub: { marginStart: spacing[8] },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  customInput: { marginBottom: spacing[2] },
  skeletonRow: { height: 60, marginBottom: spacing[2], backgroundColor: colors.gray100 },
})

function AvailableRow({
  customer,
  checked,
  onToggle,
}: {
  customer: AvailableCustomerDto
  checked: boolean
  onToggle: (id: string) => void
}) {
  const { t } = useTranslation()
  const name = customer.name ?? t('supply.unnamed_customer')
  const otherLists =
    customer.otherListsCount > 0
      ? customer.otherLists.length > 0
        ? customer.otherLists.join(', ')
        : null
      : null
  return (
    <Pressable
      style={styles.row}
      onPress={() => onToggle(customer.customerId)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={name}
      testID={`available-${customer.customerId}`}
    >
      <AppCheckbox label={name} checked={checked} />
      <View style={styles.rowSub}>
        {customer.phone ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {maskPhone(customer.phone)}
          </AppText>
        ) : null}
        {otherLists ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {t('supply.in_lists', { names: otherLists })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  )
}

function AddCustomersScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const params = useLocalSearchParams<{ listId: string }>()
  const listId = params.listId

  const {
    detail,
    available,
    availableMeta,
    isAvailableLoading,
    availableError,
    fetchDetail,
    fetchAvailable,
    addCustomers,
    clearError,
  } = useSupplyListsStore(
    useShallow((s) => ({
      detail: s.detail,
      available: s.available,
      availableMeta: s.availableMeta,
      isAvailableLoading: s.isAvailableLoading,
      availableError: s.availableError,
      fetchDetail: s.fetchDetail,
      fetchAvailable: s.fetchAvailable,
      addCustomers: s.addCustomers,
      clearError: s.clearError,
    })),
  )

  const list = listId ? detail[listId] : undefined

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [useDefaultQty, setUseDefaultQty] = useState(true)
  const [customQty, setCustomQty] = useState('')
  const [useDefaultRate, setUseDefaultRate] = useState(true)
  const [customRate, setCustomRate] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [summary, setSummary] = useState<{ added: number; skipped: number } | null>(null)

  const busy = useRef(false)

  useEffect(() => {
    if (listId) {
      if (!list) void fetchDetail(listId)
    }
  }, [listId, list, fetchDetail])

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(handle)
  }, [search])

  useEffect(() => {
    if (listId) void fetchAvailable(listId, { search: debouncedSearch || undefined, page: 1 })
  }, [listId, debouncedSearch, fetchAvailable])

  const toggle = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  const onEndReached = useCallback(() => {
    if (!listId || isAvailableLoading || !availableMeta) return
    if (availableMeta.page >= availableMeta.totalPages) return
    void fetchAvailable(listId, {
      search: debouncedSearch || undefined,
      page: availableMeta.page + 1,
    })
  }, [listId, isAvailableLoading, availableMeta, fetchAvailable, debouncedSearch])

  const writesDisabled = !isConnected || selected.length === 0

  const handleAdd = useCallback(() => {
    if (!listId || busy.current || !isConnected || selected.length === 0) return
    // Validate custom inputs (progressive disclosure mirrors the backend refinement).
    const qty = Number(customQty)
    const rate = Number(customRate)
    if (!useDefaultQty && (!Number.isFinite(qty) || qty < 0)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    if (!useDefaultRate && (!Number.isFinite(rate) || rate < 0)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    const input: AddCustomersInput = {
      customerIds: selected,
      useDefaultQuantity: useDefaultQty,
      useDefaultRate: useDefaultRate,
      ...(useDefaultQty ? {} : { customQuantity: qty }),
      ...(useDefaultRate ? {} : { customRate: rate }),
      ...(startDate ? { startDate: startDate.toISOString().slice(0, 10) } : {}),
    }
    busy.current = true
    clearError()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    void (async () => {
      try {
        const result = await addCustomers(listId, input)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setSummary({ added: result.addedCount, skipped: result.skippedCount })
        // Brief in-place summary, then return to detail.
        setSelected([])
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        // 409 (all already subscribed) keeps the selection; error shown via availableError.
      } finally {
        busy.current = false
      }
    })()
  }, [
    listId,
    isConnected,
    selected,
    useDefaultQty,
    customQty,
    useDefaultRate,
    customRate,
    startDate,
    clearError,
    addCustomers,
  ])

  const renderItem = useCallback(
    ({ item }: { item: AvailableCustomerDto }) => (
      <AvailableRow
        customer={item}
        checked={selected.includes(item.customerId)}
        onToggle={toggle}
      />
    ),
    [selected, toggle],
  )
  const keyExtractor = useCallback((c: AvailableCustomerDto) => c.customerId, [])

  const header = (
    <AppHeader
      title={t('supply.add_customers_title', { name: list?.name ?? '' })}
      showBack
      onBackPress={() => router.back()}
    />
  )

  const defaultsCaption =
    list && list.defaultQuantity != null && list.defaultRatePerUnit != null
      ? t('supply.list_defaults', {
          qty: String(list.defaultQuantity),
          unit: list.unit,
          rate: String(list.defaultRatePerUnit),
        })
      : null

  // Loading skeleton (first available page, no rows yet)
  const showSkeleton = isAvailableLoading && available.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {!isConnected ? (
        <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
      ) : null}
      {availableError ? (
        <AppAlert type="error" title={t('common.error')} message={t(availableError)} />
      ) : null}
      {summary ? (
        <AppAlert
          type="success"
          title={t('common.success')}
          message={t('supply.added_skipped_summary', {
            added: String(summary.added),
            skipped: String(summary.skipped),
          })}
          onClose={() => {
            setSummary(null)
            router.back()
          }}
        />
      ) : null}

      <View style={styles.search}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder={t('supply.search_customers')}
          testID="available-search"
        />
      </View>
      {defaultsCaption ? (
        <View style={styles.defaultsCaption}>
          <AppText variant="caption" color={colors.textSecondary}>
            {defaultsCaption}
          </AppText>
        </View>
      ) : null}

      {showSkeleton ? (
        <View style={styles.listContent} testID="available-loading">
          {[0, 1, 2, 3].map((i) => (
            <AppCard key={i} variant="flat" style={styles.skeletonRow}>
              <View />
            </AppCard>
          ))}
        </View>
      ) : available.length === 0 ? (
        <AppEmptyState
          icon={<Ionicons name="person-add-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('supply.empty_available')}
          description={t('supply.empty_customers_cta')}
        />
      ) : (
        <FlatList
          data={available}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Sticky footer: qty/rate selection + start date + submit */}
      <View style={styles.footer}>
        <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
          {t('supply.selected_count', { count: String(selected.length) })}
        </AppText>

        <AppRadioGroup
          label={t('supply.field_quantity')}
          layout="horizontal"
          options={[
            { label: t('supply.use_default_qty'), value: 'default' },
            { label: t('supply.custom_qty'), value: 'custom' },
          ]}
          value={useDefaultQty ? 'default' : 'custom'}
          onChange={(v) => setUseDefaultQty(v === 'default')}
        />
        {!useDefaultQty ? (
          <AppInput
            value={customQty}
            onChangeText={setCustomQty}
            keyboardType="numeric"
            placeholder={t('supply.custom_qty')}
            containerStyle={styles.customInput}
            testID="custom-qty"
          />
        ) : null}

        <AppRadioGroup
          label={t('supply.field_rate')}
          layout="horizontal"
          options={[
            { label: t('supply.use_default_rate'), value: 'default' },
            { label: t('supply.custom_rate'), value: 'custom' },
          ]}
          value={useDefaultRate ? 'default' : 'custom'}
          onChange={(v) => setUseDefaultRate(v === 'default')}
        />
        {!useDefaultRate ? (
          <AppInput
            value={customRate}
            onChangeText={setCustomRate}
            keyboardType="numeric"
            placeholder={t('supply.custom_rate')}
            containerStyle={styles.customInput}
            testID="custom-rate"
          />
        ) : null}

        <AppDatePicker
          label={t('supply.start_date')}
          value={startDate}
          onChange={setStartDate}
          mode="date"
          placeholder={t('supply.start_date')}
        />

        <AppButton
          label={t('supply.add_n_customers', { count: String(selected.length) })}
          variant="primary"
          onPress={handleAdd}
          disabled={writesDisabled}
          accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
          testID="add-submit"
        />
      </View>
    </SafeAreaView>
  )
}

export default function AddCustomersScreen() {
  return (
    <ScreenErrorBoundary>
      <AddCustomersScreenContent />
    </ScreenErrorBoundary>
  )
}

AddCustomersScreen.displayName = 'AddCustomersScreen'
