/**
 * nav.config unit tests (Bottom Navigation Feature)
 * Pure functions — no RN environment needed.
 * Covers: getTabsForRole (owner/staff/null), getMoreSections (owner/staff),
 * coming-soon vs enabled rows.
 */

import { getTabsForRole, getMoreSections } from '../nav.config'
import type { PermissionKey } from '../../../types/roles'

// ============================================================================
// getTabsForRole
// ============================================================================

describe('getTabsForRole', () => {
  it('returns 4 tabs for owner role', () => {
    const tabs = getTabsForRole('owner')
    expect(tabs).toHaveLength(4)
    expect(tabs.map((t) => t.name)).toEqual(['home', 'lists', 'customers', 'more'])
  })

  it('returns 3 tabs for staff role', () => {
    const tabs = getTabsForRole('staff')
    expect(tabs).toHaveLength(3)
    expect(tabs.map((t) => t.name)).toEqual(['staff-home', 'my-lists', 'more'])
  })

  it('returns 3 tabs for null (unknown) role — least-privilege fallback', () => {
    const tabs = getTabsForRole(null)
    expect(tabs).toHaveLength(3)
    expect(tabs.map((t) => t.name)).toEqual(['staff-home', 'my-lists', 'more'])
  })

  it('all owner tabs have labelKey and icon', () => {
    const tabs = getTabsForRole('owner')
    for (const tab of tabs) {
      expect(tab.labelKey).toBeTruthy()
      expect(typeof tab.icon).toBe('function')
    }
  })

  it('all staff tabs have labelKey and icon', () => {
    const tabs = getTabsForRole('staff')
    for (const tab of tabs) {
      expect(tab.labelKey).toBeTruthy()
      expect(typeof tab.icon).toBe('function')
    }
  })

  it('owner tabs use correct i18n keys', () => {
    const tabs = getTabsForRole('owner')
    const [home, lists, customers, more] = tabs
    expect(home?.labelKey).toBe('nav.tab.home')
    expect(lists?.labelKey).toBe('nav.tab.lists')
    expect(customers?.labelKey).toBe('nav.tab.customers')
    expect(more?.labelKey).toBe('nav.tab.more')
  })

  it('staff tabs use correct i18n keys', () => {
    const tabs = getTabsForRole('staff')
    const [home, myLists, more] = tabs
    expect(home?.labelKey).toBe('nav.tab.home')
    expect(myLists?.labelKey).toBe('nav.tab.myLists')
    expect(more?.labelKey).toBe('nav.tab.more')
  })
})

// ============================================================================
// getMoreSections — owner
// ============================================================================

describe('getMoreSections — owner', () => {
  const navigateMock = jest.fn()
  const hasPerm = jest.fn((_key: PermissionKey) => true)

  afterEach(() => {
    navigateMock.mockReset()
  })

  function buildSections() {
    return getMoreSections('owner', hasPerm, { navigate: navigateMock })
  }

  it('returns an array of sections', () => {
    const sections = buildSections()
    expect(Array.isArray(sections)).toBe(true)
    expect(sections.length).toBeGreaterThan(0)
  })

  it('business section has staff management, subscription, vendor settings enabled', () => {
    const sections = buildSections()
    const business = sections.find((s) => s.titleKey === 'nav.more.section.business')
    expect(business).toBeDefined()

    const staffMgmt = business!.rows.find((r) => r.testID === 'more-row-staff-management')
    expect(staffMgmt?.onPress).toBeDefined()

    const subscription = business!.rows.find((r) => r.testID === 'more-row-subscription')
    expect(subscription?.onPress).toBeDefined()

    const vendorSettings = business!.rows.find((r) => r.testID === 'more-row-vendor-settings')
    expect(vendorSettings?.onPress).toBeDefined()
  })

  it('business profile is coming soon (no onPress)', () => {
    const sections = buildSections()
    const business = sections.find((s) => s.titleKey === 'nav.more.section.business')
    const profile = business!.rows.find((r) => r.testID === 'more-row-business-profile')
    expect(profile?.onPress).toBeUndefined()
  })

  it('outstanding row is enabled and navigates to /collections', () => {
    const sections = buildSections()
    const collections = sections.find((s) => s.titleKey === 'nav.more.section.collections')
    const outstanding = collections!.rows.find((r) => r.testID === 'more-row-outstanding')
    expect(outstanding?.onPress).toBeDefined()
    outstanding!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/collections')
  })

  it('payments, leaves, pending-invites are coming soon', () => {
    const sections = buildSections()
    const billing = sections.find((s) => s.titleKey === 'nav.more.section.billing')
    const comingSoon = billing!.rows.filter((r) => r.onPress === undefined)
    expect(comingSoon.length).toBe(3)
  })

  it('staff activity navigates to /activity', () => {
    const sections = buildSections()
    const reports = sections.find((s) => s.titleKey === 'nav.more.section.reports')
    const activity = reports!.rows.find((r) => r.testID === 'more-row-staff-activity')
    activity!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/activity')
  })

  it('conflict log navigates to /activity/conflicts', () => {
    const sections = buildSections()
    const reports = sections.find((s) => s.titleKey === 'nav.more.section.reports')
    const conflicts = reports!.rows.find((r) => r.testID === 'more-row-conflict-log')
    conflicts!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/activity/conflicts')
  })

  it('monthly summary is coming soon', () => {
    const sections = buildSections()
    const reports = sections.find((s) => s.titleKey === 'nav.more.section.reports')
    const monthly = reports!.rows.find((r) => r.testID === 'more-row-monthly-summary')
    expect(monthly?.onPress).toBeUndefined()
  })

  it('notifications navigates to /settings/notifications', () => {
    const sections = buildSections()
    const account = sections.find((s) => s.titleKey === 'nav.more.section.account')
    const notifs = account!.rows.find((r) => r.testID === 'more-row-notifications')
    notifs!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/settings/notifications')
  })

  it('change-password is coming soon but language-settings is wired (US-013)', () => {
    const sections = buildSections()
    const account = sections.find((s) => s.titleKey === 'nav.more.section.account')
    const changePwd = account!.rows.find((r) => r.testID === 'more-row-change-password')
    const lang = account!.rows.find((r) => r.testID === 'more-row-language-settings')
    expect(changePwd?.onPress).toBeUndefined()
    // Language Settings is now live — onPress navigates to /(app)/settings/language
    expect(lang?.onPress).toBeDefined()
    lang!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/settings/language')
  })

  it('help and contact-support are coming soon', () => {
    const sections = buildSections()
    const support = sections.find((s) => s.titleKey === 'nav.more.section.support')
    const help = support!.rows.find((r) => r.testID === 'more-row-help-faq')
    const contact = support!.rows.find((r) => r.testID === 'more-row-contact-support')
    expect(help?.onPress).toBeUndefined()
    expect(contact?.onPress).toBeUndefined()
  })

  it('staff management navigates to /staff', () => {
    const sections = buildSections()
    const business = sections.find((s) => s.titleKey === 'nav.more.section.business')
    const staffMgmt = business!.rows.find((r) => r.testID === 'more-row-staff-management')
    staffMgmt!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/staff')
  })

  it('subscription navigates to /subscription', () => {
    const sections = buildSections()
    const business = sections.find((s) => s.titleKey === 'nav.more.section.business')
    const sub = business!.rows.find((r) => r.testID === 'more-row-subscription')
    sub!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/subscription')
  })

  it('vendor settings navigates to /settings', () => {
    const sections = buildSections()
    const business = sections.find((s) => s.titleKey === 'nav.more.section.business')
    const settings = business!.rows.find((r) => r.testID === 'more-row-vendor-settings')
    settings!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/settings')
  })
})

// ============================================================================
// getMoreSections — staff
// ============================================================================

describe('getMoreSections — staff', () => {
  const navigateMock = jest.fn()
  const hasPerm = jest.fn((_key: PermissionKey) => false)

  afterEach(() => {
    navigateMock.mockReset()
  })

  function buildSections() {
    return getMoreSections('staff', hasPerm, { navigate: navigateMock })
  }

  it('returns sections for staff role', () => {
    const sections = buildSections()
    expect(sections.length).toBeGreaterThan(0)
  })

  it("today's leaves navigates to /deliveries/mark-leave (OQ-2)", () => {
    const sections = buildSections()
    const today = sections.find((s) => s.titleKey === 'nav.more.section.today')
    const leaves = today!.rows.find((r) => r.testID === 'more-row-todays-leaves')
    expect(leaves?.onPress).toBeDefined()
    leaves!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/deliveries/mark-leave')
  })

  it('my delivery history navigates to /activity/my-activity', () => {
    const sections = buildSections()
    const today = sections.find((s) => s.titleKey === 'nav.more.section.today')
    const history = today!.rows.find((r) => r.testID === 'more-row-my-delivery-history')
    expect(history?.onPress).toBeDefined()
    history!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/activity/my-activity')
  })

  it('notifications navigates to /settings/notifications', () => {
    const sections = buildSections()
    const account = sections.find((s) => s.titleKey === 'nav.more.section.account')
    const notifs = account!.rows.find((r) => r.testID === 'more-row-notifications')
    notifs!.onPress!()
    expect(navigateMock).toHaveBeenCalledWith('/(app)/settings/notifications')
  })

  it('change-password is coming soon', () => {
    const sections = buildSections()
    const account = sections.find((s) => s.titleKey === 'nav.more.section.account')
    const changePwd = account!.rows.find((r) => r.testID === 'more-row-change-password')
    expect(changePwd?.onPress).toBeUndefined()
  })

  it('help-faq and contact-owner are coming soon', () => {
    const sections = buildSections()
    const support = sections.find((s) => s.titleKey === 'nav.more.section.support')
    const help = support!.rows.find((r) => r.testID === 'more-row-help-faq')
    const owner = support!.rows.find((r) => r.testID === 'more-row-contact-owner')
    expect(help?.onPress).toBeUndefined()
    expect(owner?.onPress).toBeUndefined()
  })

  it('null role returns staff sections (least-privilege)', () => {
    const nullHasPerm = (_key: PermissionKey) => false
    const sections = getMoreSections(null, nullHasPerm, { navigate: navigateMock })
    const today = sections.find((s) => s.titleKey === 'nav.more.section.today')
    expect(today).toBeDefined()
  })
})
