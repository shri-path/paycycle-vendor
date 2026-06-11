# Feature Bugs: US-005 Supply Lists Management — Frontend

> Populated by the QA agent during testing. Severity: Critical / High / Medium / Low.
> Status: Open / In Progress / Fixed / Verified / Won't Fix / Deferred.
> Reproduce on a low-end Android profile (2 GB RAM, Android 8+) where relevant, and note
> mock vs. real API mode (`EXPO_PUBLIC_API_MODE`).

---

### BUG-001: AddCustomersScreen custom qty/rate inputs have no inline error messages
- **Severity**: High
- **Category**: Form Validation / UX
- **Device**: Any (static code analysis — not runtime-device-specific)
- **Network**: Any
- **Language**: All 9 locales
- **Steps to Reproduce**:
  1. Owner navigates to a supply list detail screen.
  2. Taps "+ Add Customers".
  3. Selects one or more available customers.
  4. Switches quantity radio to "Custom quantity".
  5. Types a negative number (e.g. "-5") or a non-numeric value (e.g. "abc") in the custom qty field.
  6. Taps "ADD N CUSTOMERS".
- **Expected**: An inline `error` prop is rendered on the custom quantity (and custom rate) `AppInput` fields identifying the invalid entry, consistent with the CRITICAL-2 fix applied in `SupplyListDetailScreen` (edit-sub sheet) per `form-validation.md`.
- **Actual**: `handleAdd` in `AddCustomersScreen.tsx` (lines 194-199) validates qty/rate but only fires a haptic notification on failure. Neither the custom-qty `AppInput` (line 359-366) nor the custom-rate `AppInput` (line 380-387) passes an `error` prop. The user receives no textual feedback about what to fix; the submit silently fails.
- **File Pointer**: `src/modules/supply-lists/screens/AddCustomersScreen.tsx` — `handleAdd` function (~L189) and the two `AppInput` blocks for `custom-qty` / `custom-rate` (~L358-L387).
- **Screenshot/Recording**: N/A (code inspection)
- **Status**: Fixed — `handleAdd` now sets `customQtyError`/`customRateError` (`validation.invalid_number`) on failure, cleared on change, wired to both `AppInput error` props. Regression test added (`AddCustomersScreen.test.tsx` — "shows an inline error and skips add for an invalid custom quantity").

---

### BUG-002: StaffSupplyListsScreen has `showBack` on a tab-root equivalent screen
- **Severity**: Medium
- **Category**: UX / Navigation
- **Device**: Any Android (2 GB RAM, Android 8+)
- **Network**: Any
- **Language**: All
- **Steps to Reproduce**:
  1. Log in as a staff member.
  2. Navigate to the "My Lists" screen (`/(app)/my-lists/`).
  3. Observe the `AppHeader` — it shows a back-arrow button.
- **Expected**: The "My Lists" screen is the staff entry-point equivalent of a tab root (per FEATURE_PLAN navigation spec and wireframe 18). It should have NO back button. The identical finding was already fixed for `SupplyListsScreen` (MAJOR-6 in REVIEW_REPORT), but the fix was not applied to `StaffSupplyListsScreen`.
- **Actual**: `StaffSupplyListsScreen.tsx` line 84 renders `<AppHeader title={t('supply.my_lists_title')} showBack onBackPress={() => router.back()} />`. Staff on Android will see a back arrow with nowhere meaningful to navigate. Tapping it calls `router.back()` from a tab-root screen, which may navigate out of the app's auth flow or produce unexpected behaviour.
- **File Pointer**: `src/modules/supply-lists/screens/StaffSupplyListsScreen.tsx`, line 84.
- **Screenshot/Recording**: N/A (code inspection)
- **Status**: Fixed — header is now `<AppHeader title={t('supply.my_lists_title')} />` (no `showBack`/`onBackPress`).

---

## Notes / Test Environment
- API mode: mock (`EXPO_PUBLIC_API_MODE=mock`)
- Locales spot-checked: 9/9 (en, hi, ta, te, mr, bn, kn, ml, gu) — all 7 new i18n keys verified present in each locale file
- Backend branch under test: `feat/us-005-supply-lists`
- Frontend branch under test: `feat/us-005-supply-lists-frontend`
- Known stubs in play: `DeliveryStats` zeroed until US-006 (today/month cards show "no data yet"); customers depend on US-008 (available-customers may be empty on a fresh vendor — see OQ-6).
- TypeScript: 0 errors (`tsc --noEmit`)
- Tests: 361/361 passing (34 suites) after BUG-001/BUG-002 fixes
- ESLint: 0 errors (repo-wide `import/first` jest-mock-hoist warnings — pre-existing, not introduced by US-005)

## Resolution (post-QA fix pass)
- BUG-001 (High) — Fixed & regression-tested.
- BUG-002 (Medium) — Fixed.
- Re-verified: `tsc --noEmit` 0 errors, `jest` 361/361, lint 0 errors. No open bugs remain.
