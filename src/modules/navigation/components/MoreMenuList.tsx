/**
 * MoreMenuList Component (Bottom Navigation Feature)
 * Purpose: Shared presentational list component for both owner and staff More screens.
 *
 * Renders AppSection groups, each with AppMenuItem rows. Rows with onPress===undefined
 * are rendered disabled with a "Coming soon" caption. A LOG OUT danger button appears
 * at the bottom. All strings via t(); no hardcoded text.
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { ScrollView, YStack } from 'tamagui'
import { AppSection } from '@components/composite/AppSection'
import { AppMenuItem } from '@components/composite/AppMenuItem'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { MoreMenuSection } from '../nav.config'

// ============================================================================
// TYPES
// ============================================================================

export interface MoreMenuListProps {
  sections: MoreMenuSection[]
  onLogout: () => void
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
  },
  sectionContent: {
    // Remove padding from AppSection's default content padding — AppMenuItem
    // provides its own horizontal padding and the section card sits edge-to-edge.
    paddingHorizontal: 0,
    backgroundColor: colors.surface,
    borderRadius: 0,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

export const MoreMenuList: React.FC<MoreMenuListProps> = React.memo(function MoreMenuList({
  sections,
  onLogout,
}) {
  const { t } = useTranslation()

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => (
        <AppSection
          key={section.titleKey}
          title={t(section.titleKey)}
          contentStyle={styles.sectionContent}
        >
          {section.rows.map((row, rowIndex) => {
            const isDisabled = row.onPress === undefined
            const isLastRow = rowIndex === section.rows.length - 1

            return (
              <AppMenuItem
                key={row.testID}
                testID={row.testID}
                label={t(row.labelKey)}
                description={
                  isDisabled
                    ? t('nav.comingSoon')
                    : row.descriptionKey
                      ? t(row.descriptionKey)
                      : undefined
                }
                icon={row.icon}
                onPress={row.onPress}
                disabled={isDisabled}
                showDivider={!isLastRow}
                containerStyle={isDisabled ? { opacity: 0.6 } : undefined}
              />
            )
          })}
        </AppSection>
      ))}

      {/* Log Out button */}
      <YStack paddingHorizontal={spacing[4]} paddingVertical={spacing[4]}>
        <AppButton
          label={t('nav.logout.button')}
          variant="danger"
          onPress={onLogout}
          testID="more-logout-button"
        />
      </YStack>
    </ScrollView>
  )
})

MoreMenuList.displayName = 'MoreMenuList'

export default MoreMenuList
