# Code Review Report: US-003 Authentication

## Summary
- **Date**: 2026-06-07 (re-verification pass)
- **Reviewer**: Review Agent
- **Commit**: `3307541` — bug fixes (post-fix pass)
- **Branch**: `feat/us-003-authentication`
- **Feature Plan**: No `FEATURE_PLAN.md` found — reviewed against skills and CLAUDE.md.
- **Overall Assessment**: ⚠️ Approved with Conditions

---

## Re-Verification Context

This is a targeted re-verification after a fix pass that addressed the following original findings from the initial review:

**Fixed in this pass (per dev context)**: BLOCKER-1, BLOCKER-2, BLOCKER-3, CRITICAL-1, CRITICAL-2, CRITICAL-3, CRITICAL-4, MAJOR-2, MAJOR-3, MAJOR-4, MAJOR-5, MAJOR-6, MAJOR-7, MAJOR-8, MAJOR-9, MINOR-1, MINOR-4.

**NOT fixed in this pass (interrupted/rejected)**: SignupScreen, ResetPasswordScreen, and their tests (CRITICAL-2 for those two screens, CRITICAL-3, MAJOR-2 through MAJOR-8 on those two screens, MINOR-1, MINOR-3).

---

## Statistics (Updated)

| Severity | Original | Resolved | Partial | Open |
|----------|----------|----------|---------|------|
| BLOCKER  | 3        | 3        | 0       | 0    |
| CRITICAL | 4        | 2        | 0       | 2    |
| MAJOR    | 9        | 6        | 0       | 3    |
| MINOR    | 5        | 3        | 0       | 2    |
| INFO     | 3        | —        | —       | 3    |

---

## Finding Status (Item by Item)

---

### BLOCKER-1: JWT tokens persisted in AsyncStorage — RESOLVED

- **Evidence**: `src/modules/auth/store/auth.store.ts:33–52` — `storeTokens()` uses `SecureStore.setItemAsync`. `partialize` at line 240–244 persists only `isAuthenticated`, `user`, `vendorContext` — no tokens. Store test at `auth.store.test.ts:122–128` asserts `SecureStore.setItemAsync` is called with the correct keys.
- **Status**: RESOLVED

---

### BLOCKER-2: Reset token stored in Zustand state — RESOLVED

- **Evidence**: `src/modules/auth/store/auth.store.ts:164–167` — `forgotPassword` calls `SecureStore.setItemAsync(SECURE_KEY_PENDING_RESET_TOKEN, resetToken)`. The `resetPassword` action reads it back via `SecureStore.getItemAsync` (line 192). `pendingResetToken` is gone from the Zustand state interface entirely; `pendingResetPhone` (non-sensitive, just the display number) remains in-memory but is not persisted (not in `partialize`).
- **Status**: RESOLVED

---

### BLOCKER-3: Dev OTP hint visible in production — RESOLVED

- **Evidence**: `src/modules/auth/screens/ResetPasswordScreen.tsx:167` — guard changed to `{__DEV__ ? (...)  : null}`. `isMockMode` and `MOCK_OTP` imports removed from the screen.
- **Status**: RESOLVED

---

### CRITICAL-1: No tests for any auth screen, store, or service — RESOLVED (with open sub-issue)

- **Evidence**: Seven test files now exist:
  - `src/utils/__tests__/validation.test.ts` — PASS (32 tests)
  - `src/modules/auth/service/__tests__/auth.service.test.ts` — PASS (6 tests)
  - `src/modules/auth/store/__tests__/auth.store.test.ts` — PASS (13 tests)
  - `src/modules/auth/screens/__tests__/LoginScreen.test.tsx` — PASS (8 tests)
  - `src/modules/auth/screens/__tests__/ForgotPasswordScreen.test.tsx` — PASS (9 tests)
  - `src/modules/auth/screens/__tests__/SignupScreen.test.tsx` — PARTIAL FAIL (2 of 11 tests failing — see CRITICAL-T1 below)
  - `src/modules/auth/screens/__tests__/ResetPasswordScreen.test.tsx` — FAIL (7 of 11 tests failing — see CRITICAL-T2 below)
- **Overall test result**: 87 pass / 9 fail out of 96 tests. TypeScript typecheck: PASS (no errors).
- **Status**: PARTIAL — infrastructure exists but two screen test suites have failures

---

### CRITICAL-2: No `ScreenErrorBoundary` on any auth screen — RESOLVED

- **Evidence**: All four screens now use the inner-content pattern:
  - `LoginScreen.tsx:248–253` — `ScreenErrorBoundary` wraps `LoginScreenContent`
  - `SignupScreen.tsx:275–280` — `ScreenErrorBoundary` wraps `SignupScreenContent`
  - `ForgotPasswordScreen.tsx:169–174` — `ScreenErrorBoundary` wraps `ForgotPasswordScreenContent`
  - `ResetPasswordScreen.tsx:252–257` — `ScreenErrorBoundary` wraps `ResetPasswordScreenContent`
- **Status**: RESOLVED

---

### CRITICAL-3: No auth guard on `(app)` layout — RESOLVED

- **Evidence**: `app/(app)/_layout.tsx:11–22` — `isAuthenticated` and `isHydrated` read from store via `useShallow`; hydration gate at line 17; `<Redirect href="/(auth)/login" />` at line 20 when unauthenticated.
- **Status**: RESOLVED

---

### CRITICAL-4: `authService` not in barrel export — RESOLVED

- **Evidence**: `src/services/api.service.ts:14` — `export { authService } from '../modules/auth/service/auth.service'` is present.
- **Status**: RESOLVED

---

### MAJOR-1: Raw RN `View`/`StyleSheet` instead of Tamagui — PARTIAL

- **Evidence**: LoginScreen, SignupScreen, ForgotPasswordScreen, and ResetPasswordScreen now use Tamagui `YStack`/`XStack`/`ScrollView` for layout. All four files import from `tamagui`. However, all four screens still use `<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>` with an inline style object rather than a `styled()` wrapper or token prop. `home.tsx` also retains `StyleSheet.create`.
- **Skill Violated**: `component-development.md` — "No inline styles or raw RN `View`/`Text`"
- **Severity**: MAJOR (inline style on root SafeAreaView on every screen)
- **Status**: PARTIAL — layout converted but root `SafeAreaView` still uses inline style

---

### MAJOR-2: No haptic feedback — RESOLVED

- **Evidence**: All four screens import `expo-haptics`. Submit handlers fire `impactAsync(Medium)` on tap and `notificationAsync(Error/Success)` on outcome. Form validation failure fires `notificationAsync(Error)` before returning.
- **Status**: RESOLVED

---

### MAJOR-3: No `accessibilityRole`/`accessibilityLabel` on interactive elements — RESOLVED

- **Evidence**: All back-button `TouchableOpacity` elements have `accessibilityRole="button"` and `accessibilityLabel={t('auth.back')}`. Password-toggle buttons have `accessibilityRole="button"` and `accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}`. Sign-up link `TouchableOpacity` in LoginScreen has `accessibilityRole="button"` and `accessibilityLabel={t('auth.sign_up')}`.
- **Status**: RESOLVED

---

### MAJOR-4: Hardcoded strings in `home.tsx` and `CATEGORIES` — RESOLVED

- **Evidence**:
  1. `app/(app)/home.tsx:46` — `label={t('auth.logout')}` (no longer hardcoded).
  2. `SignupScreen.tsx:34` — `CATEGORY_KEYS` constant with i18n-resolved labels at render time: `CATEGORY_KEYS.map((k) => ({ label: t(\`auth.category_${k}\`), value: k }))`.
  3. `SignupScreen.tsx:248` — `placeholder={t('auth.category_placeholder')}`.
- All `auth.category_*` and `auth.category_placeholder` keys verified present in `en.json`, `hi.json`, `ta.json`, `gu.json` (spot-checked; structure matches across all 9 locales).
- **Status**: RESOLVED

---

### MAJOR-5: Double-tap protection absent — RESOLVED

- **Evidence**: All four screens use `const submitting = useRef(false)` with guard `if (submitting.current || isLoading) return` at the start of each submit handler, and `submitting.current = false` in the `finally` block.
- **Status**: RESOLVED

---

### MAJOR-6: No offline state handling — RESOLVED

- **Evidence**: All four screens import `useNetworkStatus` and conditionally render `<AppAlert type="warning" title={t('auth.offline_sign_in')} />` when `!isConnected`. Submit buttons have `disabled={isLoading || !isConnected}`. The `auth.offline_sign_in` key is present in all 9 locale files.
- **Status**: RESOLVED

---

### MAJOR-7: Raw error strings instead of i18n keys — RESOLVED

- **Evidence**: `src/utils/errorMapper.ts` exists and maps Axios error codes/status codes to i18n keys. `auth.store.ts` calls `mapApiError(err)` in every `catch` block and stores the result as `error`. All screens render `{t(error)}` rather than `{error}` directly.
- **Status**: RESOLVED

---

### MAJOR-8: `REACT_APP_*` env vars broken in Expo — RESOLVED

- **Evidence**: `src/services/config.ts:15` — `process.env.EXPO_PUBLIC_API_MODE`. All three config env vars use `EXPO_PUBLIC_` prefix.
- **Status**: RESOLVED

---

### MAJOR-9: `useShallow` missing on multi-value store selections — RESOLVED

- **Evidence**: All four screens use `useAuthStore(useShallow((s) => ({ ... })))` for their store selections.
- **Status**: RESOLVED

---

### MINOR-1: `validatePassword` duplicated across screens — RESOLVED

- **Evidence**: `src/utils/validation.ts` exports `validatePassword` (full complexity), `validateLoginPassword` (presence-only), `validateOtp`, `validatePhone`, `validateBusinessName`. Neither `SignupScreen` nor `ResetPasswordScreen` defines a local copy.
- **Status**: RESOLVED

---

### MINOR-2: `SignupScreen` over 200 lines — OPEN

- **File**: `src/modules/auth/screens/SignupScreen.tsx` (283 lines)
- **Skill Violated**: `screen-development.md` — "Screen file under 200 lines"
- **Description**: The screen has grown to 283 lines after the fix pass added the full-pattern validation, touched state, double-tap ref, offline hook, and error boundary wrapper. The CATEGORY_KEYS constant and the inner `SignupScreenContent` / outer `SignupScreen` split add lines. While structural extraction (validators are already extracted), there is no further obvious split without introducing a custom `useSignupForm` hook.
- **Status**: OPEN

---

### MINOR-3: `ResetPasswordScreen` over 200 lines — OPEN

- **File**: `src/modules/auth/screens/ResetPasswordScreen.tsx` (260 lines)
- **Skill Violated**: `screen-development.md` — "Screen file under 200 lines"
- **Description**: At 260 lines after the fix pass. The `maskPhone` helper (lines 29–40), inner/outer component split, full validation state, and dev hint block all contribute.
- **Status**: OPEN

---

### MINOR-4: `displayName` not set on screen components — RESOLVED

- **Evidence**:
  - `LoginScreen.tsx:256` — `LoginScreen.displayName = 'LoginScreen'`
  - `SignupScreen.tsx:283` — `SignupScreen.displayName = 'SignupScreen'`
  - `ForgotPasswordScreen.tsx:177` — `ForgotPasswordScreen.displayName = 'ForgotPasswordScreen'`
  - `ResetPasswordScreen.tsx:260` — `ResetPasswordScreen.displayName = 'ResetPasswordScreen'`
- **Status**: RESOLVED

---

### MINOR-5: `AppSelect` placeholder hardcoded — RESOLVED

- **Evidence**: `SignupScreen.tsx:248` — `placeholder={t('auth.category_placeholder')}`.
- **Status**: RESOLVED

---

## New Findings (Introduced in Fix Pass)

---

### CRITICAL-T1: SignupScreen test suite — 2 failing tests (state leak between tests)

- **File**: `src/modules/auth/screens/__tests__/SignupScreen.test.tsx:224, 243`
- **Skill Violated**: `testing-strategy.md` — "All 5 screen states have a test"; "Deterministic — no real timers, dates, or randomness leaking in"
- **Description**: Two tests fail because of state contamination from the previous test (`calls signup with correct args on valid submission`). That test calls `mockSignup.mockResolvedValueOnce(undefined)`, triggers `router.replace('/(app)/home')` inside the async handler, and a subsequent `notificationAsync(Success)` haptic call fires asynchronously. The React state update after navigation unmounts the component, which then triggers the `ScreenErrorBoundary` to set `hasError = true` in the next test's render. As a result:
  - `navigates to home on successful signup` (line 224): `getByTestId('signup-business-name')` throws because the ScreenErrorBoundary's fallback UI is rendered instead of the form.
  - `navigates back on back button press` (line 243): `findByLabelText(t('auth.back'))` times out (1006ms) for the same reason.
- **Root cause**: The `calls signup with correct args` test drains the async handler with `await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/home'))` (line 221), but the `finally { submitting.current = false }` block and the success haptic still fire after the mock navigation, triggering a state update on an unmounted component. The `duplicated` navigation test (`navigates to home`) re-renders into the polluted state.
- **Expected**: Each test must be isolated. The `calls signup with correct args` test and the `navigates to home on successful signup` test are functionally identical (both verify `mockReplace`). The duplicated test should be removed, or both tests should use `beforeEach` store resets to ensure the component re-mounts clean. The overlapping `act()` console errors confirm the issue.
- **Suggestion**:
  1. Remove the duplicated `navigates to home on successful signup` test — it is identical in setup and assertion to `calls signup with correct args` and adds no coverage value.
  2. For `navigates back on back button press`, ensure it does not follow a test that navigates away. Move it earlier in the describe block (before any submit tests), or wrap it so the mock store starts fresh. The `beforeEach` already resets the store mock, but the component's React state (and the ScreenErrorBoundary's `hasError`) persists across renders in the same test file unless the component is fully unmounted.
- **Severity**: CRITICAL (test suite reports failure; CI would block on this)

---

### CRITICAL-T2: ResetPasswordScreen test suite — 7 failing tests

- **File**: `src/modules/auth/screens/__tests__/ResetPasswordScreen.test.tsx`
- **Skill Violated**: `testing-strategy.md` — "All 5 screen states have a test"; "Deterministic"
- **Description**: 7 of 11 tests fail for two distinct reasons:

  **Reason A — `live re-validates the password once touched` (line 134)**: The test sequence is: blur empty password (shows `validation.required` error) → type `VALID_PASSWORD` → assert error clears. However, the `ResetPasswordScreen` renders `helperText={t('validation.password_complexity')}` on the password `AppInput`. `AppInput` renders the error/helperText into the same `${testID}-error` element (`AppInput.tsx:246–254`). When `error` is `null` and `helperText` is set, that element still renders — showing the helper text. The test asserts `.not.toHaveTextContent(t('validation.required'))`, but the `reset-password-error` element still renders (with the helper text content), which is correct. The real issue is that after `fireEvent.changeText(pwInput, VALID_PASSWORD)`, the `passwordTouched` state from the blur is `true`, so `onChangePassword` calls `setPasswordError(validatePassword(VALID_PASSWORD))` which should return `null`. However, the test times out waiting for the `required` text to disappear because this is the **5th test** and is running after the initial test leaks act() state. The overlapping act() warnings confirm cross-test contamination.

  **Reason B — 6 remaining tests**: `does not call resetPassword when form is empty`, `shows loading spinner`, `shows error banner`, `calls resetPassword with correct args`, `navigates to login on successful reset`, `navigates back on back button press` — all fail with "Unable to find an element with text: Reset Password" or "Unable to find an element with testID: reset-otp" or "Unable to find an element with accessibility label: Go back". These indicate the `ScreenErrorBoundary` is in `hasError=true` state when these tests run, silently swallowing the component and rendering the fallback instead. The root cause is the same act() contamination from the earlier passing test `live re-validates the OTP once touched` (which itself passes because it runs before contamination accumulates).

- **Root cause**: Tests 5–11 are all victims of React state leaking from tests 3–4 via the `act()` overlap. The `waitFor` calls in earlier tests leave async microtasks in-flight that update component state after the assertion resolves but before the next test starts. Since `render` re-uses the same component instance within a file (RNTL does not fully isolate between `it` blocks unless `cleanup()` is called), the ScreenErrorBoundary accumulates error state.
- **Expected**: Each test must render a fresh component instance. `@testing-library/react-native` auto-calls `cleanup()` after each test in modern versions. If it is not configured, add `afterEach(() => cleanup())` explicitly, or use `renderHook`/`create` pattern. All 7 failures should resolve once the isolation is fixed.
- **Suggestion**:
  1. Add `import { cleanup } from '@testing-library/react-native'` and `afterEach(cleanup)` to both `SignupScreen.test.tsx` and `ResetPasswordScreen.test.tsx`.
  2. In `ResetPasswordScreen.test.tsx` — the `live re-validates the password once touched` test has a logical flaw: it asserts that the `reset-password-error` element does NOT contain the required text, but the element always exists when `helperText` is set. Change the assertion to `expect(screen.queryByText(t('validation.required'))).toBeNull()` instead of looking for the testID element.
  3. Remove the duplicated `navigates to home on successful signup` test from SignupScreen.
- **Severity**: CRITICAL (7 tests fail; CI would gate on this)

---

### INFO-4: `home.tsx` still uses raw `View`/`StyleSheet`

- **File**: `app/(app)/home.tsx:6`
- **Skill Violated**: `component-development.md` — Tamagui layout primitives preferred
- **Description**: `home.tsx` is a placeholder screen and uses `View`/`StyleSheet`. Since it is explicitly a placeholder for future sprints, this is low priority, but the pattern is inconsistent.
- **Severity**: INFO

---

### INFO-5: `AppPhoneInput` has hardcoded placeholder "Phone number"

- **File**: `src/components/primitives/AppPhoneInput.tsx:319`
- **Skill Violated**: `localization-i18n.md` — "Every user-facing string uses `t()`"
- **Description**: The `TextInput` inside `AppPhoneInput` has a hardcoded `placeholder="Phone number"`. However, this is a reusable primitive component — the correct fix is to accept a `placeholder` prop (already done via `...props`) and pass it from the screen. The screen passes `phone_placeholder` from the locale. The internal fallback string "Phone number" should be an empty string or a prop default, not an English literal. Since the screens already pass through `placeholder` via `...props`, this hardcoded fallback is only visible when the screen omits the placeholder prop.
- **Severity**: INFO

---

## Skill Compliance Summary (Updated)

| Skill | Status | Notes |
|---|---|---|
| `component-development.md` | ⚠️ | Inline style on `SafeAreaView` root in all 4 screens (MAJOR-1 partial); `home.tsx` uses `StyleSheet` |
| `screen-development.md` | ⚠️ | All screens > 200 lines (MINOR-2, MINOR-3 open); ScreenErrorBoundary in place; all 5 states covered |
| `state-management.md` | ✅ | SecureStore for tokens; `useShallow` on all selectors; no tokens in persisted state |
| `api-integration.md` | ✅ | `authService` in barrel; `EXPO_PUBLIC_*` env vars; `mapApiError` in use |
| `offline-first.md` | ✅ | Offline banner on all screens; submit disabled when offline |
| `navigation-routing.md` | ✅ | Auth guard on `(app)` layout; typed params; back button works |
| `performance-optimization.md` | ✅ | `useShallow` on all store selections |
| `localization-i18n.md` | ✅ | All user-facing strings use `t()`; all keys present in all 9 locales with real translations |
| `animation-haptics.md` | ✅ | Haptics on all submit paths (impact + notification); error haptic on validation failure |
| `testing-strategy.md` | ❌ | 9 test failures (CRITICAL-T1, CRITICAL-T2); underlying screens are correctly implemented — the tests themselves have isolation/assertion bugs |
| `form-validation.md` | ✅ | Per-field inline errors via `AppInput.error`; live re-validation once touched; i18n keys; validators in `validation.ts`; submit blocks on invalid; error haptic |
| `accessibility-ux.md` | ✅ | `accessibilityRole`/`accessibilityLabel` on all interactive elements; 44x44 touch targets on back buttons |
| `error-handling.md` | ✅ | `ScreenErrorBoundary` on all screens; `mapApiError` for i18n keys; `logError` in all catch blocks; no raw strings shown to users |
| `security-auth.md` | ✅ | JWT in SecureStore; reset token in SecureStore; no tokens in Zustand persist; `__DEV__` guard on hint |
| `real-time-sync.md` | N/A | Auth feature does not involve real-time sync |

---

## Test Run Results

**Command**: `npx jest --testPathPattern="src/modules/auth|src/utils/__tests__/validation" --no-coverage`

| Suite | Result | Pass | Fail |
|---|---|---|---|
| `validation.test.ts` | PASS | 32 | 0 |
| `auth.service.test.ts` | PASS | 6 | 0 |
| `auth.store.test.ts` | PASS | 13 | 0 |
| `LoginScreen.test.tsx` | PASS | 8 | 0 |
| `ForgotPasswordScreen.test.tsx` | PASS | 9 | 0 |
| `SignupScreen.test.tsx` | FAIL | 9 | 2 |
| `ResetPasswordScreen.test.tsx` | FAIL | 4 | 7 |
| **Total** | **FAIL** | **87** | **9** |

**TypeScript typecheck**: `npx tsc --noEmit` — PASS (no errors)

---

## Required Actions Before Proceeding

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| CRITICAL-T1 | `SignupScreen.test.tsx` — 2 failing tests from act() contamination | CRITICAL | Add `afterEach(cleanup)`, remove duplicated navigation test |
| CRITICAL-T2 | `ResetPasswordScreen.test.tsx` — 7 failing tests from act() contamination + assertion bug | CRITICAL | Add `afterEach(cleanup)`, fix password-error assertion to use `queryByText` |

## Remaining Open Findings (Non-Blocking)

| # | Finding | Severity | File |
|---|---------|----------|------|
| MAJOR-1 | Inline style `{{ flex: 1, backgroundColor: ... }}` on `SafeAreaView` root | MAJOR | All 4 auth screens |
| MINOR-2 | `SignupScreen.tsx` at 283 lines (over 200-line limit) | MINOR | `SignupScreen.tsx` |
| MINOR-3 | `ResetPasswordScreen.tsx` at 260 lines (over 200-line limit) | MINOR | `ResetPasswordScreen.tsx` |
| INFO-1 | Auth axios instance has no JWT interceptor (logged in original report) | INFO | `auth.service.ts` |
| INFO-2 | `immer` middleware not used in auth store | INFO | `auth.store.ts` |
| INFO-3 | Mock data uses `id: '1'` / `vendorId: '1'` instead of UUIDs | INFO | `auth.mock.ts` |
| INFO-4 | `home.tsx` placeholder screen uses `StyleSheet` | INFO | `home.tsx` |
| INFO-5 | `AppPhoneInput` hardcoded fallback placeholder "Phone number" | INFO | `AppPhoneInput.tsx` |
