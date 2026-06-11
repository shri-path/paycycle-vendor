/**
 * supplyListFormConfig — private form helpers for the Create / Edit supply-list
 * screens (US-005, WS-2). Co-located with the two owner form screens; NOT a
 * cross-workstream shared module (only Create/Edit import it).
 *
 * Provides the localized option lists (supply type / unit / frequency), the
 * start-time field, and the day-chip selector (WEEKLY → Mon–Sun, MONTHLY → 1..31)
 * so both screens render identical, accessible controls without duplication.
 *
 * Tokens only; every string via the injected t(); ≥44×44 day chips with hitSlop.
 */

import React, { useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppText } from '@components/primitives/AppText'
import { AppInput } from '@components/primitives/AppInput'
import type { SelectOption } from '@components/primitives/AppSelect'
import type { RadioOption } from '@components/primitives/AppRadioGroup'
import { colors, spacing, borderRadius, interaction } from '@constants/tokens'
import type { SupplyFrequency } from '../../../types/supplyLists'

/** Minimal translate signature (interpolation params optional). */
export type TFunc = (key: string, params?: Record<string, string | number>) => string

const SUPPLY_TYPES = ['milk', 'bread', 'newspaper', 'water', 'tiffin', 'other'] as const
const UNITS = ['ltr', 'kg', 'pieces', 'grams', 'numbers', 'packets'] as const

const WEEKDAY_KEYS = [
  'supply.weekday_mon',
  'supply.weekday_tue',
  'supply.weekday_wed',
  'supply.weekday_thu',
  'supply.weekday_fri',
  'supply.weekday_sat',
  'supply.weekday_sun',
] as const

export function SupplyTypeOptions(t: TFunc): SelectOption[] {
  return SUPPLY_TYPES.map((s) => ({ label: t(`supply.supply_type_${s}`), value: s }))
}

export function UnitOptions(t: TFunc): SelectOption[] {
  return UNITS.map((u) => ({ label: t(`supply.unit_${u}`), value: u }))
}

export function FrequencyOptions(t: TFunc): RadioOption[] {
  return [
    { label: t('supply.freq_daily'), value: 'DAILY' },
    { label: t('supply.freq_weekly'), value: 'WEEKLY' },
    { label: t('supply.freq_monthly'), value: 'MONTHLY' },
  ]
}

const styles = StyleSheet.create({
  dayBlock: { marginBottom: spacing[4] },
  dayLabel: { marginBottom: spacing[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    minWidth: interaction.minTouchTarget,
    minHeight: interaction.minTouchTarget,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTextSelected: { color: colors.white },
  errorText: { marginTop: spacing[2] },
})

export interface ScheduleFieldsProps {
  startTime: string
  onStartTimeChange: (value: string) => void
  startTimeError?: string
  tf: TFunc
}

/** Start-time field. Sends "HH:mm" to the API (typed directly for keypad parity). */
export const ScheduleFields: React.FC<ScheduleFieldsProps> = ({
  startTime,
  onStartTimeChange,
  startTimeError,
  tf,
}) => (
  <AppInput
    label={tf('supply.field_start_time')}
    value={startTime}
    onChangeText={onStartTimeChange}
    placeholder="06:30"
    maxLength={5}
    keyboardType="numbers-and-punctuation"
    testID="form-start-time"
    error={startTimeError}
  />
)

export interface DayChipsProps {
  frequency: SupplyFrequency
  value: number[]
  onChange: (days: number[]) => void
  error?: string
  tf: TFunc
}

/** Day selector — WEEKLY → Mon..Sun (ISO 1..7), MONTHLY → 1..31 grid. */
export const DayChips: React.FC<DayChipsProps> = ({ frequency, value, onChange, error, tf }) => {
  const days =
    frequency === 'WEEKLY'
      ? WEEKDAY_KEYS.map((key, i) => ({ day: i + 1, label: tf(key) }))
      : Array.from({ length: 31 }, (_, i) => ({ day: i + 1, label: String(i + 1) }))

  const toggle = useCallback(
    (day: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const next = value.includes(day)
        ? value.filter((d) => d !== day)
        : [...value, day].sort((a, b) => a - b)
      onChange(next)
    },
    [value, onChange],
  )

  return (
    <View style={styles.dayBlock}>
      <AppText variant="label" style={styles.dayLabel}>
        {tf('supply.select_days')}
      </AppText>
      <View style={styles.chipRow}>
        {days.map(({ day, label }) => {
          const selected = value.includes(day)
          return (
            <TouchableOpacity
              key={day}
              onPress={() => toggle(day)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={label}
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`day-chip-${day}`}
            >
              <AppText
                variant="caption"
                weight="semibold"
                style={selected ? styles.chipTextSelected : undefined}
                color={selected ? colors.white : colors.textPrimary}
              >
                {label}
              </AppText>
            </TouchableOpacity>
          )
        })}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </View>
  )
}
