# Code Review Report: US-003 Authentication

## Summary
- **Date**: 2026-06-07
- **Reviewer**: Review Agent
- **Commit**: `7485cab` — feat: implement US-003 authentication feature
- **Branch**: `feat/us-003-authentication`
- **Feature Plan**: No `FEATURE_PLAN.md` found at `docs/features/authentication/` — reviewed against commit diff, agent skills, and CLAUDE.md specifications.
- **Overall Assessment**: ❌ Changes Required

---

## Statistics

| Severity | Count |
|----------|-------|
| BLOCKER  | 3     |
| CRITICAL | 4     |
| MAJOR    | 9     |
| MINOR    | 5     |
| INFO     | 3     |

---

## Findings

---

### BLOCKER-1: JWT tokens persisted in AsyncStorage — not SecureStore

- **File**: `src/modules/auth/store/auth.store.ts:169–176`
- **Skill Violated**: `security-auth.md` — "JWT tokens in `expo-secure-store` (NOT AsyncStorage)"
- **Description**: The `persist` middleware uses `createJSONStorage(() => AsyncStorage)`, which stores the `tokens` object (containing `accessToken` and `refreshToken`) in plain AsyncStorage. On Android, AsyncStorage is unencrypted and world-readable on rooted devices. JWT tokens are bearer credentials — storing them in AsyncStorage is a textbook mobile security vulnerability.
- **Expected**: Tokens must be stored in `expo-secure-store`, which uses the platform's secure enclave (Keychain on iOS, EncryptedSharedPreferences on Android).
- **Suggestion**:
  1. Add `expo-secure-store` to dependencies (`npx expo install expo-secure-store`).
  2. Write a `secureStorage` adapter:
     ```ts
     import * as SecureStore from 'expo-secure-store'
     const secureStorage = {
       getItem: (key: string) => SecureStore.getItemAsync(key),
       setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
       removeItem: (key: string) => SecureStore.deleteItemAsync(key),
     }
     ```
  3. Split the store: persist only `isAuthenticated`/`user`/`vendorContext` in AsyncStorage (non-sensitive); store `accessToken` and `refreshToken` exclusively via `SecureStore` set/get calls on login/logout.

---

### BLOCKER-2: Reset token stored in Zustand state (persisted to AsyncStorage)

- **File**: `src/modules/auth/store/auth.store.ts:23–24, 48–49, 117–118`
- **Skill Violated**: `security-auth.md` — "No sensitive data in stores (tokens, passwords → `SecureStore`)"
- **Description**: `pendingResetToken` is a password-reset bearer token that grants the ability to change a user's password. It is stored in Zustand state. While `partialize` currently excludes it from persistence (lines 171–175 only persist `isAuthenticated`, `user`, `tokens`, `vendorContext`), the `tokens` field in the persisted state *includes* `accessToken` and `refreshToken` (see BLOCKER-1). Additionally, `pendingResetToken` sits in in-memory Zustand state in plain text alongside sensitive auth fields. If the partialize config ever expands, this token will be silently persisted to AsyncStorage.
- **Expected**: The reset token (and all tokens) must be stored via `SecureStore`, never in Zustand or AsyncStorage.
- **Suggestion**: Use `SecureStore.setItemAsync('pendingResetToken', resetToken)` and `SecureStore.getItemAsync('pendingResetToken')` instead of storing in Zustand state.

---

### BLOCKER-3: Dev OTP hint (`MOCK_OTP`) rendered from production bundle code

- **File**: `src/modules/auth/screens/ResetPasswordScreen.tsx:109–116`
- **Skill Violated**: `security-auth.md` — "No sensitive data in console logs"; `error-handling.md` — "No stack traces shown to users"
- **Description**: The screen conditionally renders `[Dev] OTP: 123456` using `isMockMode`. However, `isMockMode` is derived from `process.env.REACT_APP_API_MODE` — an environment variable that is evaluated at **bundle time** using `process.env` substitution in Metro. If `REACT_APP_API_MODE` is not set or is set to `'mock'` in a production build (which is the default fallback in `config.ts:12`), this OTP hint will be **visible in production**. The `MOCK_OTP` constant (`'123456'`) is also exported from the mocks barrel and imported directly into a screen, bundling test infrastructure into production code.
- **Expected**: Dev hints must never appear in production. The correct pattern is to use `__DEV__` (React Native's built-in boolean, tree-shaken from release builds) rather than a runtime env var check.
- **Suggestion**:
  ```tsx
  {__DEV__ && (
    <View style={styles.devHint}>
      <AppText variant="caption" color={colors.warning}>
        [Dev] OTP: {MOCK_OTP}
      </AppText>
    </View>
  )}
  ```
  Also avoid importing `MOCK_OTP` and `isMockMode` in screen files — keep mock artifacts in service/test layers only.

---

### CRITICAL-1: No tests exist for any auth screen, store, or service

- **File**: Entire `src/modules/auth/` directory
- **Skill Violated**: `testing-strategy.md` — "All 5 screen states tested", "User interactions tested (tap, type, swipe)", "Store tested in isolation", "Service layer mocked"
- **Description**: Zero test files exist anywhere in `src/` (no `__tests__/` directories, no `*.test.ts`, no `*.spec.ts` files). The entire auth module — 4 screens, 1 store, 1 service — has no test coverage. This is a CRITICAL gap for an authentication feature, which is the security boundary of the entire application.
- **Expected**: At minimum:
  - `src/modules/auth/screens/__tests__/LoginScreen.test.tsx` — testing all 5 states (loading skeleton, error state, form populated, empty, offline)
  - `src/modules/auth/store/__tests__/auth.store.test.ts` — login/logout/signup/forgotPassword/resetPassword actions
  - `src/modules/auth/service/__tests__/auth.service.test.ts` — mock mode returns, error propagation
- **Suggestion**: Add `jest`, `@testing-library/react-native`, and `jest-expo` to devDependencies. Follow the `testing-strategy.md` skill patterns for screen state coverage and store isolation testing.

---

### CRITICAL-2: No `ScreenErrorBoundary` on any auth screen

- **File**: `src/modules/auth/screens/LoginScreen.tsx`, `SignupScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`
- **Skill Violated**: `error-handling.md` — "Every screen wrapped in `ScreenErrorBoundary`"
- **Description**: None of the four auth screens are wrapped in an error boundary. A runtime error in the render path (e.g., a null dereference, a Tamagui token access failure, a bad translation key) will cause the app to crash with a white screen. Auth screens are the first screens users see — a crash here means the app is completely unusable.
- **Expected**: Each screen's root element should be wrapped:
  ```tsx
  <ScreenErrorBoundary>
    <SafeAreaView ...>
      ...
    </SafeAreaView>
  </ScreenErrorBoundary>
  ```
- **Suggestion**: Create `src/components/layout/ScreenErrorBoundary.tsx` (if not already existing) and wrap all screen roots. The error boundary should show an inline error with a retry button, not crash the app.

---

### CRITICAL-3: No auth guard on `(app)` layout — authenticated routes are unprotected

- **File**: `app/(app)/_layout.tsx`
- **Skill Violated**: `navigation-routing.md` — "Auth guard redirects unauthenticated users"
- **Description**: The `(app)` group layout (`app/(app)/_layout.tsx`) does not check authentication state. Any user who knows the route path can navigate directly to `/(app)/home` without being authenticated. The only protection is the `index.tsx` redirect, which is bypassed by direct navigation or deep links.
- **Expected**: The `(app)` layout must enforce authentication:
  ```tsx
  import { Redirect } from 'expo-router'
  import { useAuthStore } from '@modules/auth/store/auth.store'

  export default function AppLayout() {
    const { isAuthenticated, isHydrated } = useAuthStore()
    if (!isHydrated) return null  // or splash
    if (!isAuthenticated) return <Redirect href="/(auth)/login" />
    return <Stack screenOptions={{ headerShown: false }} />
  }
  ```
- **Suggestion**: This is a defence-in-depth requirement. Even if the current navigation flow is correct, the layout guard must exist as a hard boundary.

---

### CRITICAL-4: `authService` not added to `api.service.ts` barrel export

- **File**: `src/services/api.service.ts`
- **Skill Violated**: `api-integration.md` — "Added to barrel export in `api.service.ts`"
- **Description**: `api.service.ts` exports `ledgerService`, `customerService`, and `vendorService` but does NOT export `authService`. The auth service is imported directly from its module path (`'../service/auth.service'`) rather than through the service barrel. This breaks the architectural pattern and will cause inconsistency as the codebase grows.
- **Expected**: `src/services/api.service.ts` should include `export { authService } from '../modules/auth/service/auth.service'` (or the service should be co-located under `src/services/` like the other services).
- **Suggestion**: Either move `auth.service.ts` to `src/services/auth.service.ts` and export from the barrel, or add a re-export from `api.service.ts`. The current pattern of having it under `modules/auth/service/` is inconsistent with the other services.

---

### MAJOR-1: All screens use raw RN `View`/`StyleSheet` — Tamagui `styled()` not used

- **File**: `src/modules/auth/screens/LoginScreen.tsx`, `SignupScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`
- **Skill Violated**: `component-development.md` — "Tamagui `styled()` used — no inline styles or raw RN `View`/`Text`"; "All styling uses design tokens (no hardcoded colors, spacing, or font sizes)"
- **Description**: Every screen uses `import { View, StyleSheet } from 'react-native'` with `StyleSheet.create()` for layout, and accesses design tokens directly from `@constants/tokens`. While the tokens themselves are imported (not hardcoded literals), the `StyleSheet` API bypasses Tamagui's style system entirely. This means Tamagui's responsive styling, theme switching, and accessibility scaling features are unavailable.
- **Expected**: Screens should use Tamagui layout primitives (`YStack`, `XStack`, `Stack`) or `styled()` wrappers instead of `StyleSheet.create()`.
- **Suggestion**: Replace layout `View`s with Tamagui `YStack`/`XStack` and use `$space` tokens. Example:
  ```tsx
  import { YStack, XStack } from 'tamagui'
  // instead of:
  <View style={styles.form}>
  // use:
  <YStack gap="$2" paddingHorizontal="$4">
  ```

---

### MAJOR-2: No haptic feedback on any interactive element

- **File**: `src/modules/auth/screens/LoginScreen.tsx:51`, `SignupScreen.tsx:83`, `ForgotPasswordScreen.tsx:35`, `ResetPasswordScreen.tsx:65`
- **Skill Violated**: `animation-haptics.md` — "Every interactive element has haptic feedback"; `accessibility-ux.md` — "WhatsApp interaction patterns followed (haptic)"
- **Description**: `expo-haptics` is installed (confirmed in `package.json`) but is not used anywhere in the auth module. No button press, form submission success, or error triggers any haptic. WhatsApp UX standard requires haptic feedback on all primary actions.
- **Expected**: 
  - Primary buttons (Sign In, Create Account, Send OTP, Reset Password): `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
  - Errors: `Haptics.notificationAsync(NotificationFeedbackType.Error)`
  - Successful login: `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- **Suggestion**:
  ```ts
  import * as Haptics from 'expo-haptics'
  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // ...
    // on error:
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }
  ```

---

### MAJOR-3: No `accessibilityRole` or `accessibilityLabel` on interactive elements

- **File**: All auth screen files
- **Skill Violated**: `accessibility-ux.md` — "`accessibilityRole` on every interactive element"; "`accessibilityLabel` on icon-only buttons"
- **Description**: The password visibility toggle `TouchableOpacity` (eye icon) in `LoginScreen.tsx:116-124` and `SignupScreen.tsx:153-161` is an icon-only button with no `accessibilityRole="button"` or `accessibilityLabel`. The back button `TouchableOpacity` in `SignupScreen.tsx:110-112`, `ForgotPasswordScreen.tsx:61-63`, and `ResetPasswordScreen.tsx:88-90` is also missing accessibility props. Screen readers (TalkBack/VoiceOver) will not announce these buttons correctly.
- **Expected**:
  ```tsx
  <TouchableOpacity
    onPress={() => setShowPassword((v) => !v)}
    accessibilityRole="button"
    accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}
  >
  ```
- **Suggestion**: Add `accessibilityRole` and `accessibilityLabel` to all `TouchableOpacity` elements. Add `accessibilityLabel` translation keys to all 9 locale files.

---

### MAJOR-4: Hardcoded strings in `home.tsx` and `SignupScreen.tsx` CATEGORIES array

- **File**: `app/(app)/home.tsx:41`; `src/modules/auth/screens/SignupScreen.tsx:28-33, 169`
- **Skill Violated**: `localization-i18n.md` — "Every user-facing string uses `t('key')` — zero hardcoded strings"
- **Description**:
  1. `home.tsx:41`: `label="Logout"` — hardcoded English string, not using `t('auth.logout')`.
  2. `SignupScreen.tsx:28-33`: The `CATEGORIES` array uses hardcoded English labels (`'Milk & Dairy'`, `'Newspaper'`, etc.) that will not be translated.
  3. `SignupScreen.tsx:169`: `placeholder="Select category (optional)"` — hardcoded English placeholder.
- **Expected**: All visible text must use translation keys. Categories should be defined as keys and resolved at render time via `t()`.
- **Suggestion**:
  ```ts
  // home.tsx
  label={t('auth.logout')}

  // SignupScreen.tsx
  const CATEGORY_KEYS = ['milk_dairy', 'newspaper', 'bread_bakery', 'vegetables', 'other']
  const categories = CATEGORY_KEYS.map((k) => ({ label: t(`auth.category_${k}`), value: k }))
  ```
  Add translation keys `auth.category_milk_dairy` etc. to all 9 locale files.

---

### MAJOR-5: Double-tap protection absent on all form submission buttons

- **File**: `src/modules/auth/screens/LoginScreen.tsx:51–61`, `SignupScreen.tsx:83–93`, `ForgotPasswordScreen.tsx:35–47`, `ResetPasswordScreen.tsx:65–75`
- **Skill Violated**: Review Agent checklist §15 — "Double-tap protection: Buttons debounced, no duplicate submissions"
- **Description**: While `isLoading` prevents concurrent submissions *after* the first API call begins, there is a race window between when the button is tapped and when `set({ isLoading: true })` propagates back to the component. On slow devices, a user can tap the button multiple times before the loading state is reflected, triggering duplicate `login()` / `signup()` calls. This can create duplicate accounts or sessions.
- **Expected**: The submit handler should be debounced or the button should be disabled immediately on the first tap using a local ref:
  ```ts
  const submitting = useRef(false)
  const handleLogin = async () => {
    if (submitting.current) return
    submitting.current = true
    try { ... } finally { submitting.current = false }
  }
  ```
- **Suggestion**: Alternatively, use a `useCallback` + `useRef` debounce utility from `@utils/debounce`.

---

### MAJOR-6: Missing offline state handling on all auth screens

- **File**: All auth screen files
- **Skill Violated**: `screen-development.md` — "Offline state shows cached data with banner"; `offline-first.md` — "Offline banner shown when `isOnline === false`"
- **Description**: No auth screen checks network status or shows an offline banner. If a user taps "Sign In" while offline, the Axios call will throw a network error and the error banner will show a generic raw error message (e.g., "Network Error") rather than the translated offline message from `common.offline_message`.
- **Expected**: Auth screens should detect offline state and either disable the submit button or show the offline banner with an appropriate translated message before the user attempts submission.
- **Suggestion**:
  ```ts
  import NetInfo from '@react-native-community/netinfo'
  // or use a custom useNetworkStatus hook
  const { isConnected } = useNetworkStatus()
  // Show banner when !isConnected
  ```

---

### MAJOR-7: Error display shows raw error message strings, not i18n keys

- **File**: `src/modules/auth/store/auth.store.ts:68–69, 86–87, 121–122, 146–147`
- **Skill Violated**: `error-handling.md` — "API errors mapped via error mapper with i18n keys"; "No generic error messages"
- **Description**: The store catches errors and stores `err.message` directly in the `error` state: `const message = err instanceof Error ? err.message : 'auth.invalid_credentials'`. If the Axios call throws a network error, `err.message` will be `"Network Error"` (in English, from Axios internals) — a raw untranslated string shown directly to the user. Screens then render `{displayError}` directly without passing through `t()`.
- **Expected**: All API errors should be mapped through a centralised error mapper that converts known error codes/messages to i18n translation keys. The `error` field in the store should hold an i18n key, not a raw string.
- **Suggestion**:
  ```ts
  // src/utils/errorMapper.ts
  export function mapApiError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      if (!err.response) return 'common.offline_message'
      const code = err.response.data?.error?.code
      return `errors.${code}` ?? 'common.error'
    }
    if (err instanceof Error && err.message.startsWith('auth.')) return err.message
    return 'common.error'
  }
  ```
  Then in screens: `{t(displayError ?? 'common.error')}` rather than `{displayError}`.

---

### MAJOR-8: `REACT_APP_*` env vars will always be `undefined` in Expo — mock mode is hardcoded

- **File**: `src/services/config.ts:12, 24, 25`
- **Skill Violated**: `api-integration.md` — "Service file follows mock/real toggle pattern"
- **Description**: Expo does not support `REACT_APP_` prefixed env vars. The `process.env.REACT_APP_API_MODE` expression will always evaluate to `undefined` in an Expo/Metro bundle. The fallback `'mock'` means the app is **permanently in mock mode** regardless of the intended deployment environment. In production, real API calls will never be made unless this is fixed.
- **Expected**: Expo SDK uses `EXPO_PUBLIC_` prefix for client-exposed env vars. The config should use `process.env.EXPO_PUBLIC_API_MODE`.
- **Suggestion**:
  ```ts
  export const API_MODE = (process.env.EXPO_PUBLIC_API_MODE || 'mock') as 'mock' | 'real'
  export const API_CONFIG = {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000',
    ...
  }
  ```
  Create `.env` and `.env.production` files accordingly. Note: this bug existed before this commit but the auth feature introduces new dependency on it.

---

### MAJOR-9: `useShallow` not used when selecting multiple store values

- **File**: `src/modules/auth/screens/LoginScreen.tsx:29`, `SignupScreen.tsx:54`, `ForgotPasswordScreen.tsx:27`, `ResetPasswordScreen.tsx:45`
- **Skill Violated**: `state-management.md` — "`useShallow` used when selecting multiple values"
- **Description**: Each screen destructures multiple values from the store: `const { login, isLoading, error, clearError } = useAuthStore()`. Without `useShallow`, Zustand re-renders the component on *every* store state change, even if none of the selected values changed. This causes unnecessary re-renders during loading/error state transitions in other unrelated parts of the store.
- **Expected**:
  ```ts
  import { useShallow } from 'zustand/react/shallow'
  const { login, isLoading, error, clearError } = useAuthStore(
    useShallow((s) => ({ login: s.login, isLoading: s.isLoading, error: s.error, clearError: s.clearError }))
  )
  ```
- **Suggestion**: Apply `useShallow` to all multi-value store selections across the auth screens.

---

### MINOR-1: `validatePassword` duplicated across `SignupScreen` and `ResetPasswordScreen`

- **File**: `src/modules/auth/screens/SignupScreen.tsx:35–49`; `src/modules/auth/screens/ResetPasswordScreen.tsx:26–40`
- **Skill Violated**: CLAUDE.md architecture rules — "DRY: Reuse components and hooks — no duplicated UI or logic"
- **Description**: The `validatePassword` function and `PASSWORD_REGEX` object are identical copies in both screen files (10 lines each). Any future change to password policy must be applied in two places.
- **Suggestion**: Extract to `src/utils/validation.ts`:
  ```ts
  export function validatePassword(password: string): string | null { ... }
  ```

---

### MINOR-2: `SignupScreen` screen exceeds 200-line limit

- **File**: `src/modules/auth/screens/SignupScreen.tsx` (234 lines)
- **Skill Violated**: `screen-development.md` — "Screen file under 200 lines"
- **Description**: At 234 lines, `SignupScreen.tsx` exceeds the 200-line guideline. The `CATEGORIES` array and `validatePassword` function can be extracted to reduce line count.
- **Suggestion**: Extract `CATEGORIES`, `validatePassword`, and `PASSWORD_REGEX` to separate utility/constants files.

---

### MINOR-3: `ResetPasswordScreen` exceeds 200-line limit

- **File**: `src/modules/auth/screens/ResetPasswordScreen.tsx` (215 lines)
- **Skill Violated**: `screen-development.md` — "Screen file under 200 lines"
- **Description**: At 215 lines, slightly over the limit. Extracting `validatePassword` and `PASSWORD_REGEX` (shared with MINOR-1 fix) will resolve this.

---

### MINOR-4: `displayName` not set on screen components

- **File**: All four auth screen files
- **Skill Violated**: `component-development.md` — "`displayName` set on the component"
- **Description**: None of the screen default exports have `ComponentName.displayName = '...'` set. This makes React DevTools and error stacks harder to debug, especially for default exports.
- **Suggestion**: After each default function declaration, add:
  ```ts
  LoginScreen.displayName = 'LoginScreen'
  ```

---

### MINOR-5: `AppSelect` placeholder string hardcoded in `SignupScreen`

- **File**: `src/modules/auth/screens/SignupScreen.tsx:169`
- **Skill Violated**: `localization-i18n.md` — "Every user-facing string uses `t('key')`"
- **Description**: `placeholder="Select category (optional)"` is a hardcoded English string. This is partially captured by MAJOR-4 but listed separately as it affects the `AppSelect` component placeholder specifically.
- **Suggestion**: Add `auth.category_placeholder` key to all 9 locales and use `placeholder={t('auth.category_placeholder')}`.

---

### INFO-1: Auth service axios instance has no request interceptor for JWT injection

- **File**: `src/modules/auth/service/auth.service.ts:20–23`
- **Skill Violated**: `api-integration.md` — "JWT injection via interceptor (not manual per-request)"
- **Description**: The `auth.service.ts` creates its own `axios` instance without a request interceptor. The `logout` method manually injects `Authorization` header (line 67). While auth endpoints mostly don't require JWT, establishing the interceptor pattern now (with the token from SecureStore once BLOCKER-1 is fixed) ensures consistency.
- **Suggestion**: Add an interceptor that reads the token and injects it, with a guard for endpoints that don't need auth (signup, login, forgot-password).

---

### INFO-2: `immer` middleware not used in auth store

- **File**: `src/modules/auth/store/auth.store.ts`
- **Skill Violated**: `state-management.md` — "`immer` middleware used for complex updates"
- **Description**: The auth store has moderately complex state updates (nested objects like `tokens` and `user`). While the current updates are flat `set()` calls, future additions (e.g., updating a single field within `user`) will benefit from immer's immutable-update ergonomics.
- **Suggestion**: Add `import { immer } from 'zustand/middleware/immer'` and wrap the store creator. This is low priority but aligns with the skill pattern.

---

### INFO-3: Mock data uses non-realistic `id: '1'` and `vendorId: '1'`

- **File**: `src/services/mocks/auth.mock.ts:9, 26`
- **Skill Violated**: `api-integration.md` — "Mock data exists with realistic Indian data"
- **Description**: The mock `id` and `vendorId` fields use `'1'` rather than realistic UUIDs. This can mask bugs where code incorrectly assumes numeric IDs. Other mock files likely use UUID-format IDs — this should be consistent.
- **Suggestion**: Use `'a1b2c3d4-1234-5678-abcd-ef1234567890'` style UUIDs to match production API response format.

---

## Skill Compliance Summary

| Skill | Status | Notes |
|---|---|---|
| `component-development.md` | ❌ | No Tamagui `styled()`, no `displayName`, no accessibility props on interactive elements |
| `screen-development.md` | ❌ | No `ScreenErrorBoundary`, no offline state, no haptics, `SignupScreen`/`ResetPasswordScreen` over 200 lines |
| `state-management.md` | ❌ | Tokens in AsyncStorage (not SecureStore), `useShallow` missing, `immer` not used |
| `api-integration.md` | ❌ | `authService` missing from barrel export, no `AbortSignal`, `REACT_APP_*` env vars broken in Expo |
| `offline-first.md` | N/A | Auth is online-only by design, but offline banner feedback is still required |
| `navigation-routing.md` | ❌ | `(app)` layout missing auth guard |
| `performance-optimization.md` | ❌ | `useShallow` missing on all store selections |
| `localization-i18n.md` | ❌ | Hardcoded strings in home.tsx, CATEGORIES labels, AppSelect placeholder; all 9 locales appear complete for defined keys |
| `animation-haptics.md` | ❌ | `expo-haptics` installed but zero usage in auth module |
| `testing-strategy.md` | ❌ | Zero test files for auth module — no jest/RTL in devDependencies |
| `accessibility-ux.md` | ❌ | Missing `accessibilityRole`/`accessibilityLabel` on icon-only and back buttons |
| `error-handling.md` | ❌ | Raw error strings in store, no error boundary, no error mapper |
| `security-auth.md` | ❌ | BLOCKER: JWT tokens in AsyncStorage, reset token in Zustand state, dev OTP hint in production path |
| `real-time-sync.md` | N/A | Auth feature does not involve real-time sync |

---

## Required Actions Before Proceeding

The following **BLOCKER** and **CRITICAL** findings must be addressed before this feature is considered complete:

| # | Finding | Priority |
|---|---------|---------|
| BLOCKER-1 | Move JWT tokens from AsyncStorage to `expo-secure-store` | Immediate |
| BLOCKER-2 | Move reset token from Zustand state to `SecureStore` | Immediate |
| BLOCKER-3 | Replace `isMockMode` dev hint guard with `__DEV__` | Immediate |
| CRITICAL-1 | Write tests for auth screens, store, and service | Before feature complete |
| CRITICAL-2 | Wrap all auth screens in `ScreenErrorBoundary` | Before feature complete |
| CRITICAL-3 | Add auth guard to `app/(app)/_layout.tsx` | Before feature complete |
| CRITICAL-4 | Add `authService` to `api.service.ts` barrel | Before feature complete |

MAJOR findings (MAJOR-1 through MAJOR-9) should be addressed before the feature is merged to `main`.
