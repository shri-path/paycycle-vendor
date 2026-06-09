/**
 * RoleBadge Tests (WS-0)
 * Purpose: verify the badge shows the correct role label and optional area, and
 * exposes an accessibility label. Translation is mocked to identity so the test
 * asserts on i18n keys (locale-independent), per project test convention.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { RoleBadge } from '../RoleBadge'

jest.mock('@hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('RoleBadge', () => {
  it('shows the owner label and owner a11y label', async () => {
    const screen = await render(<RoleBadge role="owner" testID="role-badge" />)
    expect(screen.getByText('roles.owner_badge')).toBeTruthy()
    expect(screen.getByTestId('role-badge').props.accessibilityLabel).toBe('roles.owner_badge')
  })

  it('shows the staff label with the area label appended', async () => {
    const screen = await render(
      <RoleBadge role="staff" areaLabel="Sector 15" testID="role-badge" />,
    )
    expect(screen.getByText('roles.staff_badge')).toBeTruthy()
    expect(screen.getByText('Sector 15')).toBeTruthy()
    expect(screen.getByTestId('role-badge').props.accessibilityLabel).toBe(
      'roles.staff_badge, Sector 15',
    )
  })

  it('does not render an area label for an owner', async () => {
    const screen = await render(<RoleBadge role="owner" areaLabel="Sector 15" />)
    expect(screen.queryByText('Sector 15')).toBeNull()
  })

  it('omits the area text when staff has no area label', async () => {
    const screen = await render(<RoleBadge role="staff" testID="role-badge" />)
    expect(screen.getByTestId('role-badge').props.accessibilityLabel).toBe('roles.staff_badge')
  })
})
