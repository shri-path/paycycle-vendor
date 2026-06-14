/**
 * TemplatePreviewCard Component (US-013)
 * Purpose: Renders the server-rendered template preview and lists
 * any unresolved placeholder tokens that the server flagged.
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { PreviewTemplateResultDto } from '../../../types/voice'

interface Props {
  preview: PreviewTemplateResultDto
  testID?: string
}

export const TemplatePreviewCard = memo(function TemplatePreviewCard({
  preview,
  testID,
}: Props) {
  const { t } = useTranslation()
  const hasUnresolved = preview.unresolved && preview.unresolved.length > 0

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
        <AppText variant="caption" color={colors.textSecondary} weight="medium" style={styles.headerText}>
          {t('templates.preview_label')}
        </AppText>
      </View>

      <View style={styles.body}>
        <AppText variant="body" color={colors.textPrimary} style={styles.content}>
          {preview.preview}
        </AppText>
      </View>

      {hasUnresolved ? (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={14} color={colors.warning} />
          <AppText variant="caption" color={colors.warning} style={styles.warningText}>
            {t('templates.unresolved_tokens', {
              tokens: (preview.unresolved ?? []).map((tk) => `{{${tk}}}`).join(', '),
            })}
          </AppText>
        </View>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing[1],
  },
  headerText: {
    flex: 1,
  },
  body: {
    padding: spacing[4],
  },
  content: {
    lineHeight: 22,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    backgroundColor: colors.warningBg,
    gap: spacing[1],
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
  },
})

export default TemplatePreviewCard
