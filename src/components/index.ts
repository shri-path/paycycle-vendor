/**
 * Component Exports
 * Barrel export file for all reusable components
 *
 * Layer 1: Primitives (primitives/)
 * Layer 2: Composite/Layout (composite/ and layout/)
 * Layer 3: Domain-specific (in feature modules)
 */

// ============================================================================
// LAYER 1: PRIMITIVE COMPONENTS
// ============================================================================

// Text
export { AppText } from './primitives/AppText'
export type { AppTextProps } from './primitives/AppText'

// Buttons
export { AppButton } from './primitives/AppButton'
export type { AppButtonProps } from './primitives/AppButton'

// Inputs & Form Controls
export { AppInput } from './primitives/AppInput'
export type { AppInputProps } from './primitives/AppInput'

export { AppTextArea } from './primitives/AppTextArea'
export type { AppTextAreaProps } from './primitives/AppTextArea'

export { AppSelect } from './primitives/AppSelect'
export type { AppSelectProps } from './primitives/AppSelect'

export { AppPhoneInput } from './primitives/AppPhoneInput'
export type { AppPhoneInputProps } from './primitives/AppPhoneInput'

export { AppDatePicker } from './primitives/AppDatePicker'
export type { AppDatePickerProps } from './primitives/AppDatePicker'

// Form Controls (Checkbox, Toggle, Radio, etc)
export { AppCheckbox } from './primitives/AppCheckbox'
export type { AppCheckboxProps } from './primitives/AppCheckbox'

export { AppToggle } from './primitives/AppToggle'
export type { AppToggleProps } from './primitives/AppToggle'

export { AppRadioGroup } from './primitives/AppRadioGroup'
export type { AppRadioGroupProps } from './primitives/AppRadioGroup'

export { AppIconButton } from './primitives/AppIconButton'
export type { AppIconButtonProps } from './primitives/AppIconButton'

// Containers
export { AppCard } from './primitives/AppCard'
export type { AppCardProps } from './primitives/AppCard'

export { AppDivider } from './primitives/AppDivider'
export type { AppDividerProps } from './primitives/AppDivider'

// Status & Display
export { AppBadge } from './primitives/AppBadge'
export type { AppBadgeProps } from './primitives/AppBadge'

export { AppAvatar } from './primitives/AppAvatar'
export type { AppAvatarProps } from './primitives/AppAvatar'

// Feedback
export { AppLoader } from './primitives/AppLoader'
export type { AppLoaderProps } from './primitives/AppLoader'

export { AppAlert } from './primitives/AppAlert'
export type { AppAlertProps } from './primitives/AppAlert'

// ============================================================================
// LAYER 2: LAYOUT COMPONENTS
// ============================================================================

export { AppHeader } from './layout/AppHeader'
export type { AppHeaderProps } from './layout/AppHeader'

export { AppListItem } from './layout/AppListItem'
export type { AppListItemProps } from './layout/AppListItem'

// ============================================================================
// LAYER 2: COMPOSITE COMPONENTS
// ============================================================================

// Search & Input
export { AppSearchBar } from './composite/AppSearchBar'
export type { AppSearchBarProps } from './composite/AppSearchBar'

// Empty & Feedback States
export { AppEmptyState } from './composite/AppEmptyState'
export type { AppEmptyStateProps } from './composite/AppEmptyState'

// Layout & Organization
export { AppSection } from './composite/AppSection'
export type { AppSectionProps } from './composite/AppSection'

export { AppMenuItem } from './composite/AppMenuItem'
export type { AppMenuItemProps } from './composite/AppMenuItem'

// Statistics & Data Display
export { AppStatsCard } from './composite/AppStatsCard'
export type { AppStatsCardProps } from './composite/AppStatsCard'

export { AppProgressBar } from './composite/AppProgressBar'
export type { AppProgressBarProps } from './composite/AppProgressBar'

export { AppTimeline } from './composite/AppTimeline'
export type { AppTimelineProps, TimelineItem } from './composite/AppTimeline'

// Selection & Control
export { AppSegmentedControl } from './composite/AppSegmentedControl'
export type { AppSegmentedControlProps, Segment } from './composite/AppSegmentedControl'

// Modals & Dialogs
export { AppBottomSheet } from './composite/AppBottomSheet'
export type { AppBottomSheetProps } from './composite/AppBottomSheet'

export { AppConfirmDialog } from './composite/AppConfirmDialog'
export type { AppConfirmDialogProps } from './composite/AppConfirmDialog'

// Error boundary — wraps every screen so a render error never crashes the app.
export { ScreenErrorBoundary } from './composite/ScreenErrorBoundary'

// Roles & Access Control (US-002) — shared gates/badges consumed across stories
export { RoleGate } from './composite/RoleGate'
export type { RoleGateProps } from './composite/RoleGate'

export { RoleBadge } from './composite/RoleBadge'
export type { RoleBadgeProps } from './composite/RoleBadge'
