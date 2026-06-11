/**
 * SupplyTypeIcon — supply-lists module domain component (US-005).
 * Purpose: Map a supply type to a recognisable vector glyph (recognition over recall
 * for low-literacy users). Fixed map for the 6 known types (milk/bread/newspaper/water/
 * tiffin/other) + a generic fallback box for any custom `supplyType` string (OQ-1).
 *
 * Presentational + memoized. Zero image assets (vector font → no image memory cost).
 *
 * OQ-1 deviation: FEATURE_PLAN names "Lucide" glyphs, but `lucide-react-native` is not a
 * project dependency and the codebase standardises on `@expo/vector-icons`. We use
 * `MaterialCommunityIcons` (richer milk/bread/newspaper glyphs) — same fixed-map +
 * fallback behaviour, no new dependency. Prop API is unchanged.
 */

import React from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, componentSizes } from '@constants/tokens'

type GlyphName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export interface SupplyTypeIconProps {
  /** Supply type: a known key, a custom free string, or null (→ generic fallback). */
  supplyType: string | null
  /** Icon size in px. Default 24. */
  size?: number
  /** Icon color. Default colors.primary. */
  color?: string
  /** Test ID. */
  testID?: string
}

/** Generic fallback glyph for null / unknown / custom supply types. */
const FALLBACK_GLYPH: GlyphName = 'package-variant-closed'

/** Fixed map for the 6 known supply types (OQ-1). */
const GLYPH_MAP: Record<string, GlyphName> = {
  milk: 'cup',
  bread: 'bread-slice',
  newspaper: 'newspaper-variant-outline',
  water: 'water',
  tiffin: 'food',
  other: FALLBACK_GLYPH,
}

const SupplyTypeIconComponent: React.FC<SupplyTypeIconProps> = ({
  supplyType,
  size = componentSizes.icon.lg,
  color = colors.primary,
  testID,
}) => {
  const key = supplyType?.toLowerCase().trim() ?? ''
  const glyph: GlyphName = GLYPH_MAP[key] ?? FALLBACK_GLYPH

  return (
    <MaterialCommunityIcons
      name={glyph}
      size={size}
      color={color}
      testID={testID}
      // Decorative: the parent card carries the meaningful a11y label (type is also
      // conveyed as text), so the icon itself is hidden from screen readers.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  )
}

SupplyTypeIconComponent.displayName = 'SupplyTypeIcon'

export const SupplyTypeIcon = React.memo(SupplyTypeIconComponent)

export default SupplyTypeIcon
