/**
 * AutomationSection (US-011)
 * Purpose: Displays auto-mark + auto-send toggles and the conditional time picker.
 *
 * - Auto-send time picker only visible when autoSendBillsEnabled = true.
 * - Parent is responsible for updating the form via the onChange prop.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppToggle } from '@components/primitives/AppToggle'
import { AppDatePicker } from '@components/primitives/AppDatePicker'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface AutomationSectionProps {
  autoMarkEnabled: boolean
  autoSendBillsEnabled: boolean
  autoSendBillsTime: string    // "HH:mm"
  disabled?: boolean
  onAutoMarkChange: (value: boolean) => void
  onAutoSendChange: (value: boolean) => void
  onSendTimeChange: (time: string) => void
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
  timePicker: {
    marginTop: spacing[2],
    marginLeft: spacing[4],
  },
})

/** Parses "HH:mm" into a Date (today) for the time picker. */
function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(hours ?? 20, minutes ?? 0, 0, 0)
  return d
}

/** Formats a Date into "HH:mm". */
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export const AutomationSection: React.FC<AutomationSectionProps> = ({
  autoMarkEnabled,
  autoSendBillsEnabled,
  autoSendBillsTime,
  disabled = false,
  onAutoMarkChange,
  onAutoSendChange,
  onSendTimeChange,
}) => {
  const { t } = useTranslation()

  const handleTimeChange = useCallback(
    (date: Date) => {
      onSendTimeChange(formatTime(date))
    },
    [onSendTimeChange],
  )

  return (
    <AppCard style={styles.card} testID="automation-section">
      <AppText variant="label" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
        {t('settings.automation_title')}
      </AppText>

      <AppToggle
        label={t('settings.auto_mark_label')}
        description={t('settings.auto_mark_description')}
        value={autoMarkEnabled}
        onChange={onAutoMarkChange}
        disabled={disabled}
      />

      <AppToggle
        label={t('settings.auto_send_bills_label')}
        description={t('settings.auto_send_bills_description')}
        value={autoSendBillsEnabled}
        onChange={onAutoSendChange}
        disabled={disabled}
      />

      {autoSendBillsEnabled ? (
        <View style={styles.timePicker}>
          <AppDatePicker
            label={t('settings.auto_send_bills_time_label')}
            mode="time"
            value={parseTime(autoSendBillsTime)}
            onChange={handleTimeChange}
            disabled={disabled}
          />
        </View>
      ) : null}
    </AppCard>
  )
}

export default AutomationSection
