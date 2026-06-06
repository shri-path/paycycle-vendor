/**
 * AppBottomSheet Component
 * Layer 2 - Composite Component
 *
 * Purpose: Bottom sheet modal for contextual actions and content
 * Usage: <AppBottomSheet visible={show} onDismiss={handleDismiss} title="Options"><Content /></AppBottomSheet>
 *
 * Features:
 * - Slides up from bottom
 * - Optional header with title and close button
 * - Customizable height
 * - Dismissible on background tap
 * - Keyboard-aware
 */

import React from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  DimensionValue,
  Dimensions,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { AppIconButton } from '../primitives/AppIconButton'
import { colors, spacing, borderRadius, componentSizes } from '@constants/tokens'

const { height } = Dimensions.get('window')

export interface AppBottomSheetProps {
  /** Whether bottom sheet is visible */
  visible?: boolean
  /** Callback when bottom sheet is dismissed */
  onDismiss?: () => void
  /** Sheet title */
  title?: string
  /** Sheet content */
  children?: React.ReactNode
  /** Height of the sheet (as percentage or fixed value) */
  sheetHeight?: number | string
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    flex: 1,
  },
  closeButton: {
    marginLeft: spacing[2],
  },
  content: {
    maxHeight: height * 0.7,
  },
  handle: {
    width: 40,
    height: componentSizes.bottomSheet.handle.height,
    backgroundColor: colors.gray300,
    borderRadius: componentSizes.bottomSheet.handle.borderRadius,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppBottomSheet - Bottom sheet modal for contextual actions
 *
 * @example
 * // Basic bottom sheet
 * <AppBottomSheet
 *   visible={show}
 *   onDismiss={() => setShow(false)}
 *   title="Select action"
 * >
 *   <TouchableOpacity onPress={handleAction1}>
 *     <AppText>Action 1</AppText>
 *   </TouchableOpacity>
 * </AppBottomSheet>
 *
 * // With custom height
 * <AppBottomSheet
 *   visible={show}
 *   onDismiss={handleDismiss}
 *   title="Options"
 *   sheetHeight={0.6}
 * >
 *   <Content />
 * </AppBottomSheet>
 */
export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
  visible = false,
  onDismiss,
  title,
  children,
  sheetHeight = '50%',
  containerStyle,
}) => {
  const sheetHeightValue = typeof sheetHeight === 'number'
    ? `${sheetHeight * 100}%`
    : sheetHeight

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          style={[
            styles.container,
            containerStyle,
            { height: sheetHeightValue as DimensionValue },
          ]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          {title && (
            <View style={styles.header}>
              <AppText
                variant="h4"
                weight="bold"
                style={styles.title}
              >
                {title}
              </AppText>
              <AppIconButton
                icon="✕"
                onPress={onDismiss ?? (() => {})}
                variant="ghost"
                size="sm"
                style={styles.closeButton}
              />
            </View>
          )}

          <View style={styles.content}>
            {children}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

export default AppBottomSheet
