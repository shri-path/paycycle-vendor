/**
 * NotificationCategorySection (US-011)
 * Purpose: Renders a labelled group of AppToggle rows for one notification category.
 *
 * Used by NotificationPreferencesScreen for the four groups:
 *   - Channels (push / whatsapp / sms)
 *   - Payment notifications
 *   - Customer notifications
 *   - Operations notifications
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppToggle } from '@components/primitives/AppToggle'
import { AppText } from '@components/primitives/AppText'
import { colors, spacing } from '@constants/tokens'

export interface NotificationToggleItem {
  key: string
  label: string
  description?: string
  value: boolean
}

export interface NotificationCategorySectionProps {
  title: string
  items: NotificationToggleItem[]
  disabled?: boolean
  onToggle: (key: string, value: boolean) => void
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    marginBottom: spacing[2],
  },
})

export const NotificationCategorySection: React.FC<NotificationCategorySectionProps> = ({
  title,
  items,
  disabled = false,
  onToggle,
}) => {
  return (
    <AppCard style={styles.card} testID={`notif-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <AppText variant="label" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
        {title}
      </AppText>

      {items.map((item) => (
        <AppToggle
          key={item.key}
          label={item.label}
          description={item.description}
          value={item.value}
          onChange={(v) => onToggle(item.key, v)}
          disabled={disabled}
        />
      ))}
    </AppCard>
  )
}

export default NotificationCategorySection
