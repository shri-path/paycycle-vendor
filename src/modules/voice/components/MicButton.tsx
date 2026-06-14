/**
 * MicButton Component (US-013)
 * Purpose: Large circular mic button with idle/recording/processing visual states.
 * Pulsing animation during recording. ≥64pt touch target.
 * Accessible with role="button" and descriptive accessibilityLabel.
 */

import React, { memo, useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from '@hooks/useTranslation'
import { colors } from '@constants/tokens'

type MicState = 'idle' | 'recording' | 'processing'

interface Props {
  state: MicState
  onPress(): void
  disabled?: boolean
  testID?: string
}

const SIZE = 80
const PULSE_SIZE = SIZE + 24

export const MicButton = memo(function MicButton({
  state,
  onPress,
  disabled = false,
  testID,
}: Props) {
  const { t } = useTranslation()
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.3,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]),
      )
      pulse.start()
      return () => {
        pulse.stop()
      }
    } else {
      pulseAnim.setValue(1)
      pulseOpacity.setValue(0)
      return undefined
    }
  }, [state, pulseAnim, pulseOpacity])

  const buttonColor =
    state === 'recording' ? colors.error : state === 'processing' ? colors.gray400 : colors.primary

  const iconName =
    state === 'recording'
      ? 'stop-circle'
      : state === 'processing'
        ? 'hourglass-outline'
        : 'mic'

  const a11yLabel =
    state === 'recording'
      ? t('voice.cancel_recording')
      : state === 'processing'
        ? t('voice.processing')
        : t('voice.tap_to_speak')

  return (
    <View style={styles.wrapper} testID={testID}>
      {/* Pulse ring (recording only) */}
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: colors.error,
            transform: [{ scale: pulseAnim }],
            opacity: pulseOpacity,
          },
        ]}
        pointerEvents="none"
      />
      <Pressable
        onPress={onPress}
        disabled={disabled || state === 'processing'}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled: disabled || state === 'processing' }}
        style={[
          styles.button,
          { backgroundColor: disabled ? colors.gray300 : buttonColor },
        ]}
        testID={`${testID ?? 'mic'}-press`}
      >
        <Ionicons
          name={iconName}
          size={36}
          color={colors.white}
        />
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 6,
  },
})

export default MicButton
