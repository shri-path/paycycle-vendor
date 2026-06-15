/**
 * NearbyVendorCategorySection (US-014)
 * Renders one category group of nearby vendors.
 * Distance is NEVER shown (null in v1).
 * Stars shown only when vendor has referral history with this owner (yourReferral).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { NearbyVendorDto } from '../../../types/referral'

export interface NearbyVendorCategorySectionProps {
  category: string
  vendors: NearbyVendorDto[]
  testID?: string
}

const s = StyleSheet.create({
  section: { marginBottom: spacing[4] },
  categoryTitle: { marginBottom: spacing[2] },
  vendorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  vendorInfo: { flex: 1 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
})

function NearbyVendorCategorySectionInner({ category, vendors, testID }: NearbyVendorCategorySectionProps) {
  const { t } = useTranslation()
  return (
    <View style={s.section} testID={testID ?? `nearby-category-${category}`}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.categoryTitle}>
        {category}
      </AppText>
      {vendors.map((vendor, idx) => (
        <View key={idx} style={s.vendorRow} testID={`nearby-vendor-row-${idx}`}>
          <View style={s.vendorInfo}>
            <AppText variant="body" color={colors.textPrimary}>{vendor.name}</AppText>
          </View>
          <View style={s.stats}>
            <View style={s.statItem}>
              <Ionicons name="people-outline" size={componentSizes.icon.xs} color={colors.textSecondary} />
              <AppText variant="caption" color={colors.textSecondary}>{vendor.customersOnPaycycle}</AppText>
            </View>
            {vendor.yourReferral ? (
              <View style={s.statItem}>
                <Ionicons name="star" size={componentSizes.icon.xs} color={colors.warning} />
                <AppText variant="caption" color={colors.warning}>{t('referral.nearby.your_referral')}</AppText>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

export const NearbyVendorCategorySection = React.memo(NearbyVendorCategorySectionInner)
NearbyVendorCategorySection.displayName = 'NearbyVendorCategorySection'
export default NearbyVendorCategorySection
