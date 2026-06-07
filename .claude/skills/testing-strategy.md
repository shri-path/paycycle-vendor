# Skill 14 — Testing Strategy (MANDATORY)

Every feature ships with tests. Stack: `jest` + `jest-expo` + `@testing-library/react-native`.

> Version lock: `jest-expo@56` requires `jest@29`. Do NOT bump to `jest@30` (crashes with `clearMocksOnScope`).

## When to use
After implementing each layer; tests are part of "done", not optional follow-up.

## What to test (by layer)
1. **Services** — mock-mode returns expected shape; real-mode maps response → domain type; errors throw (e.g. `auth.service.test.ts`). Mock axios; assert no `vendorId` is sent.
2. **Stores** — async actions set `isLoading`/`error` correctly on success and failure; `error` is an i18n **key**; logout clears state; tokens never land in persisted state (`auth.store.test.ts`).
3. **Components** — render with props, fire press/change, assert callbacks + accessibility labels; test disabled/loading variants.
4. **Screens** — assert each of the 5 states renders (loading skeleton, empty, error, populated, offline); submit is double-tap-guarded; haptics/navigation called (mock them). See `LoginScreen.test.tsx`.

## Rules
1. **Tests colocated** in `__tests__/` next to the code under test.
2. **Query by accessibility / `testID`**, not brittle text where possible; this also validates a11y labels exist.
3. **No real network** — mock services/axios; use fake timers for `simulateNetworkDelay`.
4. **Assert i18n keys**, not translated English, so tests are locale-independent.
5. **Cover the unhappy paths** — error, offline, empty, invalid input — not just the happy path.
6. **Deterministic** — no real timers, dates, or randomness leaking in; mock `Date.now`/haptics.
7. **`typecheck` + tests must pass** before handoff (`npm run typecheck`, `npm test`).

## Pattern
```tsx
it('shows error and fires error haptic on failed login', async () => {
  jest.spyOn(authService, 'login').mockRejectedValueOnce(buildAxiosError(401))
  const { getByLabelText, findByText } = render(<LoginScreen />)
  fireEvent.changeText(getByLabelText(t('auth.password')), 'wrong')
  fireEvent.press(getByText(t('auth.sign_in')))
  expect(await findByText(t('auth.invalid_credentials'))).toBeTruthy()
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error)
})
```

## Definition of Done (Review checklist)
- [ ] Services, stores, components, and screens for the feature have tests in `__tests__/`
- [ ] All 5 screen states have a test; unhappy paths covered
- [ ] No real network/timers/dates; services & haptics mocked
- [ ] Assertions use i18n keys + accessibility queries
- [ ] Store tests confirm no tokens in persisted state
- [ ] `npm run typecheck` and `npm test` pass

## Common violations → findings
- New screen/store with no tests → MAJOR
- Only happy path tested → MAJOR
- Asserting English text instead of i18n keys → MINOR/MAJOR
- Real network call in a test → MAJOR (flaky)
