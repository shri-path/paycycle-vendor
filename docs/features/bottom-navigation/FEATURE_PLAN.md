# Feature: Bottom Navigation (Tab Bar) + End-to-End Menu Actions

## Overview

This feature introduces the **persistent bottom navigation bar** (tab bar) that has been
missing from the app, plus the **More menu** hub screens it links to, wiring every
bottom-menu destination end to end. Today `app/(app)/_layout.tsx` is a plain `Stack`
with no tab bar; `index.tsx` redirects owner → `/(app)/home` and staff → `/(app)/staff-home`,
and individual screens navigate via ad-hoc `router.push`. There is **no shared primary
navigation chrome and no More menu**.

This is a **pure client-side navigation shell** — there is **no backend feature/endpoint**
for navigation itself. Each tab/menu item routes to screens that, for the most part,
already exist (see "Reuse Inventory"). The deliverable is: the tab-bar shell, role-aware
tab sets, the two More-menu hub screens, a handful of thin "hub" landing screens for
menu groups that currently have no single entry route, and the wiring + i18n + states
for all of it.

### Scope decisions (driven strictly by wireframes 16 & 18 and 11)

- **v1 ships exactly the wireframe menus.** Owner tabs: `Home, Lists, Customers, More`.
  Staff tabs: `Home, My Lists, More`.
- **Referrals, Collections-as-a-More-group, and Language Settings are marked v2** in
  wireframe 18 ("NEW" / "(v2)"). Per "do not invent flows", v1 wires only items that have
  a wireframe screen AND an implemented destination. Items that are v2 or have no built
  screen are rendered as **disabled "Coming soon" rows** (visible, non-tappable, captioned)
  so the menu matches the wireframe structure without dead navigation. See Open Questions OQ-1.

---

## User Story Reference

No dedicated user story exists for navigation (it is cross-cutting infrastructure).
Authoritative sources:

- **Wireframe 18** (`wireframes/18-navigation.md`) — owner & staff nav bars, More menu structure, screen-flow diagram.
- **Wireframe 11** (`wireframes/11-more-menu-profile.md`) — Owner More menu §2.26, Business Profile §2.27, Invite Customer §2.28.
- **Wireframe 16** (`wireframes/16-staff-screens.md`) — Staff More menu §3.11, staff dashboard/tab indicators.
- **Feature 02** (`features/02-roles-access.md`) — owner vs staff visibility (financial data owner-only).

---

## Reuse Inventory (existing vs new) — Fresh Start policy

### Existing destinations — REUSE AS-IS (route already present)

| Menu item | Role | Existing route | Notes |
|---|---|---|---|
| Home (Dashboard) | Owner | `/(app)/home` | `OwnerDashboardScreen` |
| Home | Staff | `/(app)/staff-home` | `StaffDashboardScreen` |
| Lists | Owner | `/(app)/supply-lists` | `SupplyListsScreen` |
| My Lists | Staff | `/(app)/my-lists` | `StaffSupplyListsScreen` |
| Customers | Owner | `/(app)/customers` | `CustomersScreen` |
| Staff Management | Owner | `/(app)/staff` | exists |
| Subscription | Owner | `/(app)/subscription` | exists |
| Vendor Settings | Owner | `/(app)/settings` | exists |
| Notifications | Both | `/(app)/settings/notifications` | exists |
| Collections / Outstanding | Owner | `/(app)/collections` | exists |
| Staff Activity (Reports) | Owner | `/(app)/activity` | exists |
| Conflict Log (Reports) | Owner | `/(app)/activity/conflicts` | exists |
| My Delivery History | Staff | `/(app)/activity/my-activity` | exists |
| Today's Leaves (staff) | Staff | `/(app)/deliveries/mark-leave` | reuse as leave entry (see OQ-2) |

### Existing infra — REUSE AS-IS

- `AppMenuItem` (composite) — exact row component for More menu (label, icon, description, arrow, divider, a11y already done).
- `AppListItem`, `AppHeader`, `AppSection`, `AppEmptyState`, `ScreenErrorBoundary`.
- `useRole()` / `RoleGate` — role gating; `isOwner`/`isStaff`/`hasPermission`.
- `useAuthStore().logout()` — already wipes ALL local stores + SecureStore (multi-tenant safe). Reuse for the LOG OUT row.
- `appStore` (`isOnline`, `isSyncing`) — for the tab-bar/More offline + sync indicators.
- i18n: locale files have top-level groups already; add a new `nav` group.

### NEW — must be built

| New artifact | Why |
|---|---|
| `app/(app)/(tabs)/_layout.tsx` | The tab-bar shell (role-aware `Tabs`). **Does not exist.** |
| `AppTabBar` (custom tab bar component) | WhatsApp-style bar, 44×44 targets, active indicator, i18n labels, badge slot. Expo Router's default tab bar is acceptable only if it meets a11y + token rules; we ship a custom `tabBar` renderer to guarantee them. |
| `MoreMenuScreen` (owner) | Wireframe §2.26 — no screen exists. |
| `StaffMoreMenuScreen` | Wireframe §3.11 — no screen exists. |
| Thin route files under `(tabs)/` | Re-export existing screens into the tab group. |
| `nav` locale keys (9 langs) | Tab labels + More section/row labels + "coming soon". |
| Tab icons | Vector icons for Home/Lists/Customers/More/My Lists. |

### NOT in v1 (rendered as disabled "Coming soon" rows to match wireframe) — see OQ-1

Business Profile (§2.27 wireframe exists, but no screen/route built), Payments hub,
Leaves hub (owner), Pending Invites, Monthly Summary, Change Password, Referrals (all),
Language Settings (v2), Help & FAQ, Contact Support/Owner. These appear in the wireframe
More menu but have **no implemented destination**; building them is each its own story.

---

## Screen Flow (max 2 taps to any primary action)

```
                     /(app)/index  (role router — existing)
                            │
            owner ──────────┴────────── staff
              │                            │
   /(app)/(tabs)  [owner tab set]   /(app)/(tabs) [staff tab set]
   ┌─────┬──────┬──────────┬─────┐   ┌──────┬──────────┬──────┐
  Home  Lists Customers  More    Home  My Lists      More
   │     │      │          │       │      │            │
 (dash)(lists)(custs)  MoreMenu  (dash)(myLists)  StaffMoreMenu
                          │                            │
                  group rows → existing routes  group rows → existing routes
```

- **Every tab destination = 1 tap.** Every More row = 2 taps (More → row). Meets the rule.
- Tab bar is **persistent** across the 3–4 top-level destinations. Detail screens
  (e.g. `customers/[id]`) are pushed **above** the tab group (tab bar hidden on push),
  matching WhatsApp (list has bar, conversation does not).

### Entry points from existing screens

- `/(app)/index` redirect targets change from `/(app)/home` → `/(app)/(tabs)/home`
  and `/(app)/staff-home` → `/(app)/(tabs)/staff-home`. (The legacy flat routes are
  **kept** as thin redirects to avoid breaking existing tests/deep links — see Task list.)

---

## Screen Specifications

### A. Tab Bar Shell — `app/(app)/(tabs)/_layout.tsx` + `AppTabBar`

- **Layout**: Expo Router `<Tabs>` with a custom `tabBar={(props) => <AppTabBar .../>}`.
  Bar anchored to bottom, respects `useSafeAreaInsets().bottom`. Height 56 + inset.
- **Role-aware tab set**: read `useRole()`. Owner → 4 tabs; staff → 3 tabs. Render the
  `<Tabs.Screen>` set conditionally. Unknown/loading role → render staff set (least-privilege,
  matches `index.tsx` default).
- **Each tab**: icon (24) + label (caption). Active = Primary `#075E54` (icon+label+2px top
  indicator); inactive = `textSecondary`. Color is never the only signal — active tab also
  shows the filled icon variant + bold label.
- **Touch target**: each tab ≥ 44×44 (full bar height + equal flex width). `hitSlop` not
  needed (targets already large).
- **States**:
  - *Loading*: while role unresolved, show the bar skeleton (4 greyed slots) — never block.
  - *Empty/Error/Populated*: N/A for the bar itself; each tab screen owns its own 5 states.
  - *Offline*: when `appStore.isOnline === false`, show a thin **offline strip** directly
    above the bar (text + cloud-off icon, `t('nav.offline')`). When `isSyncing`, show
    "Syncing…" with a small spinner. (Reuses appStore; no new state.)
- **Interactions**: tap = switch tab (haptic `selection`). Re-tap active Home tab = scroll
  to top / no-op (v1: no-op). No long-press/swipe on the bar.
- **Animation**: active-indicator slide via `react-native-reanimated` (`withTiming` 150ms,
  ease-out). Icon active/inactive crossfade 120ms. Respect reduce-motion.
- **Haptics**: `Haptics.selectionAsync()` on tab change.

### B. Owner More Menu — `MoreMenuScreen` (`/(app)/(tabs)/more`)

- **Layout**: `AppHeader` title `t('nav.more.title')` (no back — it is a tab root) →
  `ScrollView` of `AppSection` groups, each containing `AppMenuItem` rows → `LOG OUT` button.
- **Groups & rows** (per wireframe §2.26 + §18, with v1 gating):

  | Section (`nav.more.section.*`) | Row | Destination (v1) |
  |---|---|---|
  | business | Business Profile | **disabled (coming soon)** |
  | business | Staff Management | `/(app)/staff` |
  | business | Subscription | `/(app)/subscription` |
  | business | Vendor Settings | `/(app)/settings` |
  | collections | Outstanding & Collections | `/(app)/collections` |
  | billing | Payments | **disabled** |
  | billing | Leaves | **disabled** |
  | billing | Pending Invites | **disabled** |
  | reports | Staff Activity | `/(app)/activity` |
  | reports | Conflict Log | `/(app)/activity/conflicts` |
  | reports | Monthly Summary | **disabled** |
  | account | Change Password | **disabled** |
  | account | Notifications | `/(app)/settings/notifications` |
  | account | Language Settings | **disabled (v2)** |
  | support | Help & FAQ | **disabled** |
  | support | Contact Support | **disabled** |

- **LOG OUT**: `AppButton variant="danger"`. Tap → `AppConfirmDialog`
  (`t('nav.logout.confirmTitle/Body/confirm/cancel')`) → on confirm call
  `useAuthStore().logout()` then `router.replace('/(auth)/login')`. Haptic `warning` on open,
  `success` on completion.
- **States**: Loading (skeleton rows while role resolving — but owner reaches here only
  when role known, so minimal); Empty N/A (static menu); Error → `ScreenErrorBoundary`
  catches render errors, shows retry; Populated = the menu; Offline → menu still fully
  usable (all navigation is local); LOG OUT works offline (local wipe always succeeds, server
  call is best-effort per existing store logic). Show the same offline strip above the tab bar.
- **Interactions**: tap row → `router.push(dest)` (haptic `selection`). Disabled rows: no
  press, `accessibilityState.disabled = true`, caption `t('nav.comingSoon')`.

### C. Staff More Menu — `StaffMoreMenuScreen` (`/(app)/(tabs)/more` for staff)

Per wireframe §3.11. Same structure, staff rows:

| Section | Row | Destination (v1) |
|---|---|---|
| today | Today's Leaves | `/(app)/deliveries/mark-leave` (see OQ-2) |
| today | My Delivery History | `/(app)/activity/my-activity` |
| account | Change Password | **disabled** |
| account | Notifications | `/(app)/settings/notifications` |
| support | Help & FAQ | **disabled** |
| support | Contact Owner | **disabled** |

LOG OUT identical to owner.

> One `more` route renders owner-vs-staff menu by `useRole()` (single tab screen, branches
> internally) — avoids a second tab file and keeps the tab set declaration simple.

---

## Component Requirements

### New: `AppTabBar` (`src/components/layout/AppTabBar.tsx`)

```ts
export interface TabItem {
  name: string            // route name within (tabs)
  labelKey: string        // i18n key, e.g. 'nav.tab.home'
  icon: (active: boolean) => React.ReactNode
  badgeCount?: number     // optional, reserved (v1 unused)
}
export interface AppTabBarProps {
  state: import('@react-navigation/native').TabNavigationState<any>
  navigation: any         // BottomTabBarProps['navigation']
  items: TabItem[]        // already role-filtered by the layout
  isOnline: boolean
  isSyncing: boolean
}
```

- Presentational only; receives role-filtered `items` from the layout. No business logic.
- Tokens only; no hardcoded hex/px. Active color `colors.primary`.

### New: `MoreMenuList` (shared presentational, `src/modules/navigation/components/MoreMenuList.tsx`)

```ts
export interface MoreMenuRow {
  labelKey: string
  descriptionKey?: string
  icon?: React.ReactNode
  onPress?: () => void     // undefined ⇒ rendered disabled "coming soon"
  testID: string
}
export interface MoreMenuSection { titleKey: string; rows: MoreMenuRow[] }
export interface MoreMenuListProps { sections: MoreMenuSection[]; onLogout: () => void }
```

Both owner & staff More screens compose this with their own section arrays (DRY).

### Modifications to existing components

- **None required.** `AppMenuItem`, `AppConfirmDialog`, `AppButton`, `AppSection`,
  `AppHeader` are reused unchanged. (If `AppMenuItem` needs a `disabled` "coming soon"
  caption, it already supports `disabled` + `description` — no change.)

---

## State Management

- **No new Zustand slice.** The tab set is **derived** from `useRole()`. Offline/sync
  indicators read existing `appStore.isOnline` / `appStore.isSyncing`. Active tab is
  navigation state owned by Expo Router.
- **Selectors**: `useRole()` (existing). Use `useShallow` where reading multiple appStore fields.
- A tiny pure helper `getTabsForRole(role)` and `getMoreSections(role, perms, handlers)`
  live in `src/modules/navigation/nav.config.ts` (pure functions, unit-testable, no React).

---

## API Integration

- **None for the shell.** Navigation is entirely client-side. No `API_SPEC.md` exists for
  this feature and none is needed — confirmed: backend feature dirs contain no `navigation`/
  `bottom-nav` slug.
- The **LOG OUT** action delegates to the existing `authService.logout()` (already
  implemented + spec'd under `paycycle_api/docs/features/authentication`). We do **not**
  re-spec it; we call `useAuthStore().logout()`. Errors there are already logged with
  `correlationId` via the shared logger inside the store.
- Each tab destination performs its own API calls (already implemented in its module).

### Error handling

- Each tab screen is wrapped by `ScreenErrorBoundary` (existing) so a render error in one
  tab never crashes the bar or other tabs.
- The only action this feature adds (logout) routes failures through the existing logger
  (`{ screen: 'More', action: 'logout' }`). No new error paths.

---

## Offline Behavior

- **Everything in this feature works fully offline** — navigation and the More menu are
  local. This is the strongest possible offline guarantee (no network dependency).
- **Tab switching**: instant, offline-safe.
- **Offline indicator**: thin strip above the tab bar driven by `appStore.isOnline`
  (`t('nav.offline')`); `t('nav.syncing')` when `isSyncing`. This is the consistent
  app-wide sync-status surface the design system asks for (read-receipt-style assurance).
- **LOG OUT offline**: local wipe always runs; the server revoke is best-effort and its
  failure is swallowed + logged (existing store behavior). User is still logged out and
  redirected. No queue needed.
- **Conflict resolution**: N/A (no mutations).

---

## Localization

New top-level locale group **`nav`** added to all 9 files (en, hi, ta, te, mr, bn, kn, ml, gu):

```
nav.tab.home, nav.tab.lists, nav.tab.customers, nav.tab.more, nav.tab.myLists
nav.more.title
nav.more.section.business, .collections, .billing, .reports, .account, .support, .today
nav.more.row.businessProfile, .staffManagement, .subscription, .vendorSettings,
  .outstanding, .payments, .leaves, .pendingInvites, .staffActivity, .conflictLog,
  .monthlySummary, .changePassword, .notifications, .languageSettings, .helpFaq,
  .contactSupport, .contactOwner, .todaysLeaves, .myDeliveryHistory
nav.comingSoon            // caption on disabled rows
nav.logout.button, .confirmTitle, .confirmBody, .confirm, .cancel
nav.offline, nav.syncing
```

- **Text expansion**: tab labels can grow ~+35% in some scripts (e.g. Tamil/Malayalam).
  Tab labels must allow 2 lines max OR ellipsize at 1 line with a wider hit area — spec:
  single line, `numberOfLines={1}` + `adjustsFontSizeToFit` down to caption-1. Icons carry
  primary meaning so a truncated label is still usable (recognition).
- **RTL**: project ships no RTL language in v1, but use `start`/`end` and logical layout in
  `AppTabBar`/`MoreMenuList` (no `left`/`right`) so RTL is free later.
- Locale-aware: no numbers/dates in this feature.

---

## Performance Considerations

- **No FlatList needed** — More menu is a short static `ScrollView` (< 20 rows). Tab bar is
  3–4 items. Memory budget trivial (< a few KB of view tree).
- **Lazy tab screens**: Expo Router `<Tabs>` mounts tab screens lazily by default; keep
  `lazy` behavior so non-active tabs don't mount until visited (important on 2GB devices —
  Customers list shouldn't load while on Home).
- **`unmountOnBlur`**: do **not** force-unmount tabs globally (loses scroll/state); rely on
  default. Heavy lists inside tabs already paginate in their own modules.
- **Bundle impact**: minimal — vector icons already a dependency; one small layout component,
  two screens, one pure config module.
- **Re-renders**: `AppTabBar` memoized; `items` array memoized in layout via `useMemo` keyed
  on role so it doesn't rebuild every render.

---

## Accessibility

- **Tab bar**: each tab `accessibilityRole="tab"`, `accessibilityState={{ selected }}`,
  `accessibilityLabel = t(labelKey)`. The bar container `accessibilityRole="tablist"`.
- **More rows**: `AppMenuItem` already sets `accessibilityRole="button"` + label; disabled
  rows set `accessibilityState.disabled`.
- **Touch targets**: tabs ≥ 44×44; rows already ≥ 48 tall.
- **Contrast**: active `#075E54` on white = 7.4:1 (passes AA/AAA). Inactive `textSecondary`
  `#667781` on white = 4.6:1 (passes AA). Offline strip text meets ≥ 4.5:1.
- **Color not sole signal**: active tab = color + filled icon + bold + indicator bar.
- **Reduce motion**: gate the indicator-slide / crossfade animations behind
  `AccessibilityInfo.isReduceMotionEnabled`.

---

## Open Questions (for user — recommended option first)

### OQ-1 — How to present wireframe menu rows that have no built screen yet?

Wireframe More menus list rows (Business Profile, Payments, Leaves, Pending Invites, Monthly
Summary, Change Password, Help/FAQ, Contact, plus v2 Referrals/Language) whose destination
screens are **not implemented**. Options:

- **(Recommended) Render them as visible but disabled "Coming soon" rows.** Matches the
  wireframe structure exactly, sets user expectation, zero dead navigation, trivial to flip
  on per future story.
  *Trade-off*: a few greyed rows look slightly unfinished to a stakeholder demo.
- **(B) Hide unbuilt rows entirely.** Cleanest visual; menu only shows working items.
  *Trade-off*: diverges from the approved wireframe; rows silently reappear later, changing
  layout/muscle memory.
- **(C) Build minimal placeholder screens** ("This feature is coming soon" full screen) and
  navigate to them. *Trade-off*: more files/routes/i18n for no real function; extra surface
  to test.

### OQ-2 — Staff "Today's Leaves" destination

Wireframe §3.5 shows a staff **"Leaves in My Lists"** *view* screen, but only a staff
**mark-leave** screen (`/(app)/deliveries/mark-leave`) is implemented; no read-only
"today's leaves" list screen exists.

- **(Recommended) Point "Today's Leaves" at the existing `/(app)/deliveries/mark-leave`
  screen for v1**, since it is the actionable leave entry staff need most, and add the
  read-only leaves list as a follow-up story. *Trade-off*: row label ("Today's Leaves")
  implies a list, not a form — minor expectation mismatch; mitigated by relabeling the row
  to `nav.more.row.markLeave` if you prefer.
- **(B) Mark the row "Coming soon"** until the dedicated leaves-list screen is built.
  *Trade-off*: staff lose a 2-tap path to leave marking that already works.
- **(C) Build the read-only "Leaves in My Lists" screen now.** *Trade-off*: scope creep —
  it is really part of US-006 delivery/leaves, not navigation.

### OQ-3 — Keep or remove the legacy flat home routes?

`/(app)/home` and `/(app)/staff-home` exist and are referenced by tests/other screens.
Moving homes into `(tabs)` means two paths could exist.

- **(Recommended) Keep the flat routes as thin `<Redirect>` to the tab equivalents.** Zero
  breakage for existing deep links / tests, single source of truth lives in `(tabs)`.
  *Trade-off*: two route files per home (small).
- **(B) Move everything and update all references.** Cleaner tree. *Trade-off*: must touch
  every `router.push('/(app)/home')` call site and tests — larger, riskier change for this PR.

> Resolved decisions will be recorded here once the user answers; defaults above are applied
> if the feature proceeds in auto mode.
