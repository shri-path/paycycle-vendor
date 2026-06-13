/**
 * Navigation Tab Icons (Bottom Navigation Feature)
 * Purpose: Provide active/inactive icon variants for each tab in the tab bar.
 *
 * Each export is a function (active: boolean) => ReactNode so the caller
 * controls the active state without needing to know the icon library.
 * Active = filled variant + primary color; inactive = outline + textSecondary.
 * Size is fixed at 24px per design spec (componentSizes.icon.lg).
 */

import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { colors, componentSizes } from '@constants/tokens'

const ICON_SIZE = componentSizes.icon.lg // 24

/** Home / Dashboard tab icon */
export function HomeIcon(active: boolean): React.ReactNode {
  return (
    <Ionicons
      name={active ? 'home' : 'home-outline'}
      size={ICON_SIZE}
      color={active ? colors.primary : colors.textSecondary}
    />
  )
}

/** Supply Lists tab icon (owner) */
export function ListsIcon(active: boolean): React.ReactNode {
  return (
    <Ionicons
      name={active ? 'list' : 'list-outline'}
      size={ICON_SIZE}
      color={active ? colors.primary : colors.textSecondary}
    />
  )
}

/** Customers tab icon (owner) */
export function CustomersIcon(active: boolean): React.ReactNode {
  return (
    <Ionicons
      name={active ? 'people' : 'people-outline'}
      size={ICON_SIZE}
      color={active ? colors.primary : colors.textSecondary}
    />
  )
}

/** My Lists tab icon (staff) */
export function MyListsIcon(active: boolean): React.ReactNode {
  return (
    <Ionicons
      name={active ? 'clipboard' : 'clipboard-outline'}
      size={ICON_SIZE}
      color={active ? colors.primary : colors.textSecondary}
    />
  )
}

/** More menu tab icon (both roles) */
export function MoreIcon(active: boolean): React.ReactNode {
  return (
    <Ionicons
      name={active ? 'grid' : 'grid-outline'}
      size={ICON_SIZE}
      color={active ? colors.primary : colors.textSecondary}
    />
  )
}
