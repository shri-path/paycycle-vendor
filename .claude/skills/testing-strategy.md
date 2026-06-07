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
8. **Async-submit tests must not leak `act()`** — see "Async submit & `act()` hygiene" below. A leaked async submit corrupts the *next* test's render (it returns a `null` tree → `Unable to find element` even though that screen is fine).
9. **Mock parity with the components** — if a screen/component starts using a new `tamagui` export (e.g. `styled`), add it to the `tamagui` mock in `jest.setup.js`, or every test importing that file crashes at import with `(0, _tamagui.styled) is not a function`.

## Async submit & `act()` hygiene
Screen submit handlers are `async` (await store action → haptic → navigate). `fireEvent.press` does **not** await that promise, so its continuation settles *after* the press's `act()` scope — producing `overlapping act() calls` warnings and, worse, leaving the test renderer in a state where the **next** `render()` commits nothing (`screen.toJSON() === null`). This presents as a perfectly-good screen failing with "Unable to find element" / `findBy*` timeouts.

Rules for any test that triggers a successful submit:
- **Wrap the press in `act`** so the async handler settles inside scope: `await act(async () => { fireEvent.press(button) })`, then `await waitFor(...)` your assertions.
- **Order submit-success tests LAST** in the `describe`. react-test-renderer can still leave async teardown open after navigation; if nothing renders after it, nothing is corrupted. Add a NOTE comment so no one reorders it.
- **Don't add a manual `afterEach(cleanup)`** — `@testing-library/react-native` auto-cleans; a second cleanup interacts badly here. Rely on auto-cleanup.
- **One assertion per behavior** — a submit-success test that already asserts `navigation` does not need a separate "navigates on success" test (drop the duplicate).
- **Live re-validation tests**: type a **non-empty invalid** value first and `await waitFor(() => expect(input.props.value).toBe(...))` before `blur`, so the touched re-render flushes. A no-op `changeText('')` on an already-empty field does not re-render, so the touched-field closure never updates and the error never clears.

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
- [ ] Submit-success tests are act-wrapped and ordered last; no manual `afterEach(cleanup)`
- [ ] New `tamagui` exports used by a component are present in the `jest.setup.js` mock

## Common violations → findings
- New screen/store with no tests → MAJOR
- Only happy path tested → MAJOR
- Asserting English text instead of i18n keys → MINOR/MAJOR
- Real network call in a test → MAJOR (flaky)
- Un-`act`-wrapped async submit / submit-success test not ordered last → MAJOR (corrupts the next test's render)
- Component uses a `tamagui` export missing from the jest mock → BLOCKER (whole suite fails to load)
