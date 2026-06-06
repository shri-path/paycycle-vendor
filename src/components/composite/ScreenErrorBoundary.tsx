/**
 * ScreenErrorBoundary
 * Purpose: Catch render-time errors in screens and show a recovery UI
 * Usage: Wrap each screen root in <ScreenErrorBoundary> so a crash never takes down the whole app.
 *
 * Intentionally uses plain React Native primitives (not Tamagui/AppText) so the
 * fallback UI cannot itself trigger another crash.
 */

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@constants/tokens'

interface Props {
  children: React.ReactNode
  /** Optional title override for the error fallback */
  title?: string
  /** Optional subtitle override for the error fallback */
  subtitle?: string
}

interface State {
  hasError: boolean
}

/**
 * Class component — React error boundaries must be class-based.
 */
export class ScreenErrorBoundary extends React.Component<Props, State> {
  static displayName = 'ScreenErrorBoundary'

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      console.error('[ScreenErrorBoundary] Caught render error:', error.message, info.componentStack)
    }
    // TODO: report to Sentry / crash analytics in production
  }

  handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    const title = this.props.title ?? 'Something went wrong'
    const subtitle = this.props.subtitle ?? 'An unexpected error occurred. Tap Retry to reload the screen.'

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})
