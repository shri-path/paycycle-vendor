# QA Report: US-004 Staff Management — Frontend

## Summary
- **Date**: 2026-06-11
- **Tester**: QA Agent
- **Branch**: `fix/reset-password-otp-only`
- **Commits reviewed**: `206aeb0b` (feat), `917ac5d2` (docs), `c73e5c1` (review fixes)
- **Feature Plan**: `docs/features/staff-management-frontend/FEATURE_PLAN.md`
- **Review Report**: `docs/features/staff-management-frontend/REVIEW_REPORT.md`
- **Devices Tested**: Static/code analysis (no emulator available in this run)
- **Languages Tested**: en, hi, ta, te, mr, bn, kn, ml, gu (via locale file inspection)
- **Network Conditions Tested**: Offline path via code/test inspection

---

## Review Findings: Pass / Fail per Finding

### MAJOR-1 — Single exported `ALL_PERMISSION_KEYS` in `src/types/roles.ts`

**Status: PASS**

`src/types/roles.ts` lines 26-30 export a single `export const ALL_PERMISSION_KEYS: PermissionKey[]`. The local definition that existed in `StaffDetailScreen.tsx` (6-line block removed in `c73e5c1`) and the inline array in `roles.service.ts` (also removed) are both gone. Both files now import from `'../../../types/roles'`. TypeScript strict passes (`tsc --noEmit` 0 errors). If a fourth permission key is added to the backend DTO, there is exactly one place to update.

---

### MAJOR-2 — `src/modules/roles/components/index.ts` barrel exists; importers use it

**Status: PASS**

`src/modules/roles/components/index.ts` was created in `c73e5c1`. It re-exports all four module-internal components: `InviteShareSheet`, `InviteShareSheetProps`, `PermissionToggleList`, `StaffCard`, and `SupplyListMultiSelect`. `StaffDetailScreen.tsx` now imports `{ PermissionToggleList, SupplyListMultiSelect, InviteShareSheet }` from `'../components'`. `StaffListScreen.tsx` imports `{ StaffCard }` from `'../components'`. The three direct file-path imports that existed before `c73e5c1` have all been replaced.

---

### MAJOR-3 — Offline-disabled tests for `detail-save-name` and `detail-resend-invite`

**Status: PASS**

`StaffDetailScreen.test.tsx` now contains two offline-specific tests:

1. **Line 144** — `'disables mutations and shows the offline banner when offline'`: asserts `detail-save-name` has `accessibilityState.disabled === true` and pressing it does not call `mockUpdate`. The existing remove-button assertion is preserved.

2. **Line 159** — `'disables the resend action for an INVITED member when offline (US-004)'` (new test): sets `isConnected: false`, seeds an INVITED staff fixture, asserts `detail-resend-invite` has `accessibilityState.disabled === true`, presses it, and asserts `mockResend` was never called.

The FEATURE_PLAN also requires `detail-save-perms` to be disabled offline. The existing `mutationsDisabled` check (`!isConnected || isOwnerRow`) disables the `detail-save-perms` button (line 519 of `StaffDetailScreen.tsx` has `disabled={mutationsDisabled}`). The existing test at line 144 asserts `mockRemove` is not called, but does not explicitly check `detail-save-perms.props.accessibilityState.disabled`. This is a minor gap — see BUG-001 below.

---

### MAJOR-4 — `handleResend` uses the shared `mutate()` wrapper

**Status: PASS**

`c73e5c1` removes the standalone IIFE pattern entirely. The new `handleResend` (lines 224-237 in the current `StaffDetailScreen.tsx`) calls `void mutate(async () => { ... }, undefined, () => void fetchStaffDetail(staffId))`. The `mutate()` signature was extended with an `onError?: () => void` parameter in the same commit. The guard is now: `mutate()` checks `busy.current || !isConnected` at the start — both the success DTO (`setResendResult(result)`) and the 422 re-fetch (`onError` lambda) are inside the wrapper. Double-tap safety is provided by the single `busy.current` ref that `mutate()` already manages for all other actions on the screen. The test at line 247 (`'re-fetches detail when resend fails (422 race)'`) confirms `mockFetchDetail` is called twice (mount + failed resend).

---

### MINOR-1 — `formatLocaleDate` in `src/utils/formatDate.ts` reused by both former duplicates

**Status: PASS**

`src/utils/formatDate.ts` was created in `c73e5c1` with a single exported `formatLocaleDate(iso: string): string` function. `StaffDetailScreen.tsx` imports `formatLocaleDate` from `@utils/formatDate` (replacing the local `formatJoinedDate`). `InviteShareSheet.tsx` imports `formatLocaleDate` from `@utils/formatDate` (replacing its local `formatExpiry`). Neither file contains a local date formatter. TypeScript strict passes.

---

### MINOR-2 — Resend `AppSegmentedControl` onChange is `useCallback`

**Status: PASS**

`c73e5c1` added `const handleResendViaChange = useCallback((i: number) => setResendViaIndex(i), [])` (line 239 in `StaffDetailScreen.tsx`) and the JSX at line 436 now reads `onChange={handleResendViaChange}`. The inline arrow function is gone.

---

### MINOR-3 — `testID="staff-limit-alert"` on the at-cap alert; test queries by testID

**Status: PASS**

`StaffListScreen.tsx` line 232 renders `<AppAlert ... testID="staff-limit-alert" />`. `AppAlert` was updated in `c73e5c1` to accept and thread through a `testID` prop to the root `View`. `StaffListScreen.test.tsx` line 170 queries `screen.getByTestId('staff-limit-alert')` (not a text-based query) to assert the limit alert renders when at cap. The test at line 170 was updated from `getByText(t('roles.staff_limit_reached'))` to `getByTestId('staff-limit-alert')`.

---

## Independent Checks

### 1. Static Analysis

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors, 0 warnings |
| `npm run lint` | 0 errors, 92 warnings (all pre-existing test-file import-order + axios named-export warnings; 0 attributable to US-004) |
| `npx jest` (full suite) | 227 tests, 0 failures, 0 skipped |
| US-004-scoped (`--testPathPattern=roles`) | 113 tests, 0 failures |

The 92 lint warnings are pre-existing project-wide patterns (jest mock hoisting causing `import/first` warnings in test files; `import/no-named-as-default-member` on axios usage). None are newly introduced by US-004.

---

### 2. Contract Spot-Checks

**Resend 422 path:**
`errorMapper.ts` context `'resend'` maps HTTP 422 → `'roles.error_resend_not_pending'`. Store `resendInvite` calls `mapApiError(err, 'resend')` and rethrows. Screen `handleResend` fires the `onError` callback (re-fetch detail) on throw. Mock service throws `Error('roles.error_resend_not_pending')` when `staff.status !== 'INVITED'`. Store test at line 249 asserts the 422 mapping. Screen test at line 247 asserts `fetchStaffDetail` is called twice on failure. PASS.

**Permissions full 3-key grant-map writeback to both `staffDetail` and `staffList`:**
Store `updatePermissions` (lines 237-257) extracts `granted` keys from the returned `permissions[]`, then writes `staffDetail[staffId].permissions = granted` and maps `staffList` row. Store test at line 257 verifies both `staffDetail['staff-1'].permissions` and `staffList[0].permissions` are updated to `['mark_deliveries', 'mark_leaves']` after a successful call. Screen test at line 192 verifies the screen sends the correct full 3-key grant map via `mockUpdatePermissions`. PASS.

**`limits` read from `data.meta.limits`:**
`roles.service.ts` real-mode path (lines 84-93): `const meta = data.meta as StaffListMeta & { limits?: StaffLimitsDto }; return { ..., limits: meta.limits ?? null }`. PASS.

**451 invite-over-cap:**
`errorMapper.ts` context `'invite'` maps 451 → `'roles.error_staff_limit'` (line 48). `mockStaffLimitsAtCap` fixture exported from `roles.mock.ts` (`maxStaff: 4, currentActive: 4, canAddMore: false`). StaffListScreen gates the FAB with `disabled={!isConnected || !canAddMore}`. Test at line 164 confirms FAB tap does not navigate when at cap. PASS.

**Owner permission no-op:**
Service mock (lines 233-236): if `staff.role === 'owner'`, returns all-allow immediately without mutating the mock list. Store writes whatever the server returns (`update` on lines 243-250). Screen never renders permission toggles for owner rows (`!isOwnerRow` guard on line 506). PASS.

**Unlimited stub — hides usage line + keeps invite enabled:**
`StaffListScreen.tsx` lines 85-88: `canAddMore = staffLimits?.canAddMore ?? true` (null = treat as unlimited); `showUsage = staffLimits != null && staffLimits.maxStaff != null`. Test at line 142 asserts `staff-usage` testID is absent when `maxStaff: null`, and pressing the FAB navigates normally. PASS.

**At-cap disables invite:**
`StaffListScreen.tsx` line 280: `disabled={!isConnected || !canAddMore}`. Test at line 164 asserts FAB press does not fire `router.push`. PASS.

---

### 3. i18n Integrity

All 10 new `roles.*` keys are present in all 9 locale files (`en`, `hi`, `ta`, `te`, `mr`, `bn`, `kn`, `ml`, `gu`) with genuine non-English translations (confirmed by programmatic diff against `en.json` — 0 same-as-English values in any regional locale). ICU interpolation placeholders `{{current}}` and `{{max}}` are present in all locales for `roles.staff_usage`. All 9 JSON files parse without error (validated via `node -e "require('./src/locales/xx.json')"`). No orphan or missing keys detected for the 10 new additions. PASS.

---

### 4. Regression Check

**Permissions endpoint switch (PATCH /staff → PATCH /permissions):**
This is intentional per the FEATURE_PLAN (Section "Dedicated permissions endpoint"). The US-002 `updateStaff({permissions})` call for permission saves has been replaced by `updatePermissions(staffId, grants)` which hits `APIPath.Staff.Permissions(v,s)`. The `APIPath.Staff.Detail` path is still used for name/status/areaLabel saves via `updateStaff`. PASS — intentional, documented, and tested.

**Assign/unassign (US-005) untouched:**
`APIPath.Staff.Lists` and `APIPath.Staff.ListDetail` are unchanged. `rolesService.assignLists` and `rolesService.unassignList` are unchanged. `roles.store.ts` `assignLists` and `unassignList` actions are unchanged. The US-005 OQ-6 note is preserved in file headers. PASS.

**No unrelated WIP swept into US-004 commits:**
`git diff --name-only main..HEAD` shows exactly the 29 files expected for US-004 (types, apiPaths, mocks, errorMapper, 9 locales, InviteShareSheet+test, components/index.ts, InviteStaffScreen, StaffDetailScreen+test, StaffListScreen+test, service+test, store+test, docs, AppAlert, formatDate.ts). The ~31 uncommitted WIP files (`src/modules/auth/**`, `src/components/composite/**`, `src/components/primitives/**` except AppAlert, `src/hooks/useNetworkStatus.ts`) remain unstaged — they were not committed in any of the three US-004 commits. PASS.

---

### 5. Skills Definition of Done Spot-Check

| Check | Result |
|---|---|
| Tokens only (no hardcoded hex/px) | PASS — `colors.*`, `spacing.*`, `borderRadius.*`, `shadows.*` tokens used throughout; `AppAlert` change uses only token-based style variables |
| `start`/`end` instead of `left`/`right` | PASS — no `left`/`right` layout props introduced in US-004 files |
| 44px touch targets | PASS — all new buttons use `AppButton` (≥44×44 enforced at primitive level); `InviteShareSheet` share buttons use `AppButton fullWidth` |
| 5 screen states (StaffListScreen) | PASS — Loading (skeleton), Empty (no staff), Error (inline retry), Content (+ limits line, at-cap alert), Offline (banner + disabled FAB) all present |
| 5 screen states (StaffDetailScreen) | PASS — Loading (skeleton), Empty/404 (not-found empty state), Error (staffError banner), Content (name edit + permissions + resend if INVITED), Offline (banner + all mutations disabled) |
| Color not the only signal | PASS — at-cap alert uses `AppAlert type="info"` (left border + tinted background + text); disabled FAB has `accessibilityHint`; limit messaging is always paired with text |
| `accessibilityHint` on disabled interactive elements | PASS — FAB: `t('roles.staff_limit_hint')` when at cap, `t('common.needs_connection')` when offline; resend button: `t('common.needs_connection')` when offline |
| No PII in `logError` | PASS — all `logError` calls in the new store actions pass only `staffId` + endpoint context, never phone/name |

---

## Bugs Found

### BUG-001: `detail-save-perms` offline disabled state not explicitly asserted in tests
- **Severity**: Low
- **Category**: Testing
- **Device**: N/A (static analysis)
- **Network**: Offline path
- **Language**: en
- **Steps to Reproduce**:
  1. Review `StaffDetailScreen.test.tsx` line 144 ("disables mutations" test)
  2. Note: `detail-save-name` disabled assertion exists (line 149), `detail-resend-invite` offline test is a dedicated test (line 159), but no assertion checks `detail-save-perms.props.accessibilityState.disabled` in the offline scenario.
- **Expected**: Per FEATURE_PLAN "all three new US-004 actions disabled offline"; MAJOR-3 fix addressed name save and resend but the permissions save test assertion was omitted.
- **Actual**: The `detail-save-perms` button IS correctly disabled at runtime (`disabled={mutationsDisabled}` is present in the screen code at line 519), but the test does not assert it is disabled offline. Runtime correctness is not in doubt; only test coverage completeness.
- **Status**: Open

---

## Test Results

| Category | Total | Pass | Fail | Blocked |
|---|---|---|---|---|
| Review Findings (MAJOR x4, MINOR x3) | 7 | 7 | 0 | 0 |
| Contract Spot-Checks | 7 | 7 | 0 | 0 |
| i18n Integrity (10 keys × 9 locales) | 90 | 90 | 0 | 0 |
| Regression Check | 3 | 3 | 0 | 0 |
| Skills DoD Spot-Check | 8 | 8 | 0 | 0 |
| TypeScript Strict | 1 | 1 | 0 | 0 |
| Lint (0 errors) | 1 | 1 | 0 | 0 |
| Jest Suite (227 tests) | 227 | 227 | 0 | 0 |
| **TOTAL** | **344** | **344** | **0** | **0** |

---

## Bug Summary

| Severity | Count | Open | Fixed | Verified | Blocking Release? |
|---|---|---|---|---|---|
| Critical | 0 | 0 | — | — | N/A |
| High | 0 | 0 | — | — | N/A |
| Medium | 0 | 0 | — | — | No |
| Low | 1 | 1 | 0 | 0 | No |

---

## Overall Assessment

- [x] **PASS** — Feature ready for release (0 Critical, 0 High open bugs)

BUG-001 is a test-coverage gap only (the runtime behaviour is correct — `mutationsDisabled` covers `detail-save-perms` at line 519 of `StaffDetailScreen.tsx`). It does not affect user-facing correctness and is non-blocking.

---

## Notes

1. All 7 review findings (MAJOR-1 through MAJOR-4 and MINOR-1 through MINOR-3) are resolved and verified by code inspection and test execution.
2. The 92 lint warnings are entirely pre-existing patterns from US-002 jest test files and shared utilities. Zero warnings are attributable to US-004 changes.
3. The `AppAlert` change in `c73e5c1` is narrowly scoped (adds `testID?: string` prop and threads it to the root `View`) — no unrelated changes to the primitive; the prop is backward-compatible (optional). The uncommitted WIP changes to `AppAlert` in the working tree are unrelated to US-004.
4. Commit `c73e5c1` touches 11 files; none are outside the US-004 scope except `AppAlert.tsx` (MINOR-3 fix requiring the prop addition to the primitive). This is justified — MINOR-3 required a minimal primitive extension with zero risk.
5. The OQ-6 assign/unassign path mismatch is intentionally left as-is per the FEATURE_PLAN recommendation. It is 503-gated server-side and does not affect any reachable code path in US-004.

---

## Signoff
- **QA Agent**: PASS on 2026-06-11
- **Submitted to**: Architect Agent for final signoff
