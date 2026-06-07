# Skill 06 — Navigation & Routing (MANDATORY)

Routing is file-based via Expo Router. Screen *files* live in `app/`; screen *implementations* live in `src/modules/<feature>/screens/` and are imported by the route file.

## When to use
Adding routes, route groups, deep links, or changing navigation flow.

## Rules
1. **Route files in `app/`** map to URLs: `app/(app)/home.tsx` → `/(app)/home`, `app/customer/[id].tsx` → `/customer/123`. Keep route files thin — they import and render the screen from `src/modules/...`.
2. **Route groups** `(auth)` / `(app)` separate unauthenticated vs authenticated areas. Guard `(app)` on `isAuthenticated`; redirect to `/(auth)/login` when not authed and `isHydrated`.
3. **Navigate with `useRouter()`**: `router.push` to go deeper, `router.replace` after auth transitions (so back doesn't return to login — see LoginScreen `router.replace('/(app)/home')`), `router.back()` to return.
4. **Max 2 taps** to any primary action (product rule).
5. **Typed routes** — use the literal route paths Expo Router generates; don't build path strings by hand where avoidable.
6. **Back is always possible** — no dead ends; Android hardware back must behave (`useFocusEffect`/`BackHandler` when intercepting).
7. **Deep links** — register the scheme (`expo-linking`); deep links must resolve through the auth guard (no bypassing login).
8. **No business logic in route files**; no data fetching there — the screen owns that.

## Pattern
```tsx
// app/(app)/customers.tsx
import CustomersScreen from '@modules/customers/screens/CustomersScreen'
export default CustomersScreen

// inside a screen
const router = useRouter()
router.push(`/customer/${id}`)   // deeper
router.replace('/(app)/home')    // after login/signup
router.back()                    // return
```

## Definition of Done (Review checklist)
- [ ] Route file in `app/` is thin; implementation in `src/modules/.../screens`
- [ ] `(app)` routes guarded on `isAuthenticated` + `isHydrated`; redirect to `(auth)` otherwise
- [ ] `router.replace` used after auth transitions; `push`/`back` used appropriately
- [ ] ≤ 2 taps to any primary action; no dead-end screens
- [ ] Deep links pass through the auth guard
- [ ] No data fetching/business logic in route files

## Common violations → findings
- `router.push` to home after login (login stays in back stack) → MAJOR
- `(app)` screen reachable while unauthenticated → BLOCKER (security)
- Path string typo'd by hand instead of typed route → MINOR/MAJOR
