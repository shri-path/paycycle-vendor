/**
 * SupplyTypeIcon tests — fixed-map glyph resolution for the 6 known types and the
 * generic fallback for null/unknown/custom supply types. Assertions read the rendered
 * MaterialCommunityIcons `name` prop (locale-independent).
 */

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MaterialCommunityIcons' }))

import React from 'react'
import { render } from '@testing-library/react-native'
import { SupplyTypeIcon } from '../SupplyTypeIcon'

// The icon is intentionally hidden from the accessibility tree (decorative), so every
// query must opt into hidden elements to find it.
const HIDDEN = { includeHiddenElements: true } as const

/** Read the glyph `name` off the single rendered icon node. */
async function glyphName(supplyType: string | null): Promise<string> {
  const screen = await render(<SupplyTypeIcon supplyType={supplyType} testID="icon" />)
  return screen.getByTestId('icon', HIDDEN).props.name as string
}

describe('SupplyTypeIcon', () => {
  it('maps each of the 6 known supply types to its fixed glyph', async () => {
    expect(await glyphName('milk')).toBe('cup')
    expect(await glyphName('bread')).toBe('bread-slice')
    expect(await glyphName('newspaper')).toBe('newspaper-variant-outline')
    expect(await glyphName('water')).toBe('water')
    expect(await glyphName('tiffin')).toBe('food')
    expect(await glyphName('other')).toBe('package-variant-closed')
  })

  it('is case-insensitive and trims the supply type', async () => {
    expect(await glyphName('  MILK ')).toBe('cup')
  })

  it('falls back to the generic glyph for null', async () => {
    expect(await glyphName(null)).toBe('package-variant-closed')
  })

  it('falls back to the generic glyph for an unknown custom type', async () => {
    expect(await glyphName('eggs')).toBe('package-variant-closed')
  })

  it('forwards size and color', async () => {
    const screen = await render(
      <SupplyTypeIcon supplyType="milk" size={32} color="#abcdef" testID="icon" />,
    )
    const node = screen.getByTestId('icon', HIDDEN)
    expect(node.props.size).toBe(32)
    expect(node.props.color).toBe('#abcdef')
  })

  it('hides the decorative icon from screen readers', async () => {
    const screen = await render(<SupplyTypeIcon supplyType="milk" testID="icon" />)
    expect(screen.getByTestId('icon', HIDDEN).props.accessibilityElementsHidden).toBe(true)
  })
})
