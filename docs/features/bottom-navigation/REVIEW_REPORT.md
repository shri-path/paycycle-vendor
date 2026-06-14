# Code Review Report: Bottom Navigation (Tab Bar) + End-to-End Menu Actions

## Summary
- **Date**: 2026-06-13
- **Reviewer**: Review Agent
- **Feature Plan**: `docs/features/bottom-navigation/FEATURE_PLAN.md`
- **Overall Assessment**: ❌ Changes Required

---

## Statistics

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| CRITICAL | 3     |
| MAJOR    | 5     |
| MINOR    | 4     |
| INFO     | 2     |

---

## Findings

### CRITICAL-1: Login and Signup bypass the role router — staff always land on owner tab home

- **Files**:
  - `src/modules/auth/screens/LoginScreen.tsx:99`
  - `src/modules/auth/hooks/useSignupForm.ts:153`
- **Skill Violated**: `navigation-routing.md` — "Route files … guard `(app)` on `isAuthenticated`; `router.replace` used after auth transitions"; `screen-development.md` — "max 2 taps; no dead-end screens"
- **Description**: Both `LoginScreen.handleLogin` and `useSignupForm.handleSignup` call `router.replace('/(app)/(tabs)/home')` unconditionally. `/(app)/(tabs)/home` is the **owner** tab route; staff users land there and immediately hit `useRequireOwner`, which then redirects them to `/(app)/(tabs)/staff-home`. This creates a visible flash/flicker for every staff login. Worse, if the role guard is ever skipped (e.g. race between hydration and redirect), staff see owner financial data.
- **Expected**: Post-login redirect should target the role-neutral `/(app)/index` (which already handles the owner/staff branch with hydration guards), or at minimum `/(app)/(tabs)/staff-home` for unknown roles, letting `useRole()` decide.
- **Suggestion**: Change both redirect targets to `/(app)/index`:
  ```ts
  router.replace('/(app)/index')
  // or equivalently: router.replace('/(app)/')
  ```
  The role router at `/(app)/index` already waits for hydration before branching — this is the single source of truth for post-login routing.

---

### CRITICAL-2: `renderTabBar` callback is recreated on every render — tab bar re-mounts on each render cycle

- **File**: `app/(app)/(tabs)/_layout.tsx:42-49`
- **Skill Violated**: `performance-optimization.md` — "Stable callbacks/data — renderItem and onPress via useCallback"; `animation-haptics.md` — "Animations use Reanimated / native driver"
- **Description**: `renderTabBar` is defined as an inline arrow function inside the component body without `useCallback`. On every render of `TabsLayout` (which rerenders whenever `isOnline`, `isSyncing`, or `role` changes), a brand-new function reference is passed as the `tabBar` prop to `<Tabs>`. Expo Router/React Navigation may interpret a changed `tabBar` prop as a structural change, causing the tab bar to unmount and remount — losing animation state, resetting Reanimated shared values, and causing jank on every network-status toggle.
- **Expected**: `renderTabBar` must be wrapped in `useCallback` so its identity is stable:
  ```tsx
  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => (
      <AppTabBar {...props} items={items} isOnline={isOnline} isSyncing={isSyncing} />
    ),
    [items, isOnline, isSyncing],
  )
  ```

---

### CRITICAL-3: `MoreMenuScreen` and `StaffMoreMenuScreen` use top-level `SafeAreaView` inside a tab — double bottom-inset application

- **Files**:
  - `src/modules/navigation/screens/MoreMenuScreen.tsx:96`
  - `src/modules/navigation/screens/StaffMoreMenuScreen.tsx:96`
- **Skill Violated**: `screen-development.md` — "Layout uses Tamagui primitives + tokens; SafeAreaView present"; `ui-visual-design.md` — "Consistent screen padding"
- **Description**: Both screens wrap their content in a full `SafeAreaView` (all edges active). However, `AppTabBar` already handles the bottom safe-area inset by applying `paddingBottom: insets.bottom` to its container (`AppTabBar.tsx:193`). Inside a tab group managed by Expo Router, the tab bar sits below the screen; the bottom inset is consumed by the bar. A `SafeAreaView` with all edges active inside the tab content area double-applies the bottom inset — resulting in an extra gap at the bottom of the More menu on devices with home indicators (iPhone X+, many modern Androids).
- **Expected**: Use `edges={['top', 'left', 'right']}` (omit `'bottom'`) on `SafeAreaView` inside tab screens, since the tab bar handles the bottom inset:
  ```tsx
  import { SafeAreaView } from 'react-native-safe-area-context'
  // ...
  <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
  ```

---

### MAJOR-1: `navigation: any` in `AppTabBarProps` — TypeScript strictness violation

- **File**: `src/components/layout/AppTabBar.tsx:51`
- **Skill Violated**: `component-development.md` — "No `any`"; CLAUDE.md — "TypeScript strict mode, no `any`"
- **Description**: The `AppTabBarProps` interface types `navigation` as `any`. The actual type is `BottomTabBarProps['navigation']` from `@react-navigation/bottom-tabs`, which is already imported (`BottomTabBarProps` is used in `_layout.tsx`). The comment in the plan acknowledges the `any` but the implementation still uses it without a suppression comment explaining why a typed alternative is impractical.
- **Suggestion**: Replace `any` with the proper type:
  ```ts
  import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
  
  export interface AppTabBarProps {
    state: TabNavigationState<ParamListBase>
    navigation: BottomTabBarProps['navigation']
    items: TabItem[]
    isOnline: boolean
    isSyncing: boolean
  }
  ```
  The existing `eslint-disable-next-line @typescript-eslint/no-explicit-any` suppression on line 51 confirms the team is aware — the type is available and should be used.

---

### MAJOR-2: `AppTabBar` and `MoreMenuList` are missing `displayName`

- **Files**:
  - `src/components/layout/AppTabBar.tsx`
  - `src/modules/navigation/components/MoreMenuList.tsx`
- **Skill Violated**: `component-development.md` — components must have a `displayName` for React DevTools. Per the project's existing pattern (e.g. `AppButton.displayName = 'AppButton'`), every exported memoized component sets `displayName`.
- **Description**: Neither `AppTabBar` nor `MoreMenuList` sets `displayName`. Both use named function expressions inside `React.memo(function Name(...))` which gives a displayName implicitly in development but the project convention is to set it explicitly and the review checklist requires it.
- **Suggestion**:
  ```ts
  // After the component definition
  AppTabBar.displayName = 'AppTabBar'
  MoreMenuList.displayName = 'MoreMenuList'
  ```

---

### MAJOR-3: Active indicator `left` property is not RTL-safe

- **File**: `src/components/layout/AppTabBar.tsx:166`
- **Skill Violated**: `accessibility-ux.md` — "RTL readiness: use `start`/`end` not `left`/`right`"; `localization-i18n.md` — "No `left`/`right` padding/margin"
- **Description**: The sliding active indicator uses `left: \`${indicatorLeft.value * 100}%\`` in the animated style. On RTL layouts (which the plan explicitly says to support), the indicator would slide in the wrong direction. The computation assumes LTR tab ordering.
- **Expected**: The indicator position logic must account for `I18nManager.isRTL`. When RTL is active, use `right` instead of `left` (or invert the percentage), so the indicator tracks the active tab in the correct direction.
- **Suggestion**:
  ```ts
  import { I18nManager } from 'react-native'
  
  const indicatorStyle = useAnimatedStyle(() => {
    const pct = `${indicatorLeft.value * 100}%` as `${number}%`
    return I18nManager.isRTL
      ? { right: pct, width: `${(1 / tabCount) * 100}%` as `${number}%` }
      : { left: pct, width: `${(1 / tabCount) * 100}%` as `${number}%` }
  })
  ```
  Note: v1 ships no RTL locale, but the plan explicitly requires RTL-safe layout now so it is "free later."

---

### MAJOR-4: `sections` `useMemo` in More screens has a stale-closure bug on `navigate`

- **Files**:
  - `src/modules/navigation/screens/MoreMenuScreen.tsx:65-68`
  - `src/modules/navigation/screens/StaffMoreMenuScreen.tsx:65-68`
- **Skill Violated**: `state-management.md` — "Derived state computed with `useMemo` … correct deps"; `screen-development.md` — "No business logic in the screen"
- **Description**: `sections` is memoized on `[hasPermission]` only, but the `navigate` handler captured inside `getMoreSections` is created by `useCallback` on `[router]`. The `navigate` callback is excluded from the `useMemo` dependency array (via `eslint-disable-next-line react-hooks/exhaustive-deps`). If `router` changes identity across renders (which Expo Router can do on navigation state updates), the `onPress` closures in the memoized sections will reference a stale `navigate` — meaning row presses may silently fail or navigate to the wrong place after the router has cycled.
- **Expected**: Either include `navigate` in the `useMemo` deps, or make `getMoreSections` return stable data keyed only on the route strings and let the `onPress` close over a stable ref:
  ```ts
  // Option A — add navigate to deps (preferred, honest)
  const sections = useMemo(
    () => getMoreSections('owner', hasPermission, { navigate }),
    [hasPermission, navigate],
  )
  
  // Option B — navigate via a stable ref
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])
  const sections = useMemo(
    () => getMoreSections('owner', hasPermission, { navigate: (href) => navigateRef.current(href) }),
    [hasPermission],
  )
  ```
  Option A is simpler and accurate. Since `navigate` is already `useCallback`'d on `[router]`, it will only cause a sections rebuild when the router actually changes, which is rare.

---

### MAJOR-5: More menu screens missing the Loading (skeleton) state for the case where role is still resolving

- **Files**:
  - `src/modules/navigation/screens/MoreMenuScreen.tsx`
  - `src/modules/navigation/screens/StaffMoreMenuScreen.tsx`
- **Skill Violated**: `screen-development.md` — "All 5 states implemented (Loading skeleton, Empty, Error, Populated, Offline)"; the plan itself says "Loading (skeleton rows while role resolving — but owner reaches here only when role known, so minimal)"
- **Description**: Both screens render the full menu immediately, regardless of whether `useRole()` is still loading. The feature plan acknowledges a `Loading` state (skeleton rows) is needed "while role resolving." If the More tab is tapped very quickly before role hydration completes, a user could see the full owner menu briefly (since `isOwner` defaults to `false`, `more.tsx` routes to `StaffMoreMenuScreen`) or vice versa. There is no skeleton, no loading guard, no `isLoading` check. This fails the "all 5 states" requirement.
- **Expected**: Add a loading guard in both screens:
  ```tsx
  const { isLoading } = useRole()
  if (isLoading) return <MoreMenuSkeleton />
  ```
  The skeleton should mimic the populated layout (section header + 3-4 row placeholders + logout area). This can be lightweight since role resolves quickly from cache.

---

### MINOR-1: `nav.config.ts` imports React for JSX but is specified as a pure function with no React

- **File**: `src/modules/navigation/nav.config.ts:10`
- **Skill Violated**: `state-management.md` — "pure functions, no side effects"; FEATURE_TASKS.md WS-0 contract: "No React, no side effects"
- **Description**: The plan explicitly states that `nav.config.ts` should contain "pure functions with no React, no side effects." However, the file imports `React` at line 10 because the `TabItem.icon` field type is `(active: boolean) => React.ReactNode` and the icon functions in `icons.tsx` return JSX. The `React` import itself does not violate purity (it's a type reference), but it creates a semantic inconsistency with the "no React" contract and makes the file dependent on the React runtime in tests. This is low-risk but the contract should be honoured.
- **Suggestion**: Move the `React.ReactNode` type reference to a pure type import, which is already what happens at runtime (the import is only used for its type):
  ```ts
  import type React from 'react'
  ```
  Using `import type` makes the intent clear and satisfies the "no React" spirit while retaining the type.

---

### MINOR-2: `MoreMenuList` uses raw RN `ScrollView` and `View` — Tamagui primitives required

- **File**: `src/modules/navigation/components/MoreMenuList.tsx:11`
- **Skill Violated**: `component-development.md` — "No inline styles or raw RN `View`/`Text`"; `screen-development.md` — "Layout via Tamagui primitives"
- **Description**: `MoreMenuList` imports `ScrollView`, `View` directly from `react-native` instead of using Tamagui's `ScrollView`/`YStack`. The project's skill requires Tamagui primitives for layout, and `MoreMenuScreen` / `StaffMoreMenuScreen` are listed under `screen-development.md` compliance. While `MoreMenuList` is a component (not a screen), the component skill (`component-development.md`) still requires tokens-only styling and the project convention uses Tamagui layout wrappers throughout.
- **Suggestion**: Replace `ScrollView`→`ScrollView` from Tamagui (or keep RN ScrollView since Tamagui's is compatible), and replace `View` wrapper around the logout button with `YStack`:
  ```tsx
  import { ScrollView, YStack } from 'tamagui'
  // Replace: <View style={styles.logoutContainer}>
  // With:    <YStack paddingHorizontal={spacing[4]} paddingVertical={spacing[4]}>
  ```

---

### MINOR-3: `_layout.tsx` title strings are hardcoded English in `Tabs.Screen` options

- **File**: `app/(app)/(tabs)/_layout.tsx:65,72,78,89,96,104`
- **Skill Violated**: `localization-i18n.md` — "Zero hardcoded user-facing strings; all via `t()`"
- **Description**: Every `<Tabs.Screen>` declaration sets a hardcoded English `title` string (e.g. `title: 'Home'`, `title: 'Lists'`). These titles appear in the native iOS back button and certain a11y contexts. The custom `AppTabBar` renders its own i18n labels, but the underlying `Tabs.Screen` title is still used by the OS in scenarios like the navigation header and VoiceOver back-button announcements.
- **Suggestion**: Use i18n keys for the title in `screenOptions` or per-screen `options`:
  ```tsx
  // In screenOptions or per-screen
  <Tabs.Screen
    name="home"
    options={{ href: isOwner ? undefined : null, title: t('nav.tab.home') }}
  />
  ```
  Requires importing `useTranslation` in the layout. Alternatively, suppress the title if it's always hidden (`headerShown: false` is already set), but it is still read by accessibility tools.

---

### MINOR-4: Missing `useCallback` import in `_layout.tsx` — `renderTabBar` has no memoization

- **File**: `app/(app)/(tabs)/_layout.tsx`
- **Skill Violated**: `performance-optimization.md` — "Stable callbacks/data — renderItem and onPress via useCallback"
- **Description**: This is a corollary of CRITICAL-2. The `useCallback` import is absent from the file entirely, which means it was not considered during implementation. The fix is straightforward but is noted separately to flag that the import must also be added.
- **Suggestion**: Add `useCallback` to the React import and wrap `renderTabBar` as described in CRITICAL-2.

---

### INFO-1: `reduce-motion` check uses `useRef` + `useEffect` — may miss state changes after mount

- **File**: `src/components/layout/AppTabBar.tsx:138-145`
- **Description**: The reduce-motion preference is read once via `AccessibilityInfo.isReduceMotionEnabled()` on mount and stored in a `useRef`. If the user toggles reduce-motion while the app is in the foreground (possible on iOS), the animation remains enabled or disabled per the stale cached value until next mount. The system-recommended approach is to subscribe to `AccessibilityInfo.addEventListener('reduceMotionChanged', handler)` for live updates.
- **Suggestion**: Subscribe to the change event:
  ```ts
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion.current = v })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduceMotion.current = v })
    return () => sub.remove()
  }, [])
  ```
  This is INFO only (the current approach is safe for the majority of sessions and low-risk for this feature).

---

### INFO-2: `sections` `useMemo` in More screens eslint-disable comment suppresses a real bug (see MAJOR-4)

- **Files**:
  - `src/modules/navigation/screens/MoreMenuScreen.tsx:67`
  - `src/modules/navigation/screens/StaffMoreMenuScreen.tsx:67`
- **Description**: The `// eslint-disable-next-line react-hooks/exhaustive-deps` comment was added to suppress a lint warning about the missing `navigate` dependency. Suppressing exhaustive-deps warnings should require a comment explaining why the dependency is intentionally excluded. As described in MAJOR-4, this suppression hides a real stale-closure issue rather than an intentional optimization.

---

## Skill Compliance Summary

| Skill | Status | Notes |
|---|---|---|
| component-development.md | ❌ | `any` type in `AppTabBarProps` (MAJOR-1); missing `displayName` on both components (MAJOR-2); raw RN `View`/`ScrollView` in `MoreMenuList` (MINOR-2) |
| screen-development.md | ❌ | Missing Loading state in both More screens (MAJOR-5); SafeAreaView double-inset (CRITICAL-3) |
| state-management.md | ❌ | Stale-closure bug in `sections` useMemo (MAJOR-4); `import React` instead of `import type` in pure config (MINOR-1) |
| api-integration.md | N/A | No API integration in this feature |
| offline-first.md | ✅ | Tab switching and More menu fully offline; logout works offline; offline strip implemented |
| navigation-routing.md | ❌ | Login/signup bypass role router → staff land on owner tab (CRITICAL-1); hardcoded title strings in Tabs.Screen (MINOR-3) |
| performance-optimization.md | ❌ | `renderTabBar` recreated every render — no `useCallback` (CRITICAL-2 / MINOR-4) |
| localization-i18n.md | ❌ | Hardcoded `title` strings in `Tabs.Screen` options (MINOR-3); all 9 nav locale groups confirmed present |
| animation-haptics.md | ✅ | Reanimated used for indicator; `withTiming` with token duration; haptics on tab press and logout; reduce-motion respected (with INFO-1 caveat) |
| testing-strategy.md | ✅ | All workstream tests present; nav.config, AppTabBar, MoreMenuList, MoreMenuScreen, StaffMoreMenuScreen all have test files; coverage is comprehensive (enabled/disabled rows, logout confirm/cancel, offline strip, accessibility states) |
| form-validation.md | N/A | No forms in this feature |
| accessibility-ux.md | ❌ | Active indicator `left` not RTL-safe (MAJOR-3); `SafeAreaView` edges issue partially affects a11y layout (CRITICAL-3) |
| ui-visual-design.md | ❌ | Raw RN `View` instead of Tamagui in MoreMenuList (MINOR-2); SafeAreaView double-inset causes inconsistent layout (CRITICAL-3) |
| error-handling.md | ✅ | Both More screens wrapped in `ScreenErrorBoundary`; logout errors caught and logged via shared logger with screen/action context; no PII in logs |
| security-auth.md | ❌ | Login/signup redirect bypasses role-based routing, creating risk of owner-screen flash for staff (CRITICAL-1) |
| real-time-sync.md | N/A | No real-time component in this feature |

---

## Fix Priority

**Must fix before merge (CRITICAL):**

1. **CRITICAL-1** — Fix `LoginScreen` and `useSignupForm` to redirect to `/(app)/index` (or role-neutral route) instead of `/(app)/(tabs)/home`. Staff users are currently routed to the owner tab home on every login.
2. **CRITICAL-2** — Wrap `renderTabBar` in `useCallback` in `_layout.tsx`.
3. **CRITICAL-3** — Add `edges={['top', 'left', 'right']}` to both `MoreMenuScreen` and `StaffMoreMenuScreen` `SafeAreaView` calls.

**Should fix before feature completion (MAJOR):**

4. **MAJOR-1** — Replace `navigation: any` with `BottomTabBarProps['navigation']` in `AppTabBarProps`.
5. **MAJOR-2** — Add `displayName` to `AppTabBar` and `MoreMenuList`.
6. **MAJOR-3** — RTL-safe the active indicator position logic using `I18nManager.isRTL`.
7. **MAJOR-4** — Add `navigate` to `sections` `useMemo` deps in both More screens, remove the `eslint-disable` suppression.
8. **MAJOR-5** — Add Loading skeleton state to both More menu screens.

**Fix in follow-up (MINOR / INFO):**

9. MINOR-1 — `import type React` in `nav.config.ts`.
10. MINOR-2 — Replace raw RN `View`/`ScrollView` with Tamagui counterparts in `MoreMenuList`.
11. MINOR-3 — i18n the `title` strings in `Tabs.Screen` declarations.
12. MINOR-4 — Add `useCallback` import to `_layout.tsx` (prerequisite of CRITICAL-2 fix).
13. INFO-1 — Subscribe to `reduceMotionChanged` event for live updates.
14. INFO-2 — Document or fix the `eslint-disable-next-line` in More screen `useMemo` (addressed by MAJOR-4).
