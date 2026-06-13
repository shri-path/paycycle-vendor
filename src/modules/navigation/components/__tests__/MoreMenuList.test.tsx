/**
 * MoreMenuList component tests (Bottom Navigation Feature)
 * Covers: renders sections + rows, enabled rows are tappable, disabled rows show
 * coming-soon caption and are not tappable, logout button calls onLogout.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MoreMenuList } from '../MoreMenuList'
import { t } from '@locales/index'
import type { MoreMenuSection } from '../../nav.config'

const onLogout = jest.fn()
const ENABLED_PRESS = jest.fn()

const sections: MoreMenuSection[] = [
  {
    titleKey: 'nav.more.section.business',
    rows: [
      {
        labelKey: 'nav.more.row.staffManagement',
        onPress: ENABLED_PRESS,
        testID: 'more-row-staff-management',
      },
      {
        labelKey: 'nav.more.row.businessProfile',
        onPress: undefined,
        testID: 'more-row-business-profile',
      },
    ],
  },
]

describe('MoreMenuList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders section titles', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    expect(await screen.findByText(t('nav.more.section.business'))).toBeTruthy()
  })

  it('renders row labels', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    expect(await screen.findByText(t('nav.more.row.staffManagement'))).toBeTruthy()
    expect(await screen.findByText(t('nav.more.row.businessProfile'))).toBeTruthy()
  })

  it('enabled row calls onPress when tapped', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    fireEvent.press(await screen.findByTestId('more-row-staff-management'))
    expect(ENABLED_PRESS).toHaveBeenCalledTimes(1)
  })

  it('disabled row shows coming-soon caption', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    expect(await screen.findByText(t('nav.comingSoon'))).toBeTruthy()
  })

  it('disabled row is marked as disabled in accessibility state', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    const disabledRow = await screen.findByTestId('more-row-business-profile')
    expect(disabledRow.props.accessibilityState?.disabled).toBe(true)
  })

  it('enabled row is NOT disabled in accessibility state', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    const enabledRow = await screen.findByTestId('more-row-staff-management')
    expect(enabledRow.props.accessibilityState?.disabled).toBe(false)
  })

  it('renders the LOG OUT button', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    expect(await screen.findByTestId('more-logout-button')).toBeTruthy()
  })

  it('LOG OUT button calls onLogout', async () => {
    const screen = await render(<MoreMenuList sections={sections} onLogout={onLogout} />)
    fireEvent.press(await screen.findByTestId('more-logout-button'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('renders multiple sections', async () => {
    const multiSections: MoreMenuSection[] = [
      {
        titleKey: 'nav.more.section.business',
        rows: [{ labelKey: 'nav.more.row.subscription', onPress: jest.fn(), testID: 'row-a' }],
      },
      {
        titleKey: 'nav.more.section.account',
        rows: [{ labelKey: 'nav.more.row.notifications', onPress: jest.fn(), testID: 'row-b' }],
      },
    ]
    const screen = await render(<MoreMenuList sections={multiSections} onLogout={onLogout} />)
    expect(await screen.findByText(t('nav.more.section.business'))).toBeTruthy()
    expect(await screen.findByText(t('nav.more.section.account'))).toBeTruthy()
  })

  it('renders empty sections without error', async () => {
    const screen = await render(<MoreMenuList sections={[]} onLogout={onLogout} />)
    expect(await screen.findByTestId('more-logout-button')).toBeTruthy()
  })
})
