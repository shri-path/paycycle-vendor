/**
 * AuditLogRow — one entry in the activity timeline (US-007).
 * Renders timestamp, actor + action label, optional customer/supply-list, optional
 * reason, and (owner-only) IP address. A "conflict" variant adds a left accent and a
 * Conflict badge when the action is an override.
 *
 * Pure + memoized. Null-guards every optional field (customer, supplyList, details,
 * ipAddress may be null per API_SPEC). No PII is logged; this only renders.
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppBadge } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { getCurrentLanguage } from '@locales/index'
import type { AuditLogDto } from '../../../types/audit'

export interface AuditLogRowProps {
  log: AuditLogDto
  testID?: string
}

/** True when the entry represents an owner/customer override of a staff mark. */
export function isConflictEntry(log: AuditLogDto): boolean {
  return log.actionType.includes('overridden') || log.actionType.includes('override')
}

/** Locale-aware HH:MM time; falls back to the raw value on parse failure. */
function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return date.toLocaleTimeString(getCurrentLanguage(), {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date.toLocaleTimeString()
  }
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[2] },
  conflictCard: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  actor: { marginBottom: spacing[1] },
  metaRow: { marginTop: spacing[1] },
})

function AuditLogRowComponent({ log, testID }: AuditLogRowProps) {
  const { t } = useTranslation()
  const conflict = isConflictEntry(log)
  const reason = typeof log.details?.reason === 'string' ? log.details.reason : null

  return (
    <AppCard
      variant="default"
      style={[styles.card, conflict && styles.conflictCard]}
      testID={testID}
    >
      <View style={styles.headerRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {formatTime(log.timestamp)}
        </AppText>
        {conflict ? (
          <AppBadge label={t('audit.conflict_badge')} variant="warning" size="sm" />
        ) : null}
      </View>

      <AppText variant="body" weight="semibold" style={styles.actor}>
        {log.user.name}
        {log.supplyList ? ` · ${log.supplyList.name}` : ''}
      </AppText>

      <AppText variant="caption" color={colors.textSecondary}>
        {log.actionLabel}
      </AppText>

      {log.customer ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.metaRow}>
          {t('audit.customer_label', { name: log.customer.name })}
        </AppText>
      ) : null}

      {reason ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {t('audit.reason_label', { reason })}
        </AppText>
      ) : null}

      {log.ipAddress ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {t('audit.ip_label', { ip: log.ipAddress })}
        </AppText>
      ) : null}
    </AppCard>
  )
}

export const AuditLogRow = memo(AuditLogRowComponent)
AuditLogRow.displayName = 'AuditLogRow'

export default AuditLogRow
