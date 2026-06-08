# Skill 08 — Error Handling & Logging (MANDATORY)

The app NEVER crashes the whole screen, NEVER shows a raw error to the user, and ALWAYS logs the failure for debugging.

## When to use
Every `catch`, every API call, every screen.

## Rules
1. **Error boundary per screen.** Wrap each screen in `ScreenErrorBoundary` (see `src/components/composite/ScreenErrorBoundary.tsx`). A render crash shows a recoverable fallback, never a white screen.
2. **Map API errors to i18n keys** with `mapApiError(err)` (`src/utils/errorMapper.ts`). Stores set `error` to the key; screens render `t(error)`. Extend `mapApiError` for new backend error codes from `paycycle_api`.
3. **No swallowed errors.** Every `catch` either handles (set error state + log) or rethrows. Never `catch {}` empty, never `return null` to hide a failure.
4. **No raw errors / stack traces to users.** Users see a translated, friendly message + a recovery action (retry / go back).
5. **Log every caught error** via the shared logger to `Logs/YYYY-MM-DD.txt` (see CLAUDE.md "Error Logging"): ISO timestamp, message + stack, `correlationId` from the API response when present, plus endpoint/screen/action context.
6. **No customer PII in logs** (phone, address, name). Log IDs and correlation data only.
7. **Error UX by type**: inline (below field) for validation; snackbar (auto-dismiss 3–5s) for transient; full-screen `AppEmptyState` + retry for blocking/no-data.
8. **Haptic on error** — `Haptics.notificationAsync(Error)` (see `animation-haptics.md`).
9. **Offline ≠ error.** A network failure offline shows the offline state, not a scary error (`mapApiError` already returns `common.offline_message` when there's no response).

## Pattern
```ts
// shared logger — single entry point (src/utils/logger.ts)
export async function logError(err: unknown, ctx?: { screen?: string; action?: string; correlationId?: string }) {
  const correlationId = ctx?.correlationId ?? extractCorrelationId(err)  // from API error response
  await appendToDailyLog({ ts: new Date().toISOString(), message: toMessage(err), stack: toStack(err), correlationId, ...ctx })
  // NEVER include phone/address/name
}
```
```tsx
try {
  await submit()
} catch (err) {
  logError(err, { screen: 'AddCustomer', action: 'create' })
  setError(mapApiError(err))                       // i18n key
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}
```

## Definition of Done (Review checklist)
- [ ] Screen wrapped in `ScreenErrorBoundary`
- [ ] API errors mapped via `mapApiError` to i18n keys; new codes added there
- [ ] No empty/silent `catch`; no `return null` hiding failures
- [ ] No raw message/stack shown to users; recovery action present
- [ ] Every caught error logged via shared logger to `Logs/YYYY-MM-DD.txt` with `correlationId`/context
- [ ] No customer PII in any log line
- [ ] Correct error UX (inline / snackbar / full-screen); haptic on error
- [ ] Offline rendered as offline state, not an error

## Common violations → findings
- `catch (e) {}` empty → CRITICAL (swallowed error)
- `alert(err.message)` / raw stack shown → CRITICAL
- Logging phone number / address → BLOCKER (PII)
- Caught error not logged → MAJOR
- Missing `ScreenErrorBoundary` → CRITICAL
