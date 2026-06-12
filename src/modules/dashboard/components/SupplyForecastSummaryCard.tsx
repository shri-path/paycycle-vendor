/**
 * SupplyForecastSummaryCard (US-010)
 * Purpose: Shows tomorrow's supply forecast lines on the owner dashboard.
 * Each line: "Morning Milk: 85 ltr (45)".
 * "View 7-Day Forecast" button navigates to the full forecast screen.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { ForecastLine } from '../../../types/dashboard'

export interface SupplyForecastSummaryCardProps {
  tomorrow: ForecastLine[]
  onViewForecast: () => void
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  button: { marginTop: spacing[2] },
})

export const SupplyForecastSummaryCard: React.FC<SupplyForecastSummaryCardProps> = ({
  tomorrow,
  onViewForecast,
}) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID="supply-forecast-summary-card">
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
        {t('dashboard.tomorrow_forecast')}
      </AppText>

      {tomorrow.length === 0 ? (
        <AppEmptyState
          title={t('dashboard.no_lists_today')}
          description=""
        />
      ) : (
        tomorrow.map((line) => (
          <View key={line.listName} style={styles.line}>
            <AppText variant="body" color={colors.textPrimary}>
              {line.listName}
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {line.quantity} {line.unit} ({line.customerCount})
            </AppText>
          </View>
        ))
      )}

      <AppButton
        label={t('dashboard.view_7day')}
        onPress={onViewForecast}
        variant="secondary"
        fullWidth
        style={styles.button}
        testID="view-7day-forecast-btn"
      />
    </AppCard>
  )
}

export default SupplyForecastSummaryCard
