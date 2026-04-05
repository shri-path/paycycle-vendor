/**
 * AppTimeline Component
 * Layer 2 - Composite Component
 *
 * Purpose: Timeline display for ordered events or activities
 * Usage: <AppTimeline items={[{time: '2 hours ago', title: 'Order placed'}]} />
 *
 * Features:
 * - Vertical timeline layout
 * - Time and event information
 * - Status indicators (completed, pending)
 * - Optional icons
 * - Connecting line between items
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
  FlatList,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { colors, spacing, componentSizes, fontSize, fontWeight, borderWidth } from '@constants/tokens'

export interface TimelineItem {
  /** Unique identifier */
  id: string | number
  /** Time label (e.g., "2 hours ago") */
  time: string
  /** Event title */
  title: string
  /** Event description */
  description?: string
  /** Status indicator */
  status?: 'completed' | 'pending' | 'error'
  /** Icon/emoji */
  icon?: React.ReactNode
}

export interface AppTimelineProps {
  /** Timeline items */
  items: TimelineItem[]
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'completed':
      return colors.success || '#10B981'
    case 'error':
      return colors.error
    case 'pending':
    default:
      return colors.gray400
  }
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  timelineIndicator: {
    width: componentSizes.timeline.indicator,
    height: componentSizes.timeline.indicator,
    borderRadius: componentSizes.timeline.indicator / 2,
    marginRight: spacing[3],
    marginTop: spacing[1],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borderWidth.thick,
    backgroundColor: colors.white,
  },
  timelineIcon: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  timelineConnector: {
    position: 'absolute',
    left: componentSizes.timeline.indicator / 2 - componentSizes.timeline.connector / 2,
    top: componentSizes.timeline.indicator,
    bottom: -spacing[4],
    width: componentSizes.timeline.connector,
    backgroundColor: colors.gray200,
  },
  timelineContent: {
    flex: 1,
  },
  time: {
    marginBottom: spacing[1],
    color: colors.textSecondary,
  },
  title: {
    fontWeight: fontWeight.medium,
    marginBottom: spacing[0],
  },
  description: {
    marginTop: spacing[1],
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing[0],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppTimeline - Timeline display for ordered events
 *
 * @example
 * // Basic timeline
 * const items = [
 *   { id: 1, time: '2 hours ago', title: 'Order placed' },
 *   { id: 2, time: '1 hour ago', title: 'Payment processed' },
 *   { id: 3, time: 'Just now', title: 'Ready for pickup' }
 * ]
 * <AppTimeline items={items} />
 *
 * // With status and descriptions
 * const items = [
 *   {
 *     id: 1,
 *     time: '10:30 AM',
 *     title: 'Order confirmed',
 *     description: 'Customer confirmed the order',
 *     status: 'completed',
 *     icon: '✓'
 *   },
 *   {
 *     id: 2,
 *     time: '10:45 AM',
 *     title: 'Preparing',
 *     status: 'pending'
 *   }
 * ]
 * <AppTimeline items={items} />
 */
export const AppTimeline: React.FC<AppTimelineProps> = ({
  items,
  containerStyle,
}) => {
  const renderItem = ({ item, index }: { item: TimelineItem; index: number }) => {
    const statusColor = getStatusColor(item.status)
    const isLast = index === items.length - 1

    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineIndicator}>
          {!isLast && (
            <View style={styles.timelineConnector} />
          )}
          <View
            style={[
              {
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: statusColor,
              },
            ]}
          >
            {item.icon && (
              <AppText style={[styles.timelineIcon, { color: colors.white }]}>
                {item.icon}
              </AppText>
            )}
          </View>
        </View>

        <View style={styles.timelineContent}>
          <AppText variant="caption" style={styles.time}>
            {item.time}
          </AppText>
          <AppText variant="body" style={styles.title}>
            {item.title}
          </AppText>
          {item.description && (
            <AppText variant="caption" style={styles.description}>
              {item.description}
            </AppText>
          )}
        </View>
      </View>
    )
  }

  return (
    <FlatList
      scrollEnabled={false}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      style={[styles.container, containerStyle]}
      contentContainerStyle={styles.listContent}
    />
  )
}

export default AppTimeline
