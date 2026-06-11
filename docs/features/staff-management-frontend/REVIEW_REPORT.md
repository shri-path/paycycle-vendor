# Code Review Report: US-004 Staff Management — Frontend

## Summary
- **Date**: 2026-06-11
- **Reviewer**: Review Agent
- **Commits reviewed**: `206aeb0b` (feat) + `917ac5d2` (docs)
- **Branch**: `fix/reset-password-otp-only`
- **Feature Plan**: `docs/features/staff-management-frontend/FEATURE_PLAN.md`
- **Overall Assessment**: APPROVED WITH CONDITIONS — 0 BLOCKER, 0 CRITICAL, 4 MAJOR, 3 MINOR

The implementation is architecturally sound and meets the feature plan faithfully. Contract fidelity, security, multi-tenancy, i18n, haptics, error handling, and the core test suite are all in good shape. Four MAJOR findings must be resolved before this is considered complete; none are blockers.

---

## Statistics

| Severity  | Count |
|-----------|-------|
| BLOCKER   | 0     |
| CRITICAL  | 0     |
| MAJOR     | 4     |
| MINOR     | 3     |
| INFO      | 1     |

---

## Findings

### MAJOR-1: `ALL_PERMISSION_KEYS` duplicated in service and screen — violation of DRY and type-correctness boundary

- **File**: `src/modules/roles/service/roles.service.ts:51` AND `src/modules/roles/screens/StaffDetailScreen.tsx:54`
- **Skill Violated**: `api-integration.md` Rule 9 — "No business logic beyond request/response shaping"; `component-development.md` Rule 3 — "No business logic in components/screens"
- **Description**: The hardcoded array `['mark_deliveries', 'mark_leaves', 'add_extra_charges']` is defined twice. The service defines it to drive mock MERGE logic; the screen defines it to build the full grant map before calling `updatePermissions`. If a fourth permission is added to the backend (`staff.types.ts`), both copies must be updated — and the service copy's mock will diverge from the screen's grant map, producing a test that passes mock but breaks real mode.
- **Expected**: Export a single source of truth. The correct home is `src/types/roles.ts` (or `src/constants/roles.ts`) as an exported const derived from the `PermissionKey` type. The service and screen import it.
- **Suggestion**:
  ```ts
  // src/types/roles.ts — add:
  /** All grantable permission keys, in canonical order. */
  export const ALL_PERMISSION_KEYS: PermissionKey[] = [
    'mark_deliveries',
    'mark_leaves',
    'add_extra_charges',
  ] as const
  ```
  Then `import { ALL_PERMISSION_KEYS } from '../../../types/roles'` in both service and screen.

---

### MAJOR-2: `InviteShareSheet` is a module-internal component but is not exported from the module-level barrel — component-development DoD item unverified

- **File**: `src/modules/roles/components/InviteShareSheet.tsx` — no `src/modules/roles/components/index.ts` barrel exists; `component-development.md` DoD item "Added to barrel export in `src/components/index.ts`"
- **Skill Violated**: `component-development.md` — Definition of Done: "Exported from `src/components/index.ts`"
- **Description**: `InviteShareSheet` is a new reusable component consumed by two screens. It is not exported from any barrel (`src/components/index.ts` has no reference to it; `src/modules/roles/components/` has no `index.ts`). Future consumers must reference the full file path, which bypasses the import hygiene the project enforces for shared components.
- **Expected**: Module-internal components that are shared across multiple screens within the module should be exported from `src/modules/roles/components/index.ts`. If the component is intended to be project-wide reusable, it must be moved to `src/components/composite/` and exported from `src/components/index.ts`.
- **Suggestion**: Create `src/modules/roles/components/index.ts` that re-exports `InviteShareSheet`, `PermissionToggleList`, `StaffCard`, and `SupplyListMultiSelect`. Alternatively, promote `InviteShareSheet` to `src/components/composite/` (preferred if it may be used outside the roles module in future invite flows).

---

### MAJOR-3: `StaffDetailScreen` — new US-004 actions (name save, resend) not covered for the offline-disabled state in tests

- **File**: `src/modules/roles/screens/__tests__/StaffDetailScreen.test.tsx`
- **Skill Violated**: `testing-strategy.md` — Definition of Done: "All 5 screen states have a test; unhappy paths covered"; `screen-development.md` — "Network-dependent actions disabled offline"
- **Description**: The existing test at line 144 (`'disables mutations and shows the offline banner when offline'`) covers the pre-US-004 remove-button path. There are no tests confirming that the three new US-004 actions — name save (`detail-save-name`), resend invite (`detail-resend-invite`), and the permissions save (`detail-save-perms`) — are individually disabled / cannot fire when `isConnected === false`. The happy-path offline banner test inherited from US-002 does not call `fireEvent.press` on the new buttons.
- **Expected**: Per `testing-strategy.md`, unhappy paths (offline, error) must be tested for each new interactive action. Add assertions that `detail-save-name`, `detail-resend-invite`, and the resend segmented control are disabled/non-functional when offline.
- **Suggestion**: Extend the existing "disables mutations" test to also assert:
  ```ts
  expect(screen.getByTestId('detail-save-name').props.disabled).toBe(true)
  expect(screen.getByTestId('detail-resend-invite').props.disabled).toBe(true)
  ```
  Or add a dedicated offline test for the new actions.

---

### MAJOR-4: `handleResend` bypasses the `mutate()` double-tap guard's `busy.current` check on the async IIFE path — potential double-submit

- **File**: `src/modules/roles/screens/StaffDetailScreen.tsx:245-264`
- **Skill Violated**: `screen-development.md` Rule 6 — "Double-tap protection on submit — guard with a `useRef` flag + the store's `isLoading`"
- **Description**: `handleResend` checks `busy.current` before setting it to `true`, then launches an `async IIFE` that manages `busy.current` itself, **separate** from the shared `mutate()` wrapper. This is a divergent double-tap guard. The issue: if `handleResend` is called twice in rapid succession (e.g. a double-tap before the first async IIFE runs past the `busy.current = true` line), both calls pass the `if (!staffId || busy.current || !isConnected) return` guard because `busy.current` is still `false` at the time both synchronous guards execute (the first async IIFE hasn't set `busy.current = true` yet in the React event loop). The store's `isStaffLoading` is set to `true` by the store action, but the screen guard reads `busy.current`, not `isStaffLoading`.
- **Expected**: Use the existing `mutate()` wrapper for `handleResend`, which already manages `busy.current` safely:
  ```ts
  const handleResend = useCallback(() => {
    if (!staffId) return
    const sendVia = SEND_VIA[resendViaIndex]
    void mutate(async () => {
      const result = await resendInvite(staffId, sendVia)
      setResendResult(result)
    })
  }, [staffId, resendViaIndex, mutate, resendInvite])
  ```
  The `mutate()` wrapper already fires the Medium haptic on entry and Success/Error on settle, so the separate haptic calls in `handleResend` can be removed.
- **Note**: On 422, `mutate()` calls its `catch` which fires the Error haptic — the `fetchStaffDetail` re-fetch on 422 must be moved to a `catch` block inside the lambda, or passed as an `onError` callback if you extend `mutate()`.

---

### MINOR-1: `formatJoinedDate` duplicated in `StaffDetailScreen` and `InviteShareSheet` (`formatExpiry`)

- **File**: `src/modules/roles/screens/StaffDetailScreen.tsx:84` and `src/modules/roles/components/InviteShareSheet.tsx:44`
- **Skill Violated**: CLAUDE.md architecture principle — DRY; `api-integration.md` / `component-development.md` — no duplicated logic
- **Description**: Both files independently define an identical locale-aware ISO-date formatter with identical fallback logic. Already a duplication.
- **Suggestion**: Extract to `src/utils/formatDate.ts` (or add to `src/utils/index.ts`), export as `formatLocaleDate(iso: string): string`, and import in both places.

---

### MINOR-2: `resendViaIndex` segment-change handler is an inline arrow in JSX — creates a new function on every render

- **File**: `src/modules/roles/screens/StaffDetailScreen.tsx:462`
- **Skill Violated**: `performance-optimization.md` — "useCallback on event handlers passed to memoized children"
- **Description**: `onChange={(i) => setResendViaIndex(i)}` is an inline arrow function. `AppSegmentedControl` receives a new function reference on every render of `StaffDetailScreenContent`. While `StaffDetailScreen` is not a list, this is a `ScrollView`-heavy screen and the pattern is inconsistent with all other handlers in the same file which use `useCallback`.
- **Suggestion**:
  ```ts
  const handleResendViaChange = useCallback((i: number) => setResendViaIndex(i), [])
  // ...
  <AppSegmentedControl ... onChange={handleResendViaChange} />
  ```

---

### MINOR-3: `AppAlert` for the limit-reached state is rendered above the `countRow` but inside the `SafeAreaView` without a `testID` — not easily assertable in tests

- **File**: `src/modules/roles/screens/StaffListScreen.tsx` (in the content section, around the AppAlert render)
- **Skill Violated**: `testing-strategy.md` Rule 2 — "Query by accessibility / testID; this also validates a11y labels exist"
- **Description**: The `AppAlert` rendered when `!canAddMore` (limit reached) has no `testID`. The test at `StaffListScreen.test.tsx:163` asserts `getByText(t('roles.staff_limit_reached'))` which is brittle (text-based query). Adding `testID="staff-limit-alert"` would make the test accessibility-compliant and locale-independent.
- **Suggestion**: Add `testID="staff-limit-alert"` to the `AppAlert` and update the test to use `getByTestId('staff-limit-alert')`.

---

### INFO-1: `ListStaffResponseDto` backend type is not imported / used on the frontend for type-safety

- **File**: `src/modules/roles/service/roles.service.ts:93`
- **Description**: The real-mode path casts `data.meta as StaffListMeta & { limits?: StaffLimitsDto }`. The backend's `ListStaffResponseDto` already defines the full shape (`items`, `pagination`, `limits`). Although the cast is safe given the backend implementation, using a typed import from `src/types/roles.ts` (if `ListStaffResponseDto` were mirrored there) would make future contract drift immediately visible as a TypeScript error. This is a suggestion, not a blocking issue, as the current cast is guarded by the existing test.
- **Suggestion**: Consider mirroring `ListStaffResponseDto` in `src/types/roles.ts` (it is currently absent) to let TypeScript enforce the response shape rather than relying on runtime casts.

---

## Contract Fidelity Verification

| Capability | Backend Contract | Frontend Implementation | Status |
|---|---|---|---|
| Resend path | `POST /vendors/:vendorId/staff/:staffId/resend-invitation` | `APIPath.Staff.ResendInvitation(v,s)` = same | PASS |
| Resend body | `{ sendVia?: InviteChannel }` | `sendVia ? { sendVia } : {}` | PASS |
| Resend 422 | 422 when not INVITED | `mapApiError(err, 'resend')` → `roles.error_resend_not_pending` | PASS |
| Permissions path | `PATCH /vendors/:vendorId/staff/:staffId/permissions` | `APIPath.Staff.Permissions(v,s)` = same | PASS |
| Permissions body | `{ permissions: {key, granted}[] }` | Full 3-key map built in screen | PASS |
| Permissions MERGE + writeback | Returns full grant state; both `staffDetail` and `staffList` updated | `updatePermissions` action writes both | PASS |
| `meta.limits` location | Backend merges `limits` into `meta` in `sendListResponse` | Frontend reads `data.meta.limits` | PASS |
| `maxStaff: null` unlimited stub | `maxStaff: null` = unlimited | `showUsage` gated on `maxStaff !== null` | PASS |
| 451 invite over-cap | Already handled by `invite` context | Unchanged; FAB gate prevents reaching it | PASS |
| Owner no-op permissions | Backend returns all-allow; store writes it back | Store overwrites whatever server returns | PASS |
| `name` on `UpdateStaffInput` | `PATCH /staff/:staffId` accepts `name?` | Added to type + service patch body | PASS |

---

## Security & Multi-Tenancy Verification

| Check | Result |
|---|---|
| `vendorId` NOT in resend body | PASS — `{ sendVia }` only |
| `vendorId` NOT in permissions body | PASS — `{ permissions: grants }` only |
| JWT-derived `vendorId` via `getActiveVendorId()` for URL routing | PASS |
| No PII (phone/name) in `logError` calls | PASS — only `staffId` + endpoint context |
| Tokens never in Zustand state | PASS — `staffLimits` non-persisted, no sensitive data |
| `clearRoles()` wipes `staffLimits` via `initialNonPersisted` spread | PASS |

---

## i18n Verification

All 10 new `roles.*` keys confirmed present and genuinely translated (not English placeholders) across all 9 locale files (`en`, `hi`, `ta`, `te`, `mr`, `bn`, `kn`, `ml`, `gu`). ICU interpolation syntax (`{{current}}`, `{{max}}`) is consistent across all locales. `send_whatsapp` / `send_sms` keys (used by the `AppSegmentedControl` in StaffDetailScreen) were already present in all 9 locales from the US-002 implementation and are correctly reused. `staff_name_placeholder` is correctly reused (pre-existing key).

---

## Skill Compliance Summary

| Skill | Status | Notes |
|---|---|---|
| component-development.md | MAJOR | `InviteShareSheet` not in barrel export; `ALL_PERMISSION_KEYS` duplicated (MAJOR-1, MAJOR-2) |
| screen-development.md | MAJOR | 5 states present on both screens; new actions missing offline test coverage (MAJOR-3); double-tap guard on `handleResend` is fragile (MAJOR-4) |
| state-management.md | PASS | `staffLimits` non-persisted, `useShallow` used, actions follow set→try→catch, `clearRoles` wipes it |
| api-integration.md | MINOR | Contract-correct; `ALL_PERMISSION_KEYS` duplication is a logic-boundary issue (MAJOR-1); `ListStaffResponseDto` not mirrored (INFO-1) |
| offline-first.md | PASS | Writes online-only; limits cached in-memory; offline banner shown; buttons disabled offline |
| navigation-routing.md | N/A | No navigation changes in US-004 |
| performance-optimization.md | MINOR | FlatList still correctly tuned; inline arrow on segmented control (MINOR-2) |
| localization-i18n.md | PASS | All 10 new keys present and genuinely translated in all 9 locales; ICU placeholders consistent |
| animation-haptics.md | PASS | Haptics present on all interactions; Medium impact on action start, Success/Error on settle |
| testing-strategy.md | MAJOR | New offline state not tested for US-004 actions (MAJOR-3); otherwise service/store/component/screen tests are thorough |
| form-validation.md | PASS | `validateStaffName` used with inline error; sanitize-on-change; name trim on save |
| accessibility-ux.md | PASS | Touch targets use `AppButton` (>=44px); `accessibilityHint` on disabled FAB; limit alert uses color+text+icon |
| ui-visual-design.md | PASS | `shadows.md` token correctly replaces raw `elevation: 4`; all colors/spacing from tokens; no hardcoded hex |
| error-handling.md | PASS | `ScreenErrorBoundary` present; `mapApiError` used correctly; `logError` with context (no PII); 422 re-fetch on resend |
| security-auth.md | PASS | No `vendorId` in bodies; no PII in logs; `staffLimits` non-persisted; `clearRoles` on logout |
| real-time-sync.md | N/A | No socket changes in US-004 |

---

## Summary for Dev

**4 MAJOR findings to resolve:**

1. **MAJOR-1** — Extract `ALL_PERMISSION_KEYS` to `src/types/roles.ts`; remove both duplicate definitions.
2. **MAJOR-2** — Create `src/modules/roles/components/index.ts` barrel exporting `InviteShareSheet` (and the other 3 components). Consider promoting to `src/components/composite/` if the component has cross-module uses.
3. **MAJOR-3** — Add offline-disabled assertions for `detail-save-name` and `detail-resend-invite` buttons in `StaffDetailScreen.test.tsx`.
4. **MAJOR-4** — Replace the custom `busy.current` IIFE in `handleResend` with the existing `mutate()` wrapper to use the same double-tap guard as all other actions on the screen.

**3 MINOR findings** (fix in follow-up): extract `formatJoinedDate`/`formatExpiry` into a shared utility, add `useCallback` to the segmented control handler, and add `testID="staff-limit-alert"` to the limit-reached `AppAlert`.

Once MAJOR-1 through MAJOR-4 are resolved, this implementation is ready for QA.
