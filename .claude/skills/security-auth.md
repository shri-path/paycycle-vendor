# Skill 12 — Security & Auth (MANDATORY)

Enterprise, multi-tenant app. Token handling and tenant isolation are non-negotiable. Violations are **BLOCKERS**.

## When to use
Anything touching auth, tokens, storage, or vendor-scoped data.

## Rules
1. **JWTs in SecureStore only.** `accessToken`, `refreshToken`, and any reset token live in `expo-secure-store` (Keychain / EncryptedSharedPreferences). **Never** in AsyncStorage, Zustand state, `persist`/`partialize`, or logs. (See `auth.store.ts`.)
2. **Persist only non-sensitive fields** — `isAuthenticated`, `user`, `vendorContext`. Whitelist via `partialize`.
3. **Logout clears everything** — SecureStore tokens AND store state AND any local DB/cache. No stale authenticated state survives logout.
4. **Multi-tenancy** — `vendorId` comes from the JWT on the server. Never send it from the client; never display it in the UI; all data is vendor-scoped with no cross-tenant leakage.
5. **Token refresh** — handled by the shared axios interceptor; on refresh failure, clear tokens and drop to unauthenticated (see `refreshTokens`).
6. **Session expiry** redirects to `/(auth)/login`; guarded `(app)` routes are unreachable when unauthenticated (see `navigation-routing.md`).
7. **Input validation** before any API call — phone format, amount range, name sanitization (`src/utils/validation.ts`).
8. **No secrets in code or logs** — no API keys committed; error logs carry `correlationId`, never tokens or PII (see `error-handling.md`).
9. **Auth errors** surface as i18n keys via `mapApiError` (`auth.invalid_credentials`, etc.) — never leak whether phone vs password was wrong beyond the standard message.

## Pattern (follow auth.store.ts)
```ts
await SecureStore.setItemAsync('auth.accessToken', accessToken)   // tokens → SecureStore
set({ isAuthenticated: true, user, vendorContext })               // non-sensitive → state
// partialize whitelists ONLY isAuthenticated/user/vendorContext
// logout:
await clearSecureTokens()
set({ isAuthenticated: false, user: null, vendorContext: null })
```

## Definition of Done (Review checklist)
- [ ] All tokens in SecureStore; none in AsyncStorage/Zustand/`partialize`/logs
- [ ] `partialize` whitelists only non-sensitive fields
- [ ] Logout clears SecureStore + state + local cache
- [ ] No `vendorId` sent from client or shown in UI; data vendor-scoped
- [ ] Refresh failure → clear + unauthenticated; expiry redirects to login
- [ ] Inputs validated before API calls
- [ ] No secrets/PII in code or logs

## Common violations → findings
- Token in AsyncStorage / Zustand persist → BLOCKER
- `vendorId` in request body/params or UI → BLOCKER (tenant isolation)
- Logout leaves tokens in SecureStore → BLOCKER
- Token value written to a log → BLOCKER
