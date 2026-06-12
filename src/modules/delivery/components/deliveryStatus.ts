/**
 * deliveryStatus — shared, pure presentation helpers for delivery status.
 * Maps the UPPERCASE backend status enum to an icon name, colour token, and i18n
 * key so cards/rows render status by icon + text (never colour alone). No PII, no
 * side effects.
 */

import { colors } from '@constants/tokens'
import type { DailySupplyStatus } from '../../../types/delivery'
import type { Ionicons } from '@expo/vector-icons'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

export interface StatusPresentation {
  icon: IoniconName
  color: string
  labelKey: string
}

/** Resolves the icon/colour/i18n-key for a delivery status. */
export function getStatusPresentation(status: DailySupplyStatus): StatusPresentation {
  switch (status) {
    case 'DELIVERED':
      return { icon: 'checkmark-circle', color: colors.success, labelKey: 'delivery.status_delivered' }
    case 'LEAVE':
      return { icon: 'remove-circle', color: colors.warning, labelKey: 'delivery.status_leave' }
    case 'AUTO_MARKED':
      return { icon: 'time', color: colors.info, labelKey: 'delivery.status_auto_marked' }
    case 'CANCELLED':
      return { icon: 'close-circle', color: colors.textSecondary, labelKey: 'delivery.status_cancelled' }
    case 'PENDING':
    default:
      return { icon: 'ellipse-outline', color: colors.textSecondary, labelKey: 'delivery.status_pending' }
  }
}

/** Two-letter initials from a customer name (or '?' when unknown). No PII stored. */
export function initialsFromName(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase() || '?'
}
