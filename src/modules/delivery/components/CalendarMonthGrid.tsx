/**
 * CalendarMonthGrid — composite. Purpose: a 7-column month grid for the owner
 * calendar. Each populated day shows the day number + a status indicator paired
 * with an icon (never colour alone): completed=check, has_leaves=dash, pending=
 * dots, has_conflicts=alert. Days are keyed by `YYYY-MM-DD`; empty days are
 * non-interactive. ≤42 memoized cells (no virtualisation). Presentational; data +
 * callback via props. Usage:
 *   <CalendarMonthGrid month="2026-06" days={days} onSelectDay={openDay} />
 */

import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { getCurrentLanguage } from '@locales/index'
import { colors, spacing, borderRadius, componentSizes, interaction } from '@constants/tokens'
import type { CalendarDayDto, CalendarDayStatus } from '../../../types/delivery'

/**
 * Locale-aware abbreviated weekday headers, Sunday-first (matches the grid, which
 * places the 1st of the month after `firstDay = getDay()` blanks, 0=Sunday). Falls
 * back to English single letters if Intl lacks the locale's weekday data.
 */
function getWeekdayLabels(locale: string): string[] {
  try {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // 2024-01-07 is a Sunday → iterate the 7 following days.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 7 + i)))
  } catch {
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  }
}

export interface CalendarMonthGridProps {
  /** Month string `YYYY-MM`. */
  month: string
  /** Sparse map of day data keyed by `YYYY-MM-DD`. */
  days: Record<string, CalendarDayDto>
  /** Called with the tapped day's `YYYY-MM-DD`. */
  onSelectDay: (date: string) => void
  testID?: string
}

interface CellPresentation {
  icon: React.ComponentProps<typeof Ionicons>['name']
  color: string
  labelKey: string
}

function statusPresentation(status: CalendarDayStatus): CellPresentation {
  switch (status) {
    case 'completed':
      return { icon: 'checkmark', color: colors.success, labelKey: 'delivery.cal_status_completed' }
    case 'has_leaves':
      return { icon: 'remove', color: colors.warning, labelKey: 'delivery.cal_status_has_leaves' }
    case 'has_conflicts':
      return { icon: 'alert', color: colors.error, labelKey: 'delivery.cal_status_has_conflicts' }
    case 'pending':
    default:
      return { icon: 'ellipsis-horizontal', color: colors.textSecondary, labelKey: 'delivery.cal_status_pending' }
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
  },
  weekHeader: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
  },
  populatedCell: {
    borderRadius: borderRadius.md,
  },
  statusIcon: {
    marginTop: spacing[1] / 2,
  },
})

const CalendarMonthGridComponent: React.FC<CalendarMonthGridProps> = ({
  month,
  days,
  onSelectDay,
  testID,
}) => {
  const { t } = useTranslation()

  const weekdayLabels = useMemo(() => getWeekdayLabels(getCurrentLanguage()), [])

  // Build the 42-cell grid (6 weeks) with leading blanks for the first weekday.
  const cells = useMemo(() => {
    const [yearStr, monthStr] = month.split('-')
    const year = Number(yearStr)
    const monthIndex = Number(monthStr) - 1
    if (Number.isNaN(year) || Number.isNaN(monthIndex)) return []
    const firstDay = new Date(year, monthIndex, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const result: { key: string; dayNum: number | null; dateStr: string | null }[] = []
    for (let i = 0; i < firstDay; i += 1) {
      result.push({ key: `blank-${i}`, dayNum: null, dateStr: null })
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateStr = `${yearStr}-${monthStr}-${pad2(d)}`
      result.push({ key: dateStr, dayNum: d, dateStr })
    }
    return result
  }, [month])

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.weekHeader}>
        {weekdayLabels.map((label, idx) => (
          <View key={`wd-${idx}`} style={styles.weekCell}>
            <AppText variant="caption" color={colors.textSecondary} importantForAccessibility="no">
              {label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.dayNum == null || cell.dateStr == null) {
            return <View key={cell.key} style={styles.cell} />
          }
          const data = days[cell.dateStr]
          if (!data) {
            // Empty day — non-interactive.
            return (
              <View key={cell.key} style={styles.cell}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {cell.dayNum}
                </AppText>
              </View>
            )
          }
          const presentation = statusPresentation(data.status)
          return (
            <TouchableOpacity
              key={cell.key}
              style={[styles.cell, styles.populatedCell]}
              onPress={() => onSelectDay(cell.dateStr as string)}
              activeOpacity={interaction.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel={`${cell.dayNum} — ${t(presentation.labelKey)}`}
              testID={testID ? `${testID}-day-${cell.dateStr}` : undefined}
            >
              <AppText variant="caption" weight="semibold" color={colors.textPrimary}>
                {cell.dayNum}
              </AppText>
              <Ionicons
                name={presentation.icon}
                size={componentSizes.icon.xs}
                color={presentation.color}
                style={styles.statusIcon}
                importantForAccessibility="no"
              />
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export const CalendarMonthGrid = React.memo(CalendarMonthGridComponent)
CalendarMonthGrid.displayName = 'CalendarMonthGrid'

export default CalendarMonthGrid
