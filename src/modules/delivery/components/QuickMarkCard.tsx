/**
 * QuickMarkCard — composite. Purpose: a single swipeable delivery card for Quick
 * Mark mode. Swipe RIGHT = Delivered, LEFT = Leave (mirrored under RTL). Built on
 * react-native-gesture-handler Pan + react-native-reanimated (UI-thread translate/
 * rotate/opacity) — NO third-party swipe library. Buttons are always present as a
 * parallel, accessible path; when `reduceMotion` is on, the swipe animation is
 * disabled and the buttons are the path. Presentational; callbacks via props.
 * Usage:
 *   <QuickMarkCard delivery={d} onSwipeDelivered={ok} onSwipeLeave={leave}
 *     reduceMotion={rm} />
 */

import React, { useCallback } from 'react'
import { View, StyleSheet, I18nManager, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { DeliveryDto } from '../../../types/delivery'
import { initialsFromName } from './deliveryStatus'

export interface QuickMarkCardProps {
  /** The current pending delivery to mark. */
  delivery: DeliveryDto
  /** Position in queue (1-based) — for the accessibility label. */
  position?: number
  /** Total in queue — for the accessibility label. */
  total?: number
  /** Mark DELIVERED (swipe right or button). */
  onSwipeDelivered: () => void
  /** Mark LEAVE (swipe left or button). */
  onSwipeLeave: () => void
  /** OS reduce-motion preference: when true, disable the swipe animation. */
  reduceMotion: boolean
  testID?: string
}

const SWIPE_THRESHOLD = 0.25 // fraction of screen width to trigger

const styles = StyleSheet.create({
  card: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  name: {
    textAlign: 'center',
  },
  address: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  actionBtn: {
    flex: 1,
  },
})

const QuickMarkCardComponent: React.FC<QuickMarkCardProps> = ({
  delivery,
  position,
  total,
  onSwipeDelivered,
  onSwipeLeave,
  reduceMotion,
  testID,
}) => {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const translateX = useSharedValue(0)
  const { customer } = delivery

  // Swipe right = Delivered, left = Leave. Mirror under RTL so the gesture matches
  // the visual reading direction.
  const rtl = I18nManager.isRTL
  const triggerDelivered = useCallback(() => onSwipeDelivered(), [onSwipeDelivered])
  const triggerLeave = useCallback(() => onSwipeLeave(), [onSwipeLeave])

  const panGesture = Gesture.Pan()
    .enabled(!reduceMotion)
    .onUpdate((e) => {
      translateX.value = e.translationX
    })
    .onEnd((e) => {
      const threshold = width * SWIPE_THRESHOLD
      const movedRight = e.translationX > threshold
      const movedLeft = e.translationX < -threshold
      if (movedRight) {
        translateX.value = withSpring(width)
        runOnJS(rtl ? triggerLeave : triggerDelivered)()
      } else if (movedLeft) {
        translateX.value = withSpring(-width)
        runOnJS(rtl ? triggerDelivered : triggerLeave)()
      } else {
        translateX.value = withSpring(0)
      }
    })

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-8, 0, 8])
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, width * 0.5],
      [1, 0.6],
    )
    return {
      transform: [{ translateX: translateX.value }, { rotate: `${rotate}deg` }],
      opacity,
    }
  })

  const a11yLabel =
    position != null && total != null
      ? `${customer.name ?? t('common.you')} (${position}/${total})`
      : (customer.name ?? t('common.you'))

  return (
    <View testID={testID}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={reduceMotion ? undefined : animatedStyle}
          accessibilityLabel={a11yLabel}
          accessibilityLiveRegion="polite"
        >
          <AppCard variant="elevated" style={styles.card}>
            <AppAvatar initials={initialsFromName(customer.name)} size="lg" />
            <AppText variant="h2" weight="bold" style={styles.name} numberOfLines={2}>
              {customer.name ?? t('common.you')}
            </AppText>
            {customer.address ? (
              <AppText variant="body" color={colors.textSecondary} style={styles.address} numberOfLines={3}>
                {customer.address}
              </AppText>
            ) : null}
            <AppText variant="caption" color={colors.textSecondary}>
              {delivery.quantity} {delivery.unit}
            </AppText>
          </AppCard>
        </Animated.View>
      </GestureDetector>

      <View style={styles.actions}>
        <AppButton
          label={t('delivery.mark_leave')}
          variant="secondary"
          onPress={onSwipeLeave}
          style={styles.actionBtn}
          testID={testID ? `${testID}-leave` : undefined}
        />
        <AppButton
          label={t('delivery.mark_delivered')}
          variant="primary"
          onPress={onSwipeDelivered}
          style={styles.actionBtn}
          testID={testID ? `${testID}-delivered` : undefined}
        />
      </View>
    </View>
  )
}

export const QuickMarkCard = React.memo(QuickMarkCardComponent)
QuickMarkCard.displayName = 'QuickMarkCard'

export default QuickMarkCard
