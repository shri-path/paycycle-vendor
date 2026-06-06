/**
 * AppSection Component
 * Layer 2 - Composite Component
 *
 * Purpose: Section container with header and content
 * Usage: <AppSection title="Recent Orders"><OrderList /></AppSection>
 *
 * Features:
 * - Optional header with title
 * - Optional right action element
 * - Content area with children
 * - Customizable spacing
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { spacing } from '@constants/tokens'

export interface AppSectionProps {
  /** Section title */
  title?: string
  /** Right-aligned action element (button, icon, etc) */
  action?: React.ReactNode
  /** Section content */
  children?: React.ReactNode
  /** Container style override */
  containerStyle?: ViewStyle
  /** Content area style override */
  contentStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
  },
  title: {
    flex: 1,
  },
  actionContainer: {
    marginLeft: spacing[2],
  },
  content: {
    paddingHorizontal: spacing[3],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppSection - Section container for grouping related content
 *
 * @example
 * // Basic section
 * <AppSection title="Recent Orders">
 *   <OrderList />
 * </AppSection>
 *
 * // Section with action
 * <AppSection
 *   title="Top Customers"
 *   action={<AppButton label="View All" />}
 * >
 *   <CustomerList />
 * </AppSection>
 *
 * // Section without title
 * <AppSection>
 *   <ContentComponent />
 * </AppSection>
 */
export const AppSection: React.FC<AppSectionProps> = ({
  title,
  action,
  children,
  containerStyle,
  contentStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {title && (
        <View style={styles.header}>
          <AppText
            variant="h4"
            weight="bold"
            style={styles.title}
          >
            {title}
          </AppText>
          {action && (
            <View style={styles.actionContainer}>
              {action}
            </View>
          )}
        </View>
      )}

      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  )
}

export default AppSection
