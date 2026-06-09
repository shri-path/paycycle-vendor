# Code Review Report: Roles & Access Control (US-002)

## Summary
- **Date**: 2026-06-09
- **Reviewer**: Review Agent
- **Feature Plan**: `docs/features/roles-access/FEATURE_PLAN.md`
- **Overall Assessment**: ❌ Changes Required

---

## Statistics

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| CRITICAL | 5     |
| MAJOR    | 9     |
| MINOR    | 5     |
| INFO     | 2     |

---

## Findings

---

### CRITICAL-1: StaffDetailScreen skeleton is a spinner, not a shape-matching skeleton

- **File**: `src/modules/roles/screens/StaffDetailScreen.tsx:65-72`
- **Skill Violated**: `screen-development.md` — "Loading skeleton matching populated layout shape (not a full-screen spinner)"
- **Description**: `StaffDetailSkeleton` renders a centered `<AppLoader />` (a spinner). The skill and the plan both require the skeleton to match the populated layout shape (profile card, sections, stats card, action buttons). A spinner is explicitly called out as a violation ("Missing skeleton / shows spinner → CRITICAL").
- **Expected**: A skeleton composed of `AppCard` placeholder blocks shaped like the profile card, assigned-lists section, stats card, and action rows. Same pattern used by `StaffListSkeleton` (three shaped cards) and the `SupplyListMultiSelect` loading state.
- **Suggestion**:
```tsx
function StaffDetailSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="staff-detail-skeleton">
      <AppCard variant="flat" style={{ height: 120, marginVertical: spacing[3], backgroundColor: colors.gray100 }}><View /></AppCard>
      <AppCard variant="flat" style={{ height: 80, marginBottom: spacing[3], backgroundColor: colors.gray100 }}><View /></AppCard>
      <AppCard variant="flat" style={{ height: 100, marginBottom: spacing[3], backgroundColor: colors.gray100 }}><View /></AppCard>
    </ScrollView>
  )
}
```

---

### CRITICAL-2: OQ-7 reactive role re-fetch is missing from owner-only screens

- **File**: `src/modules/roles/screens/StaffListScreen.tsx`, `src/modules/roles/screens/StaffDetailScreen.tsx`, `src/modules/roles/screens/StaffHomeScreen.tsx`
- **Skill Violated**: `error-handling.md` + `real-time-sync.md` (OQ-7) — "on screen focus, re-fetchRole(); if permissions changed show permissions_updated alert"
- **Description**: The plan resolves OQ-7 as "on screen focus, re-fetchRole() — reactive detection". The role router (`app/(app)/index.tsx`) runs `fetchRole` on mount, but individual screens that users navigate back to do NOT re-fetch the role on focus. If a staff member is removed or permissions change while the owner is on the StaffList screen (or returns to StaffHome after being in it), the role context is stale until the app is relaunched. `useFocusEffect` is absent from all three screens.
- **Expected**: Each screen should call `fetchRole()` inside a `useFocusEffect` callback so permissions are checked every time the screen becomes active.
- **Suggestion**:
```tsx
import { useFocusEffect } from 'expo-router'
// inside screen content:
const { fetchRole } = useRolesStore(useShallow((s) => ({ fetchRole: s.fetchRole })))
useFocusEffect(useCallback(() => { void fetchRole() }, [fetchRole]))
```
For StaffHomeScreen, a re-fetch also catches permission drift and should trigger an `AppAlert` if role changed (compare previous vs new). This is a non-blocking display concern; the `fetchRole` call alone unblocks the security protection.

---

### CRITICAL-3: AppButton missing `accessibilityState={{ disabled }}` — offline-disabled buttons are screen-reader-invisible

- **File**: `src/components/primitives/AppButton.tsx` (pre-existing composite used by all new screens)
- **Skill Violated**: `accessibility-ux.md` — "Disabled-while-offline buttons set `accessibilityState={{ disabled: true }}` + hint 'needs connection'"; `screen-development.md` — "Disable actions when offline; show the offline banner"
- **Description**: `AppButton` uses `TouchableOpacity disabled={disabled}` but does NOT pass `accessibilityState={{ disabled: true }}` or any `accessibilityHint`. Screen readers (TalkBack) will read the button as active even when visually grayed out offline. The FEATURE_PLAN explicitly calls for `accessibilityState={{ disabled: true }}` + hint "needs connection" on offline-disabled buttons. This is a pre-existing gap in `AppButton` that US-002 relies on and did not remediate; all five new screens are affected.
- **Expected**: `AppButton` should propagate `accessibilityState={{ disabled: disabled || loading }}` and accept an optional `accessibilityHint` prop forwarded to the `TouchableOpacity`.
- **Suggestion**:
```tsx
// AppButton.tsx — add to TouchableOpacity:
accessibilityRole="button"
accessibilityLabel={label}
accessibilityState={{ disabled: disabled || loading }}
accessibilityHint={accessibilityHint}
```
Then callers can pass `accessibilityHint={t('common.needs_connection')}` on offline-disabled buttons. Add `common.needs_connection` key to all 9 locales.

---

### CRITICAL-4: `auth.service.ts` does not use the shared `httpClient` — the session-revocation interceptor does not protect `acceptInvite`

- **File**: `src/modules/auth/service/auth.service.ts:20-25`
- **Skill Violated**: `api-integration.md` — "Auth header. Real calls attach the access token via the shared axios instance/interceptor — services never read tokens from the store/state"; `security-auth.md`
- **Description**: `auth.service.ts` creates its own private `axios.create({ baseURL, timeout })` instance (named `api`). This means:
  1. The `acceptInvite` real-mode call bypasses the shared `httpClient` interceptor — a 401 returned by `accept-invite` would NOT trigger the session-revocation handler (though this endpoint is public, so the risk is low currently).
  2. More importantly, the `logout`, `refreshTokens`, and other authenticated calls in `auth.service.ts` also use this private instance, meaning a 401 on token refresh does NOT go through the shared interceptor. The plan (OQ-3) explicitly states "the roles service uses `httpClient`; auth stays as-is for this story" — however, `auth.service` needs to use the shared client for authenticated methods so the interceptor covers token expiry during auth calls.
  3. The `roles.service.ts` correctly uses `httpClient`, but `auth.service.ts` does not, creating inconsistency.
- **Expected**: Authenticated methods in `auth.service.ts` (`logout`, `refreshTokens`, `resetPassword`) should use `httpClient`. The public auth methods (`login`, `signup`, `forgotPassword`, `acceptInvite`) can use a separate unauthenticated instance or a conditional approach. At minimum, `refreshTokens` must use the shared client.
- **Fix**: Extract a separate unauthenticated `publicApiClient` (without the Bearer token interceptor) for login/signup/forgotPassword/acceptInvite, and switch the authenticated auth calls to `httpClient`.

---

### CRITICAL-5: `fetchSupplyListOptions` error path sets `staffError` instead of a dedicated error field — pollutes the global error banner on all screens

- **File**: `src/modules/roles/store/roles.store.ts:226-228`
- **Skill Violated**: `state-management.md` — "set→try→catch pattern; error is an i18n key; no kitchen-sink error field"; `screen-development.md`
- **Description**: The `fetchSupplyListOptions` catch block sets `staffError` (a field primarily owned by staff CRUD operations). This means that if supply-list fetching fails (e.g. 403, network), both `StaffListScreen` and `InviteStaffScreen` will render the generic API error banner — even though the core staff list loaded successfully. The supply-list error should be silently swallowed (logged, no UI disruption) or have its own `supplyListError` field so screens can decide whether to surface it. The current behavior will show a confusing banner on the Staff List screen if the supply-list stub returns an error.
- **Expected**: Either add `supplyListError: string | null` to the state and update `partialize` to exclude it, or swallow the error with only logging (since supply-list failure is non-blocking — the multi-select will show its empty state).
- **Suggestion**:
```ts
// Catch block for fetchSupplyListOptions:
catch (err) {
  void logError(err, { screen: 'AssignLists', action: 'fetchSupplyListOptions', ... })
  set({ isSupplyListsLoading: false })
  // supply-list failure is non-blocking — the multi-select empty state handles this gracefully
}
```

---

### MAJOR-1: `validateAreaLabel` has no allowlist regex — only blocklist defense-in-depth

- **File**: `src/utils/validation.ts:98-104`
- **Skill Violated**: `form-validation.md` — "Allowlist regex per field type — prefer allowing known-good characters over blocklisting bad ones (blocklists are bypassable)"
- **Description**: `validateAreaLabel` trims, caps length, and guards against control chars + injection sequences — but has NO allowlist regex. The skill is explicit: "prefer allowlist regex over blocklist." A field with only a blocklist can be bypassed by Unicode characters outside the blocked set. The area label is displayed to users and could contain malicious markup if not allowlisted.
- **Expected**: Add a permissive allowlist regex that covers Indian place names (Indic scripts + Latin + common separators):
```ts
const AREA_LABEL_RE = /^[\p{L}\p{M}\p{N} .,\-/()]+$/u
// in validateAreaLabel, after the injection check:
if (!AREA_LABEL_RE.test(v)) return 'validation.invalid_characters'
```

---

### MAJOR-2: `StaffJoinScreen` logo block uses hardcoded pixel values bypassing design tokens

- **File**: `src/modules/roles/screens/StaffJoinScreen.tsx:183-184,191,338`
- **Skill Violated**: `component-development.md` — "All colors/spacing/sizes come from `@constants/tokens` — zero hardcoded hex/px"
- **Description**: The logo block uses `width={80}`, `height={80}`, `borderRadius={40}`, `size={40}`, and `size={20}` (for the `Ionicons`) as literal numbers. These should come from design tokens. Additionally the `KeyboardAvoidingView` at line 249 uses `style={{ flex: 1 }}` as an inline object created on every render.
- **Expected**: Use `componentSizes` and `spacing` tokens. Inline style objects in hot paths violate the performance rule.
- **Suggestion**:
```tsx
// logo circle: use componentSizes.avatar.lg (or equivalent token)
// password eye icon: use componentSizes.icon.md
// KeyboardAvoidingView inline flex: extract to StyleSheet.create
const styles = StyleSheet.create({
  kav: { flex: 1 },
  ...
})
<KeyboardAvoidingView style={styles.kav} behavior={...} />
```

---

### MAJOR-3: `InviteStaffScreen` has a hardcoded `borderRadius: 8` in `sheetUrl` style

- **File**: `src/modules/roles/screens/InviteStaffScreen.tsx:55`
- **Skill Violated**: `component-development.md` — "All colors/spacing/sizes come from `@constants/tokens` — zero hardcoded hex/px"
- **Description**: `sheetUrl` style in `StyleSheet.create` uses `borderRadius: 8` — a hardcoded value that bypasses `borderRadius` tokens.
- **Expected**: `borderRadius: borderRadius.md` (or whichever token maps to 8).
- **Suggestion**: `borderRadius: borderRadius.md`

---

### MAJOR-4: `StaffHomeScreen` has an inline style object `{ marginTop: spacing[2] }` in a list-rendered item

- **File**: `src/modules/roles/screens/StaffHomeScreen.tsx:163`
- **Skill Violated**: `performance-optimization.md` — "No inline style object creation in hot paths"
- **Description**: Inside `assignedLists.map(...)`, the `AppButton` renders with `style={{ marginTop: spacing[2] }}` — a new object on every render of every list item. At 50+ assigned lists this creates garbage-collection pressure.
- **Expected**: Extract to `StyleSheet.create` at module scope:
```ts
const styles = StyleSheet.create({
  ...
  listItemBtn: { marginTop: spacing[2] },
})
```

---

### MAJOR-5: AppBottomSheet close button renders a raw text string in a non-Text View — crashes in tests (and may crash in production in strict mode)

- **File**: `src/components/composite/AppBottomSheet.tsx:164`
- **Skill Violated**: `error-handling.md` — "The app NEVER crashes the whole screen"; `testing-strategy.md` — "Mock parity with components"
- **Description**: The close button renders `<AppText variant="h4" weight="bold">✕</AppText>` inside `AppIconButton` which is confirmed to crash with "Text strings must be rendered within a `<Text>` component" in the test environment. **Two tests (`InviteStaffScreen.test.tsx` and `StaffDetailScreen.test.tsx`) had to mock `AppBottomSheet` entirely to work around this crash** — indicating this is not just a test environment issue. In React Native strict mode and on some device configurations, rendering text nodes outside `<Text>` elements also crashes production builds. The tests explicitly flag this as a "PRE-EXISTING shared-composite defect."
- **Expected**: The close button should either use `<Ionicons name="close" />` directly (already available in the project) or ensure the `AppText` is wrapped within `AppIconButton` properly. The `AppIconButton` `icon` prop already accepts `ReactNode` — ensure the icon slot does not render bare strings.
- **Suggestion**: Replace `<AppText variant="h4" weight="bold">✕</AppText>` with `<Ionicons name="close" size={componentSizes.icon.md} color={colors.textPrimary} />`.
- **Impact**: Both test files mock around this bug. Once fixed, remove the mock overrides in `InviteStaffScreen.test.tsx:31-38` and `StaffDetailScreen.test.tsx:33-40`.

---

### MAJOR-6: Offline-disabled FAB in `StaffListScreen` has no `accessibilityHint` explaining "needs connection"

- **File**: `src/modules/roles/screens/StaffListScreen.tsx:222-230`
- **Skill Violated**: `accessibility-ux.md` — "Disabled-while-offline buttons set `accessibilityState={{ disabled: true }}` + hint 'needs connection'"; `feature-plan.md` spec
- **Description**: The FAB (`AppButton` with `disabled={!isConnected}`) has no `accessibilityHint`. A TalkBack user will not understand why the button is non-interactive. The FEATURE_PLAN explicitly calls for this.
- **Expected**: Add `accessibilityHint` when offline to explain the button is disabled due to no connection. Pending CRITICAL-3 fix (AppButton accepting `accessibilityHint` prop), the FAB should pass a hint.

---

### MAJOR-7: OQ-7 re-fetch-on-focus missing from individual screens (reinforcing CRITICAL-2 at the permission-update UX layer)

- **File**: `src/modules/roles/screens/StaffHomeScreen.tsx`, `src/modules/roles/screens/StaffListScreen.tsx`
- **Skill Violated**: `feature-plan.md` OQ-7 — "on screen focus, re-fetchRole(); if permissions changed show `roles.permissions_updated` AppAlert and re-render gates"
- **Description**: Even setting aside the security concern from CRITICAL-2, neither `StaffHomeScreen` nor `StaffListScreen` shows the `roles.permissions_updated` alert when a re-fetch finds changed permissions. The plan calls for a non-blocking `AppAlert` "Your permissions were updated." when role data drifts. This user-facing notification (i18n key `roles.permissions_updated`) is entirely absent.
- **Expected**: Compare the previous `roleContext.permissions` (snapshot it before re-fetch) with the new one; if different, surface `AppAlert type="info"` with `t('roles.permissions_updated')`.

---

### MAJOR-8: `StaffJoinScreen` name-validation fires on empty string, gating valid submits

- **File**: `src/modules/roles/screens/StaffJoinScreen.tsx:125`
- **Skill Violated**: `form-validation.md` — validator semantics; `feature-plan.md` — "name is optional on the Join screen"
- **Description**: `handleJoin` calls `validateStaffName(name)` and returns `nError` as a blocking condition. However `validateStaffName('')` returns `null` (name is optional per the validator itself), so the form correctly passes when name is empty. BUT if the user previously typed a name and then cleared it, the live-re-validation (`if (nameError) setNameError(validateStaffName(next))`) in `onChangeName` only re-validates when `nameError` is already set. If the user types an invalid name and then completely clears it (`name = ''`), the error banner would stay shown because `validateStaffName('')` returns `null` — but the `onChangeName` guard `if (nameError)` would clear it. This chain is correct. However, the `handleJoin` guard `if (nError || pwError)` correctly allows `null` (empty-optional name) through.

  The real issue is that the live-re-validation for `name` only fires when `nameError` is already set: `if (nameError) setNameError(validateStaffName(next))`. This is correct for the Optional-field pattern only if error was previously shown. But the "touched" pattern for re-validation is inconsistent with other screens — `InviteStaffScreen` uses `touched && setNameError(...)` while `StaffJoinScreen` uses `if (nameError)`. This creates inconsistent UX (if the user touches the field, blurs to show an error, then submits — the error is shown, which is correct; but the blur handler is missing from the name input on the Join screen).
- **Expected**: Add `onBlur` to the name input on the Join screen to trigger validation (consistent with `InviteStaffScreen`), or document that the name field on Join has no blur validation since it is optional.

---

### MAJOR-9: `StaffJoinScreen` uses `user?.phone` as the "signed in as" display — PII in screen

- **File**: `src/modules/roles/screens/StaffJoinScreen.tsx:218`
- **Skill Violated**: `security-auth.md` — "No sensitive data in console logs"; `accessibility-ux.md` — user identity display; `feature-plan.md` OQ-2
- **Description**: The "already-logged-in" state shows `t('roles.join_signed_in_title', { name: user?.phone ?? '' })`. This displays the user's phone number in the UI. The FEATURE_PLAN OQ-2 says `"You're signed in as <X>"` — but `<X>` should be the user's display name, not their phone number. Phone numbers are PII and are also unnecessary here for the sign-out decision.
- **Expected**: Use `user?.name` if available, or a non-PII identifier. The `UserDto` (from `auth.ts`) should have a `name` or `vendorName` field. If neither is available, use a generic message without the phone:
```ts
t('roles.join_signed_in_title', { name: user?.name ?? t('common.you') })
```
Add `common.you` (= "you") to all 9 locales as a fallback.

---

### MINOR-1: Missing `ScreenErrorBoundary` export from `src/components/index.ts`

- **File**: `src/components/index.ts`
- **Skill Violated**: `component-development.md` — "Exported from `src/components/index.ts`"
- **Description**: `ScreenErrorBoundary` is a composite component used by all screens but is not exported from the barrel `src/components/index.ts`. Every screen imports it directly by path (`@components/composite/ScreenErrorBoundary`). The skill requires all shared components be exported from the barrel.
- **Suggestion**: Add `export { ScreenErrorBoundary } from './composite/ScreenErrorBoundary'` to `src/components/index.ts`.

---

### MINOR-2: `roles.store.ts` has no `isHydrated` field — role router can briefly show wrong state

- **File**: `src/modules/roles/store/roles.store.ts`, `app/(app)/index.tsx:35`
- **Skill Violated**: `state-management.md` — "Set `isHydrated` via `onRehydrateStorage`"
- **Description**: The roles store uses `persist` but has no `isHydrated` flag and no `onRehydrateStorage` callback. The role router guards on `auth.isHydrated` AND `!roleContext && isLoading`, which covers most cases. However, on a fresh device launch where `roleContext` was never persisted, the router shows the loader only while `isLoading` is true — if `isLoading` is still false before `fetchRole` is called (the `useEffect` runs after first render), there is a brief window where `!roleContext && !isLoading` = `true`, causing an immediate `staff-home` redirect (safer default) before the fetch completes. This is a minor UX issue (a flash to staff-home then re-route to home for owners) that `isHydrated` would prevent.
- **Suggestion**: Add `isRolesHydrated: boolean` to the store and wire it via `onRehydrateStorage`, then add it to the role router guard.

---

### MINOR-3: `StaffJoinScreen` summary card renders bullet points with `• {label}` string concatenation

- **File**: `src/modules/roles/screens/StaffJoinScreen.tsx:282-285`
- **Skill Violated**: `localization-i18n.md` — "Interpolation/plurals go through the i18n layer, not string concatenation, so word order works across scripts"
- **Description**: The list items are rendered as `• {label}` where `•` is a hardcoded literal. In RTL or long-script locales this may not render correctly. The bullet should be handled via a translation key or a dedicated list-item component.
- **Suggestion**: Use a `roles.list_bullet` key (value `"• {{label}}"`) or render the bullet as a styled `View`/`AppText` sibling outside the translated text.

---

### MINOR-4: `app/(app)/index.tsx` role router uses raw `ActivityIndicator` and inline style objects

- **File**: `app/(app)/index.tsx:20-21,38-40`
- **Skill Violated**: `screen-development.md` — "Layout via Tamagui primitives + tokens; use `SafeAreaView`"; `component-development.md` — "Styles built once at module scope"
- **Description**: The loader view uses `ActivityIndicator` (RN component rather than `AppLoader` primitive) and an inline `StyleSheet` at module scope is correctly used — but `StyleSheet.create({ loader: { ... backgroundColor: colors.background } })` is correct. The minor issue is using raw `ActivityIndicator` instead of the existing `AppLoader` primitive, which is the project-standard loading indicator.
- **Suggestion**: Replace `<ActivityIndicator size="large" color={colors.primary} />` with `<AppLoader size="lg" />` for consistency.

---

### MINOR-5: `StaffCard` does not render the assigned-list names (only has today's stats) — plan calls for list names

- **File**: `src/modules/roles/components/StaffCard.tsx:113-115`
- **Skill Violated**: `feature-plan.md` spec — "`StaffCard` shows: AppAvatar, name, phone, **assigned list names**, todayStats"
- **Description**: The `StaffCard` renders `areaRouteLabel` and `todayLabel` but not the assigned list names. The FEATURE_PLAN (Screen 2, Staff List) specifies "assigned list names" as a visible row. The `staff.assignedListIds` is available on the `StaffResponseDto` prop, but the names are not (the multi-select options are in the store, not the card props). This is a minor scope gap — the plan calls for names, but injecting the options via props or a separate `assignedListCount` label would satisfy the intent.
- **Suggestion**: Add `assignedListCount` as a caption line: `{staff.assignedListCount > 0 ? t('roles.lists_count', { count: staff.assignedListCount }) : null}`. Add `roles.lists_count = "{{count}} list(s) assigned"` to all 9 locales. Alternatively pass `assignedListNames` as a prop from the screen if the store options are already fetched.

---

## INFO-1: `auth.service.ts` not migrated to `httpClient` — accepted for this story per OQ-3

The FEATURE_PLAN (OQ-3) documents: "the roles service uses `httpClient`; auth stays as-is for this story." This deferral is accepted for the US-002 scope. CRITICAL-4 above highlights the specific subset (token-refresh path) that warrants a follow-up task. Tracking here for the Architect's awareness.

---

## INFO-2: OQ-6 supply-list stub dependency acknowledged

The full assign/unassign UI is built per the user's resolved OQ-6 decision. `SupplyListMultiSelect`, `listSupplyLists`/`assignLists`/`unassignList`, `SupplyListOptionDto`, and the stub endpoints are intentionally built against the backend list-assignment stub. All relevant code is annotated. Re-verification required when US-005 ships. This is not a finding — confirmed accepted risk.

---

## Skill Compliance Summary

| Skill                        | Status | Notes |
|------------------------------|--------|-------|
| component-development.md     | ❌     | CRITICAL-3 (AppButton a11y), MAJOR-5 (AppBottomSheet crash), MINOR-1 (barrel export), MAJOR-2/3 (hardcoded tokens) |
| screen-development.md        | ❌     | CRITICAL-1 (StaffDetail skeleton), MAJOR-4 (inline style), MAJOR-6 (FAB a11y hint) |
| state-management.md          | ❌     | CRITICAL-5 (fetchSupplyListOptions sets wrong error field), MINOR-2 (no isHydrated in roles store) |
| api-integration.md           | ❌     | CRITICAL-4 (auth.service not using httpClient for authenticated calls) |
| offline-first.md             | ✅     | Security mutations correctly online-only; cache + offline banner present across all screens; documented deviation in FEATURE_PLAN |
| navigation-routing.md        | ✅     | All routes thin wrappers; role router correct; deep link via paycyclevendor scheme; back works; ≤2 taps |
| localization-i18n.md         | ✅     | All 9 locales have the complete roles.* key set; no hardcoded user-facing strings detected in translations; real translations (not English copies); MINOR-3 bullet is a soft finding |
| error-handling.md            | ❌     | CRITICAL-2 (no focus-based role re-fetch / OQ-7 half-implemented), MAJOR-7 (permissions_updated alert absent) |
| security-auth.md             | ✅     | vendorId from JWT only; tokens in SecureStore; clearRoles wired in logout; no PII in logs; no cross-tenant leakage. CRITICAL-4 is a layering concern, not a direct security breach for current scope |
| accessibility-ux.md          | ❌     | CRITICAL-3 (AppButton no accessibilityState), MAJOR-6 (no accessibilityHint on offline FAB), MAJOR-9 (phone number displayed) |
| animation-haptics.md         | ✅     | Haptics present on all primary actions (submit, selection, error, success, destructive confirms); Reanimated FadeIn on Join summary card; fire-and-forget void pattern correct |
| performance-optimization.md  | ✅     | FlatList tuned (windowSize=5, maxToRenderPerBatch=10, initialNumToRender=8, removeClippedSubviews=Android); StaffCard React.memo; renderItem/keyExtractor via useCallback; useShallow throughout. MAJOR-4 inline style is a minor perf issue. |
| testing-strategy.md          | ✅     | All 5 screen states covered for all 5 screens; role gating tested; error codes tested; offline-disabled mutations tested; store persistence (no tokens) verified; submit-success tests act-wrapped and ordered last; i18n keys asserted; real network not used. MAJOR-5 workaround mocks are a code smell but correctly documented |
| form-validation.md           | ❌     | MAJOR-1 (validateAreaLabel lacks allowlist regex), MAJOR-8 (Join screen name field missing onBlur) |
| real-time-sync.md            | ❌     | CRITICAL-2 / MAJOR-7 (OQ-7 focus-based refetch incomplete; permissions_updated alert absent) |

---

## Must-Fix Before Merge (CRITICAL findings)

| ID | File | Fix |
|----|------|-----|
| CRITICAL-1 | `StaffDetailScreen.tsx` | Replace spinner skeleton with layout-matching placeholder cards |
| CRITICAL-2 | `StaffListScreen.tsx`, `StaffDetailScreen.tsx`, `StaffHomeScreen.tsx` | Add `useFocusEffect` calling `fetchRole()` on each screen focus |
| CRITICAL-3 | `AppButton.tsx` | Add `accessibilityRole="button"`, `accessibilityState={{ disabled }}`, `accessibilityHint` prop support |
| CRITICAL-4 | `auth.service.ts` | Migrate authenticated methods (`logout`, `refreshTokens`) to `httpClient`; keep public methods on a separate unauthenticated client |
| CRITICAL-5 | `roles.store.ts` | Fix `fetchSupplyListOptions` to not pollute `staffError`; use dedicated field or silent log-only catch |

---

## Should-Fix Before Feature Completion (MAJOR findings)

| ID | File | Fix |
|----|------|-----|
| MAJOR-1 | `validation.ts` | Add allowlist regex to `validateAreaLabel` |
| MAJOR-2 | `StaffJoinScreen.tsx` | Replace hardcoded px values with tokens; extract inline `flex:1` to StyleSheet |
| MAJOR-3 | `InviteStaffScreen.tsx` | Replace `borderRadius: 8` with `borderRadius.md` token |
| MAJOR-4 | `StaffHomeScreen.tsx` | Extract inline `{ marginTop: spacing[2] }` to module-scope `StyleSheet` |
| MAJOR-5 | `AppBottomSheet.tsx` | Fix close button to use `Ionicons` instead of `AppText`-inside-icon rendering bug |
| MAJOR-6 | `StaffListScreen.tsx` | Add `accessibilityHint` (needs-connection) to offline-disabled FAB |
| MAJOR-7 | `StaffHomeScreen.tsx`, `StaffListScreen.tsx` | Add `roles.permissions_updated` alert when re-fetch detects permission drift |
| MAJOR-8 | `StaffJoinScreen.tsx` | Add `onBlur` to name input for consistent touched validation |
| MAJOR-9 | `StaffJoinScreen.tsx` | Replace `user?.phone` with `user?.name` or generic fallback in "signed-in-as" prompt |
