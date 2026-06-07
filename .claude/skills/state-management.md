# Skill 03 — State Management (MANDATORY)

Global/shared state lives in Zustand stores. Stores own async actions, loading/error flags, and data; they call services and map errors.

## When to use
Creating or modifying a store in `src/store/` or `src/modules/<feature>/store/`.

## Rules
1. **One store per feature**, named `useXxxStore`, in `<feature>/store/xxx.store.ts`.
2. **Shape**: data fields, `isLoading`, `error: string | null`, then actions. Keep transient flow state (e.g. `pendingResetPhone`, `isHydrated`) separate from persisted data.
3. **Async action pattern**: `set({ isLoading: true, error: null })` → `try` call service → `set` data + `isLoading: false` → `catch` `set({ isLoading: false, error: mapApiError(err) })` and rethrow if the screen needs to react. Store `error` as an **i18n key**, not a raw message (see `error-handling.md`).
4. **No secrets in state or persist.** JWT/refresh/reset tokens go to `expo-secure-store` only. Never in Zustand, never in AsyncStorage, never in `partialize`. (See `security-auth.md`.)
5. **Persist deliberately.** Use `persist` + `createJSONStorage(buildStorage)` (AsyncStorage native / localStorage web / no-op SSR) and `partialize` to whitelist only non-sensitive fields. Set `isHydrated` via `onRehydrateStorage`.
6. **Selectors with `useShallow`** in components; expose focused slices so screens don't over-subscribe.
7. **No UI / navigation in stores.** Stores return data and throw/flag errors; screens decide UX (haptics, routing).
8. **Logout/clear** must reset the store AND clear SecureStore (see `auth.store.ts` `logout`).
9. **Typed.** Define a `XxxState` interface; no `any`. Actions return `Promise<void>` (or typed results).

## Pattern (follow src/modules/auth/store/auth.store.ts)
```ts
interface CustomerState {
  customers: Customer[]
  isLoading: boolean
  error: string | null
  fetchCustomers: () => Promise<void>
  addCustomer: (data: CreateCustomerDto) => Promise<void>
  clearError: () => void
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
  fetchCustomers: async () => {
    set({ isLoading: true, error: null })
    try {
      const customers = await customerService.getAll()
      set({ customers, isLoading: false })
    } catch (err) {
      logError(err)                          // error-handling.md
      set({ isLoading: false, error: mapApiError(err) })
    }
  },
  addCustomer: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const created = await customerService.create(data)
      set((s) => ({ customers: [...s.customers, created], isLoading: false }))
    } catch (err) {
      logError(err)
      set({ isLoading: false, error: mapApiError(err) })
      throw err
    }
  },
}))
```

## Definition of Done (Review checklist)
- [ ] `useXxxStore` in the feature's `store/` folder, `XxxState` typed, no `any`
- [ ] `isLoading` + `error` (i18n key) present; async actions follow set→try→catch pattern
- [ ] Errors mapped via `mapApiError`; failures logged (`error-handling.md`)
- [ ] No tokens/secrets in state or `partialize`; secrets in SecureStore
- [ ] `persist`/`partialize` whitelists only non-sensitive fields (if persisted)
- [ ] No navigation/haptics/UI inside the store
- [ ] Components select via `useShallow`

## Common violations → findings
- Token in Zustand state or `partialize` → BLOCKER (security)
- Raw error string in `error` instead of i18n key → MAJOR
- `set` without resetting `error`/`isLoading` on entry → MAJOR
- `router.push` / `Haptics` inside store → MAJOR (separation of concerns)
