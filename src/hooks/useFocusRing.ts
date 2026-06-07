/**
 * useFocusRing Hook
 *
 * Purpose: Shared focus-state logic for all text-entry inputs so the focus
 * treatment is consistent across the app (AppInput, AppTextArea, AppPhoneInput,
 * and anything built on top of them).
 *
 * Behaviour:
 * - Tracks focus state and exposes onFocus / onBlur handlers.
 * - Animates a clean lighter-green border on the input wrapper over a short
 *   duration (no glow — same treatment on web, iOS and Android).
 * - The animated style targets the wrapper View (must be an Animated.View) so
 *   the border covers the whole input, not just the inner text field.
 *
 * Note: pair with `inputOutlineReset` on the inner <TextInput> to suppress the
 * browser's default focus outline on web (otherwise a second inner box appears).
 */

import { useCallback, useRef, useState } from 'react'
import { Animated, Easing, Platform, TextStyle } from 'react-native'
import { animation, borderWidth, colors } from '@constants/tokens'

export interface UseFocusRingOptions {
  /** Whether the field is in an error state (uses error-tinted ring/glow) */
  error?: boolean
  /** Whether the field is disabled (suppresses the focus ring entirely) */
  disabled?: boolean
}

/**
 * Suppresses the default browser focus outline on web so the wrapper glow is
 * the single, full-width focus indicator. No-op on native.
 */
export const inputOutlineReset = Platform.select<TextStyle>({
  web: { outlineWidth: 0, outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
}) as TextStyle

export function useFocusRing({ error = false, disabled = false }: UseFocusRingOptions = {}) {
  const [isFocused, setIsFocused] = useState(false)
  const progress = useRef(new Animated.Value(0)).current

  const animateTo = useCallback(
    (toValue: number) => {
      // Under test, jump straight to the value. The timer-driven animation
      // would otherwise update Animated props outside React's act() scope and
      // spam act() warnings; setting synchronously keeps the update inside the
      // interaction that triggered it.
      if (process.env.NODE_ENV === 'test') {
        progress.setValue(toValue)
        return
      }
      Animated.timing(progress, {
        toValue,
        duration: animation.duration.base,
        easing: Easing.out(Easing.ease),
        // Border color + shadow radius are not supported by the native driver
        useNativeDriver: false,
      }).start()
    },
    [progress],
  )

  const onFocus = useCallback(() => {
    setIsFocused(true)
    if (!disabled) animateTo(1)
  }, [animateTo, disabled])

  const onBlur = useCallback(() => {
    setIsFocused(false)
    animateTo(0)
  }, [animateTo])

  // Resting -> focused colors. In an error state the field stays red but the
  // glow still confirms focus.
  const restingBorder = error ? colors.error : colors.gray200
  const focusedBorder = error ? colors.focusBorderError : colors.focusBorder

  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [restingBorder, focusedBorder],
  })

  // The soft glow is web-only. react-native-web maps these shadow props to a
  // CSS box-shadow that renders the green halo. On native we deliberately skip
  // them: iOS would render a coloured shadow but Android ignores shadowColor and
  // draws a stray grey elevation shadow instead — so for a consistent, native
  // feel both platforms show just the lighter-green focus border (below).
  /**
   * Animated style for the wrapper (apply to an Animated.View). Just a clean
   * lighter-green border that animates in on focus — no glow, identical on web,
   * iOS and Android. Border width is held constant so there is no layout shift.
   */
  const focusRingStyle = disabled
    ? {}
    : {
        borderWidth: borderWidth.thin,
        borderColor,
      }

  return { isFocused, onFocus, onBlur, focusRingStyle }
}

export default useFocusRing
