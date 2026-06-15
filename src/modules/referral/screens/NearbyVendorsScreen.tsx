/**
 * NearbyVendorsScreen (US-014)
 * Owner-only. Nearby vendors grouped by category.
 * Distance is NEVER rendered (null in v1).
 * Empty state shows invite-nearby-vendor prompt.
 * byCategory via Object.entries — guaranteed non-undefined by service null-guard.
 */

import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@components/layout/AppHeader'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useReferralStore } from '../store/referral.store'
import { YourBusinessCard, NearbyVendorCategorySection } from '../components'

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function NearbyVendorsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  useRequireOwner()

  const { nearby, isNearbyLoading, nearbyError, fetchNearbyVendors, clearErrors } =
    useReferralStore(
      useShallow((s) => ({
        nearby: s.nearby,
        isNearbyLoading: s.isNearbyLoading,
        nearbyError: s.nearbyError,
        fetchNearbyVendors: s.fetchNearbyVendors,
        clearErrors: s.clearErrors,
      })),
    )

  useFocusEffect(
    useCallback(() => {
      void fetchNearbyVendors()
      return () => clearErrors()
    }, [fetchNearbyVendors, clearErrors]),
  )

  const goToReferVendor = useCallback(() => {
    router.push('/(app)/referrals/refer-vendor' as Href)
  }, [router])

  if (isNearbyLoading && !nearby) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.nearby.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (nearbyError && !nearby) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.nearby.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('referral.nearby.error_load')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchNearbyVendors()}
          />
        </View>
      </SafeAreaView>
    )
  }

  const categories = Object.entries(nearby?.byCategory ?? {})
  const hasVendors = categories.length > 0

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <AppHeader title={t('referral.nearby.title')} showBack onBackPress={() => router.back()} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {nearby?.yourBusiness ? (
          <YourBusinessCard business={nearby.yourBusiness} />
        ) : null}

        {hasVendors ? (
          categories.map(([category, vendors]) => (
            <NearbyVendorCategorySection key={category} category={category} vendors={vendors} />
          ))
        ) : (
          <>
            <AppEmptyState
              icon={<Ionicons name="map-outline" size={componentSizes.icon.xxxl} color={colors.textSecondary} />}
              title={t('referral.nearby.empty_title')}
              description={t('referral.nearby.empty_desc')}
              actionLabel={t('referral.nearby.invite_now')}
              onActionPress={goToReferVendor}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function NearbyVendorsScreen() {
  return (
    <ScreenErrorBoundary>
      <NearbyVendorsContent />
    </ScreenErrorBoundary>
  )
}

NearbyVendorsScreen.displayName = 'NearbyVendorsScreen'
