/**
 * Navigation Config — Pure Helpers (Bottom Navigation Feature)
 * Purpose: Role-aware tab set and More-menu section definitions.
 *
 * These are pure functions with no React, no side effects, no imports of
 * stores or services. They return plain data structures keyed to contracts
 * frozen by the Architect. Unit-testable without any RN environment.
 */

import type React from 'react'
import { HomeIcon, ListsIcon, CustomersIcon, MyListsIcon, MoreIcon } from './icons'
import type { PermissionKey } from '../../types/roles'

// ============================================================================
// TYPES — frozen contracts consumed by WS-1 and WS-2
// ============================================================================

export interface TabItem {
  /** Route name within the (tabs) group */
  name: string
  /** i18n key, e.g. 'nav.tab.home' */
  labelKey: string
  /** Icon renderer for active/inactive state */
  icon: (active: boolean) => React.ReactNode
  /** Optional badge count (v1 unused but slot reserved) */
  badgeCount?: number
}

export interface MoreMenuRow {
  labelKey: string
  descriptionKey?: string
  icon?: React.ReactNode
  /** undefined means "coming soon" — rendered disabled */
  onPress?: () => void
  testID: string
}

export interface MoreMenuSection {
  titleKey: string
  rows: MoreMenuRow[]
}

/** Handlers passed by the screen to generate the More menu config */
export interface MoreMenuHandlers {
  navigate: (href: string) => void
}

// ============================================================================
// getTabsForRole — returns role-filtered tab definitions
// Owner → 4 tabs: home, lists, customers, more
// Staff / null → 3 tabs: staff-home, my-lists, more
// ============================================================================

export function getTabsForRole(role: 'owner' | 'staff' | null): TabItem[] {
  if (role === 'owner') {
    return [
      { name: 'home', labelKey: 'nav.tab.home', icon: HomeIcon },
      { name: 'lists', labelKey: 'nav.tab.lists', icon: ListsIcon },
      { name: 'customers', labelKey: 'nav.tab.customers', icon: CustomersIcon },
      { name: 'more', labelKey: 'nav.tab.more', icon: MoreIcon },
    ]
  }

  // Staff or unknown role → least-privilege set
  return [
    { name: 'staff-home', labelKey: 'nav.tab.home', icon: HomeIcon },
    { name: 'my-lists', labelKey: 'nav.tab.myLists', icon: MyListsIcon },
    { name: 'more', labelKey: 'nav.tab.more', icon: MoreIcon },
  ]
}

// ============================================================================
// getMoreSections — returns More-menu sections for the given role
// onPress is set only for v1-enabled rows; undefined = "coming soon" row
// ============================================================================

export function getMoreSections(
  role: 'owner' | 'staff' | null,
  _hasPermission: (key: PermissionKey) => boolean,
  handlers: MoreMenuHandlers,
): MoreMenuSection[] {
  if (role === 'owner') {
    return getOwnerMoreSections(handlers)
  }
  return getStaffMoreSections(handlers)
}

function getOwnerMoreSections(handlers: MoreMenuHandlers): MoreMenuSection[] {
  return [
    {
      titleKey: 'nav.more.section.business',
      rows: [
        {
          labelKey: 'nav.more.row.businessProfile',
          // Coming soon — no built screen
          onPress: undefined,
          testID: 'more-row-business-profile',
        },
        {
          labelKey: 'nav.more.row.staffManagement',
          onPress: () => handlers.navigate('/(app)/staff'),
          testID: 'more-row-staff-management',
        },
        {
          labelKey: 'nav.more.row.subscription',
          onPress: () => handlers.navigate('/(app)/subscription'),
          testID: 'more-row-subscription',
        },
        {
          labelKey: 'nav.more.row.vendorSettings',
          onPress: () => handlers.navigate('/(app)/settings'),
          testID: 'more-row-vendor-settings',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.growth',
      rows: [
        {
          labelKey: 'nav.more.row.referralDashboard',
          onPress: () => handlers.navigate('/(app)/referrals/dashboard'),
          testID: 'more-row-referral-dashboard',
        },
        {
          labelKey: 'nav.more.row.referVendor',
          onPress: () => handlers.navigate('/(app)/referrals/refer-vendor'),
          testID: 'more-row-refer-vendor',
        },
        {
          labelKey: 'nav.more.row.inviteCustomers',
          onPress: () => handlers.navigate('/(app)/referrals/invite-customers'),
          testID: 'more-row-invite-customers',
        },
        {
          labelKey: 'nav.more.row.nearbyVendors',
          onPress: () => handlers.navigate('/(app)/referrals/nearby-vendors'),
          testID: 'more-row-nearby-vendors',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.collections',
      rows: [
        {
          labelKey: 'nav.more.row.outstanding',
          onPress: () => handlers.navigate('/(app)/collections'),
          testID: 'more-row-outstanding',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.billing',
      rows: [
        {
          labelKey: 'nav.more.row.payments',
          onPress: undefined,
          testID: 'more-row-payments',
        },
        {
          labelKey: 'nav.more.row.leaves',
          onPress: undefined,
          testID: 'more-row-leaves',
        },
        {
          labelKey: 'nav.more.row.pendingInvites',
          onPress: undefined,
          testID: 'more-row-pending-invites',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.reports',
      rows: [
        {
          labelKey: 'nav.more.row.staffActivity',
          onPress: () => handlers.navigate('/(app)/activity'),
          testID: 'more-row-staff-activity',
        },
        {
          labelKey: 'nav.more.row.conflictLog',
          onPress: () => handlers.navigate('/(app)/activity/conflicts'),
          testID: 'more-row-conflict-log',
        },
        {
          labelKey: 'nav.more.row.monthlySummary',
          onPress: undefined,
          testID: 'more-row-monthly-summary',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.account',
      rows: [
        {
          labelKey: 'nav.more.row.changePassword',
          onPress: undefined,
          testID: 'more-row-change-password',
        },
        {
          labelKey: 'nav.more.row.notifications',
          onPress: () => handlers.navigate('/(app)/settings/notifications'),
          testID: 'more-row-notifications',
        },
        {
          labelKey: 'nav.more.row.languageSettings',
          onPress: () => handlers.navigate('/(app)/settings/language'),
          testID: 'more-row-language-settings',
        },
        {
          labelKey: 'nav.more.row.messageTemplates',
          onPress: () => handlers.navigate('/(app)/settings/message-templates'),
          testID: 'more-row-message-templates',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.support',
      rows: [
        {
          labelKey: 'nav.more.row.helpFaq',
          onPress: undefined,
          testID: 'more-row-help-faq',
        },
        {
          labelKey: 'nav.more.row.contactSupport',
          onPress: undefined,
          testID: 'more-row-contact-support',
        },
      ],
    },
  ]
}

function getStaffMoreSections(handlers: MoreMenuHandlers): MoreMenuSection[] {
  return [
    {
      titleKey: 'nav.more.section.today',
      rows: [
        {
          labelKey: 'nav.more.row.todaysLeaves',
          onPress: () => handlers.navigate('/(app)/deliveries/mark-leave'),
          testID: 'more-row-todays-leaves',
        },
        {
          labelKey: 'nav.more.row.myDeliveryHistory',
          onPress: () => handlers.navigate('/(app)/activity/my-activity'),
          testID: 'more-row-my-delivery-history',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.account',
      rows: [
        {
          labelKey: 'nav.more.row.changePassword',
          onPress: undefined,
          testID: 'more-row-change-password',
        },
        {
          labelKey: 'nav.more.row.notifications',
          onPress: () => handlers.navigate('/(app)/settings/notifications'),
          testID: 'more-row-notifications',
        },
        {
          labelKey: 'nav.more.row.languageSettings',
          onPress: () => handlers.navigate('/(app)/settings/language'),
          testID: 'more-row-language-settings',
        },
      ],
    },
    {
      titleKey: 'nav.more.section.support',
      rows: [
        {
          labelKey: 'nav.more.row.helpFaq',
          onPress: undefined,
          testID: 'more-row-help-faq',
        },
        {
          labelKey: 'nav.more.row.contactOwner',
          onPress: undefined,
          testID: 'more-row-contact-owner',
        },
      ],
    },
  ]
}
