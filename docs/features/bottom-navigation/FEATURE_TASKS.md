# Feature Tasks: Bottom Navigation (Tab Bar) + End-to-End Menu Actions

> Pipeline: Architect → Dev → Review → QA. Sub-agents edit ONLY their owned files and never
> commit (the orchestrator integrates). Verify: the union of all "Owned files" has NO overlaps.

## Parallel Workstreams (conflict-free partition)

### Phase 1 — Foundation (run first, single owner)

**WS-0: Foundation / shared**
- **Phase**: 1
- **Owned files**:
  - `src/locales/*.json` (all 9 — add the `nav` group only)
  - `src/components/layout/AppTabBar.tsx`
  - `src/components/index.ts` (add `AppTabBar` export)
  - `src/modules/navigation/nav.config.ts` (pure helpers + types)
  - `src/modules/navigation/icons.tsx` (tab icon set)
  - `src/modules/navigation/components/MoreMenuList.tsx`
  - tests for all the above under each file's `__tests__`
- **Depends on**: —
- **Produces (contracts)** — FROZEN, downstream codes against these:
  - **i18n keys**: the full `nav.*` key set listed in FEATURE_PLAN §Localization. All keys
    present in `en.json` (real strings) and all 8 other locales (translated; never the key).
  - **`getTabsForRole(role: 'owner' | 'staff' | null): TabItem[]`** — returns owner 4-tab set,
    staff/null 3-tab set. `TabItem` shape per FEATURE_PLAN §Component Requirements.
  - **`AppTabBar`** props: `{ state, navigation, items, isOnline, isSyncing }` (see plan).
    Presentational; renders offline/syncing strip; haptic `selectionAsync` on tab press.
  - **`MoreMenuList`** props: `{ sections: MoreMenuSection[]; onLogout: () => void }`
    (`MoreMenuRow`/`MoreMenuSection` shapes per plan). A row with `onPress === undefined`
    renders disabled with `t('nav.comingSoon')` caption.
  - **`getMoreSections(role, hasPermission, handlers)`** — pure: returns the role's
    `MoreMenuSection[]` with `onPress` set only for v1-enabled rows (per plan tables),
    `undefined` for "coming soon" rows. `handlers` = `{ navigate: (href) => void }`.
  - **tab icon components** in `icons.tsx`: `HomeIcon`, `ListsIcon`, `CustomersIcon`,
    `MyListsIcon`, `MoreIcon`, each `(active: boolean) => ReactNode`.
- **Skills**: `localization-i18n.md`, `component-development.md`, `ui-visual-design.md`,
  `accessibility-ux.md`, `animation-haptics.md`, `state-management.md` (pure-selector helpers).

### Phase 2 — Feature workstreams (run in parallel; depend only on WS-0 contracts)

**WS-1: Tab-bar shell + route group + role routing**
- **Phase**: 2
- **Owned files**:
  - `app/(app)/(tabs)/_layout.tsx` (the `Tabs` shell using `AppTabBar` + `getTabsForRole`)
  - `app/(app)/(tabs)/home.tsx` (re-export `OwnerDashboardScreen`)
  - `app/(app)/(tabs)/staff-home.tsx` (re-export `StaffDashboardScreen`)
  - `app/(app)/(tabs)/lists.tsx` (re-export `SupplyListsScreen`)
  - `app/(app)/(tabs)/my-lists.tsx` (re-export `StaffSupplyListsScreen`)
  - `app/(app)/(tabs)/customers.tsx` (re-export `CustomersScreen`)
  - `app/(app)/index.tsx` (update redirect targets to `(tabs)`)
  - `app/(app)/home.tsx`, `app/(app)/staff-home.tsx` (convert to thin `<Redirect>` per OQ-3 default)
- **Depends on**: WS-0 (`AppTabBar`, `getTabsForRole`, icons, `nav.tab.*` keys)
- **Consumes (contracts)**: `getTabsForRole`, `AppTabBar`, `nav.tab.*`
- **Skills**: `navigation-routing.md`, `performance-optimization.md` (lazy tabs), `accessibility-ux.md`

**WS-2: More menu screens (owner + staff) + their routes**
- **Phase**: 2
- **Owned files**:
  - `src/modules/navigation/screens/MoreMenuScreen.tsx`
  - `src/modules/navigation/screens/StaffMoreMenuScreen.tsx`
  - `src/modules/navigation/screens/__tests__/MoreMenuScreen.test.tsx`
  - `src/modules/navigation/screens/__tests__/StaffMoreMenuScreen.test.tsx`
  - `app/(app)/(tabs)/more.tsx` (renders owner-vs-staff menu by `useRole()`)
- **Depends on**: WS-0 (`MoreMenuList`, `getMoreSections`, all `nav.more.*`/`nav.logout.*` keys)
- **Consumes (contracts)**: `MoreMenuList`, `getMoreSections`, `nav.more.*`, `nav.logout.*`,
  `nav.comingSoon`; existing `useAuthStore().logout`, `AppConfirmDialog`, `useRole`.
- **Skills**: `screen-development.md`, `error-handling.md`, `security-auth.md` (logout/wipe),
  `localization-i18n.md`, `animation-haptics.md`

> Verify owned-file disjointness: WS-0 = shared components/locales/config; WS-1 = `app/(app)/(tabs)/*`
> route files + `(app)/index|home|staff-home`; WS-2 = `src/modules/navigation/screens/*` + `(tabs)/more.tsx`.
> `(tabs)/more.tsx` is owned only by WS-2; all other `(tabs)/*.tsx` only by WS-1. No overlap.

---

## Task List (ordered; each maps to a workstream)

### Task 1: Add `nav` i18n keys to all 9 locales _(WS-0)_
- **Files**: `src/locales/en.json` + `hi, ta, te, mr, bn, kn, ml, gu`.json
- Add the complete `nav.*` key set from FEATURE_PLAN §Localization. Real translations in
  every language (no English fallthrough in non-en files).
- **Skills**: `localization-i18n.md`
- **Acceptance**: every key resolves in all 9 files; `t('nav.tab.home')` etc. non-empty;
  keys match the frozen names exactly; no hardcoded strings introduced.

### Task 2: Tab icon set `src/modules/navigation/icons.tsx` _(WS-0)_
- Export `HomeIcon, ListsIcon, CustomersIcon, MyListsIcon, MoreIcon`, each
  `(active: boolean) => ReactNode` using the project's existing vector icon lib; active uses
  filled variant + `colors.primary`, inactive outline + `colors.textSecondary`. Tokens only.
- **Skills**: `ui-visual-design.md`, `accessibility-ux.md`
- **Acceptance**: icons render at 24px; active/inactive visually distinct beyond color
  (filled vs outline); no hardcoded hex.

### Task 3: `nav.config.ts` pure helpers _(WS-0)_
- **File**: `src/modules/navigation/nav.config.ts` (+ `__tests__/nav.config.test.ts`)
- Implement `TabItem`, `MoreMenuRow/Section` types, `getTabsForRole`, `getMoreSections`
  exactly per WS-0 contract. No React, no side effects — pure functions returning data.
- **Skills**: `state-management.md`
- **Acceptance**: unit tests cover owner vs staff vs null; owner gets 4 tabs, staff/null 3;
  `getMoreSections` returns `onPress` only for v1-enabled rows and `undefined` for coming-soon
  rows per the plan tables.

### Task 4: `AppTabBar` component _(WS-0)_
- **Files**: `src/components/layout/AppTabBar.tsx` (+ test), export in `src/components/index.ts`
- Implement per props contract: bottom-anchored, safe-area inset, role-filtered `items`,
  active indicator (reanimated, 150ms, reduce-motion aware), filled/outline icon + bold label,
  offline + syncing strip from `isOnline`/`isSyncing`, `Haptics.selectionAsync()` on press,
  `accessibilityRole` tab/tablist + `selected` state, 44×44 targets, `start`/`end` only.
- **Skills**: `component-development.md`, `animation-haptics.md`, `accessibility-ux.md`, `ui-visual-design.md`
- **Acceptance**: renders 3 or 4 items from props; active tab styled (color+icon+bold+indicator);
  offline strip shows on `isOnline=false`; press calls `navigation.navigate` + haptic; a11y states set.

### Task 5: `MoreMenuList` shared component _(WS-0)_
- **Files**: `src/modules/navigation/components/MoreMenuList.tsx` (+ test)
- Render `AppSection` per section, `AppMenuItem` per row (icon/label/description/arrow), disabled
  rows show `t('nav.comingSoon')` caption + `accessibilityState.disabled`, footer `LOG OUT`
  `AppButton variant="danger"` calling `onLogout`. Tokens only; `t()` for all strings.
- **Skills**: `component-development.md`, `ui-visual-design.md`, `accessibility-ux.md`
- **Acceptance**: enabled rows tappable → `onPress`; disabled rows non-tappable with caption;
  LOG OUT triggers `onLogout`; 5-state-irrelevant static list renders correctly; no hardcoded strings.

### Task 6: Tab route group shell `(tabs)/_layout.tsx` _(WS-1)_
- **File**: `app/(app)/(tabs)/_layout.tsx`
- `<Tabs tabBar={(p) => <AppTabBar {...p} items={items} isOnline={isOnline} isSyncing={isSyncing} />}>`
  with `screenOptions={{ headerShown: false, lazy: true }}`. `items = useMemo(() => getTabsForRole(role), [role])`.
  Declare `<Tabs.Screen>` for the union of routes; hide non-role tabs via `href: null` based on role.
  Read `isOnline/isSyncing` from `appStore` with `useShallow`.
- **Skills**: `navigation-routing.md`, `performance-optimization.md`
- **Acceptance**: owner sees Home/Lists/Customers/More; staff sees Home/My Lists/More; switching
  tabs is instant + lazy-mounts; tab bar persists on these roots, hidden on pushed detail screens.

### Task 7: Tab re-export route files _(WS-1)_
- **Files**: `(tabs)/home.tsx`, `(tabs)/staff-home.tsx`, `(tabs)/lists.tsx`,
  `(tabs)/my-lists.tsx`, `(tabs)/customers.tsx`
- Each is a thin default re-export of the existing module screen (mirror current
  `app/(app)/home.tsx` style). No logic.
- **Skills**: `navigation-routing.md`
- **Acceptance**: each route renders its existing screen unchanged; no duplicated logic.

### Task 8: Update role router + legacy redirects _(WS-1)_
- **Files**: `app/(app)/index.tsx`, `app/(app)/home.tsx`, `app/(app)/staff-home.tsx`
- `index.tsx`: redirect owner → `/(app)/(tabs)/home`, else → `/(app)/(tabs)/staff-home`.
  Convert `home.tsx`/`staff-home.tsx` to thin `<Redirect>` to the tab equivalents (OQ-3 default).
- **Skills**: `navigation-routing.md`, `security-auth.md` (preserve auth/role guards)
- **Acceptance**: post-login owner lands on tab Home, staff on tab Home; old paths still
  resolve via redirect; existing auth-guard behavior preserved; no flicker (hydration waits intact).

### Task 9: Owner `MoreMenuScreen` _(WS-2)_
- **Files**: `src/modules/navigation/screens/MoreMenuScreen.tsx` (+ test)
- Compose `MoreMenuList` with `getMoreSections('owner', hasPermission, { navigate })`; wire
  `onLogout` → `AppConfirmDialog` → `useAuthStore().logout()` → `router.replace('/(auth)/login')`.
  Wrap in `ScreenErrorBoundary`. `AppHeader` title `t('nav.more.title')` (no back).
- **Skills**: `screen-development.md`, `security-auth.md`, `error-handling.md`, `animation-haptics.md`
- **Acceptance**: all owner rows route to the correct existing destinations; disabled rows show
  coming-soon; logout confirms → wipes stores → redirects to login; works offline; error boundary present.

### Task 10: Staff `StaffMoreMenuScreen` + `(tabs)/more.tsx` router _(WS-2)_
- **Files**: `src/modules/navigation/screens/StaffMoreMenuScreen.tsx` (+ test), `app/(app)/(tabs)/more.tsx`
- Staff screen mirrors Task 9 with `getMoreSections('staff', …)`. `more.tsx` renders
  `MoreMenuScreen` when `isOwner` else `StaffMoreMenuScreen` (via `useRole()`); default to staff on unknown role.
- **Skills**: `screen-development.md`, `navigation-routing.md`, `error-handling.md`
- **Acceptance**: owner sees owner menu, staff sees staff menu under the same tab; staff "Today's
  Leaves" → `/(app)/deliveries/mark-leave` (OQ-2 default), "My Delivery History" → `/(app)/activity/my-activity`;
  logout works.

### Task 11: Offline / states pass _(WS-1 for bar strip; WS-2 for menu)_
- Verify offline strip appears above bar (WS-1, already in `AppTabBar`) and More menu remains
  fully usable offline incl. logout (WS-2). No new files — acceptance check folded into Tasks 6/9/10.
- **Skills**: `offline-first.md`, `error-handling.md`
- **Acceptance**: airplane-mode: tabs switch, More navigates, logout completes + redirects; offline strip visible.

### Task 12: Tests _(per workstream owner)_
- WS-0: unit tests for `nav.config`, `AppTabBar`, `MoreMenuList` (Tasks 3/4/5 tests).
- WS-2: render tests for both More screens (rows present, enabled vs disabled, logout flow mocked).
- **Skills**: `testing-strategy.md`
- **Acceptance**: tests pass under jest-expo; cover role branching, coming-soon rows, logout
  confirm/cancel, offline strip; no `any`; no console errors.

---

## Notes for downstream agents
- **No backend work** and **no API_SPEC** — navigation is client-only. Do not invent endpoints.
- Reuse `AppMenuItem`, `AppConfirmDialog`, `AppSection`, `AppHeader`, `useAuthStore().logout`,
  `useRole`, `appStore` — do NOT recreate them (Fresh Start / DRY).
- All user-facing text via `t('nav.*')` in all 9 locales — Review enforces.
- Honor OQ defaults (OQ-1 coming-soon rows, OQ-2 mark-leave target, OQ-3 keep redirects)
  unless the user overrides; update FEATURE_PLAN Open Questions with the resolution.
