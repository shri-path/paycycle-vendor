/**
 * InvoiceDetailScreen — Owner-only (US-009, FEATURE_PLAN §4.3).
 * Purpose: Shows a single invoice's details. Resolved from the in-memory
 * invoices slice — there is NO single-invoice GET endpoint (OQ-11).
 * If the invoice is not in the cache (cold deep-link or not loaded),
 * shows a not-found state with a back action.
 *
 * "Download PDF" button → toast "PDF download coming soon" (R17).
 * All field values are null-guarded.
 */

import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppBadge } from '@components/primitives/AppBadge'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { formatLocaleDate } from '@utils/formatDate'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing } from '@constants/tokens'
import { useSubscriptionStore } from '../store/subscription.store'
import type { BadgeVariant } from '@components/primitives/AppBadge'
import type { InvoicePaymentStatus } from '../../../types/subscription'

const PAYMENT_STATUS_CONFIG: Record<InvoicePaymentStatus, { variant: BadgeVariant; key: string }> = {
  PAID:    { variant: 'success', key: 'subscription.paid' },
  PENDING: { variant: 'warning', key: 'subscription.pending' },
  OVERDUE: { variant: 'error',   key: 'subscription.overdue' },
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing[3],
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={colors.textSecondary}>{label}</AppText>
      <AppText variant="body" color={colors.textPrimary}>{value}</AppText>
    </View>
  )
}

function InvoiceDetailScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>()
  useRequireOwner()

  const vendorName = useAuthStore(useShallow((s) => s.vendorContext?.vendorName ?? ''))
  const invoices = useSubscriptionStore(useShallow((s) => s.invoices))

  const invoice = invoices.find((inv) => inv.id === invoiceId)

  const handleDownloadPdf = useCallback(() => {
    Alert.alert(t('subscription.pdf_coming_soon'))
  }, [t])

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title={t('subscription.invoice_detail')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <AppText variant="body" color={colors.textSecondary}>
            {t('subscription.error_no_subscription')}
          </AppText>
          <AppButton
            label={t('common.back')}
            onPress={() => router.back()}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    )
  }

  const statusConfig = PAYMENT_STATUS_CONFIG[invoice.paymentStatus]

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title={t('subscription.invoice_detail')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Field label={t('subscription.invoice_number')} value={invoice.invoiceNumber} />
          <Field label={t('customer.title')} value={vendorName} />
          <Field label={t('subscription.amount')} value={formatCurrency(invoice.amount)} />
          <Field label={t('subscription.tax')} value={formatCurrency(invoice.tax)} />

          <View style={styles.totalRow}>
            <AppText variant="body" weight="bold" color={colors.textPrimary}>
              {t('subscription.total')}
            </AppText>
            <AppText variant="body" weight="bold" color={colors.primary}>
              {formatCurrency(invoice.totalAmount)}
            </AppText>
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('subscription.payment_status')}
            </AppText>
            <AppBadge label={t(statusConfig.key)} variant={statusConfig.variant} size="sm" />
          </View>

          {invoice.paymentDate ? (
            <Field
              label={t('subscription.payment_date')}
              value={formatLocaleDate(invoice.paymentDate)}
            />
          ) : null}

          {invoice.paymentMethod ? (
            <Field label={t('subscription.payment_method')} value={invoice.paymentMethod} />
          ) : null}
        </View>

        <AppButton
          label={t('subscription.download_pdf')}
          onPress={handleDownloadPdf}
          variant="secondary"
          fullWidth
          testID="download-pdf-btn"
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default function InvoiceDetailScreen() {
  return (
    <ScreenErrorBoundary>
      <InvoiceDetailScreenContent />
    </ScreenErrorBoundary>
  )
}

InvoiceDetailScreen.displayName = 'InvoiceDetailScreen'
