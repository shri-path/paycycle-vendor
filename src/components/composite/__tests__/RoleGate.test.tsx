/**
 * RoleGate Tests (WS-0)
 * Purpose: verify the gate renders children only when the role/permission/list
 * condition is met, and renders the fallback (default null) otherwise.
 *
 * The role hook is mocked so the gate is tested in isolation from the store.
 */

import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { RoleGate } from '../RoleGate'
import type { PermissionKey } from '../../../types/roles'

const mockUseRole = jest.fn()

jest.mock('@modules/roles/hooks/useRole', () => ({
  useRole: () => mockUseRole(),
}))

interface RoleHookValue {
  isOwner: boolean
  hasPermission: (key: PermissionKey) => boolean
  canAccessList: (listId: string) => boolean
}

function setRole(value: Partial<RoleHookValue>): void {
  mockUseRole.mockReturnValue({
    isOwner: false,
    hasPermission: () => false,
    canAccessList: () => false,
    ...value,
  })
}

const Child = () => <Text testID="gated">visible</Text>
const Fallback = () => <Text testID="fallback">blocked</Text>

describe('RoleGate', () => {
  beforeEach(() => mockUseRole.mockReset())

  it('renders children for owner when require="owner"', async () => {
    setRole({ isOwner: true })
    const screen = await render(
      <RoleGate require="owner">
        <Child />
      </RoleGate>,
    )
    expect(screen.queryByTestId('gated')).toBeTruthy()
  })

  it('hides children for non-owner when require="owner" (default fallback null)', async () => {
    setRole({ isOwner: false })
    const screen = await render(
      <RoleGate require="owner">
        <Child />
      </RoleGate>,
    )
    expect(screen.queryByTestId('gated')).toBeNull()
  })

  it('renders the fallback when the condition is not met', async () => {
    setRole({ isOwner: false })
    const screen = await render(
      <RoleGate require="owner" fallback={<Fallback />}>
        <Child />
      </RoleGate>,
    )
    expect(screen.queryByTestId('gated')).toBeNull()
    expect(screen.queryByTestId('fallback')).toBeTruthy()
  })

  it('gates on a specific permission', async () => {
    setRole({ hasPermission: (k) => k === 'mark_deliveries' })
    const allowed = await render(
      <RoleGate permission="mark_deliveries">
        <Child />
      </RoleGate>,
    )
    expect(allowed.queryByTestId('gated')).toBeTruthy()

    const denied = await render(
      <RoleGate permission="add_extra_charges">
        <Child />
      </RoleGate>,
    )
    expect(denied.queryByTestId('gated')).toBeNull()
  })

  it('gates on list access', async () => {
    setRole({ canAccessList: (id) => id === 'list-1' })
    const allowed = await render(
      <RoleGate listId="list-1">
        <Child />
      </RoleGate>,
    )
    expect(allowed.queryByTestId('gated')).toBeTruthy()

    const denied = await render(
      <RoleGate listId="list-2">
        <Child />
      </RoleGate>,
    )
    expect(denied.queryByTestId('gated')).toBeNull()
  })
})
