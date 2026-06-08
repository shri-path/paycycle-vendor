# Feature Tasks: Roles & Access Control (US-002)

Frontend-only. Backend (`paycycle_api` staff module) is complete — match its contracts (see FEATURE_PLAN.md → API Integration). Every task tags the skill(s) the Dev MUST follow (`.claude/skills/`). All strings via `t()` in all 9 locales; all screens render 5 states; tokens-only styling; no `any`; `vendorId` from `auth.store.vendorContext` only.

---

## Parallel Workstreams (conflict-free partition)

> Dev/Review/QA launch one sub-agent per workstream within a phase, simultaneously. Sub-agents edit ONLY their owned files and never commit (the orchestrator integrates). The union of all "Owned files" has NO overlap — every shared/collision-prone file belongs to WS-0.

### Phase 1 — Foundation (run first, single owner)

**WS-0: Foundation / shared**
- **Phase**: 1
- **Owned files**:
  - `src/types/roles.ts` (NEW)
  - `src/constants/apiPaths.ts` (EDIT — add `Vendors`/`Staff` group + `Auth.AcceptInvite`)
  - `src/services/api.service.ts` (EDIT — export `rolesService`)
  - `src/services/http.ts` (NEW — shared axios instance + 401/403 interceptor, per OQ-3)
  - `src/utils/errorMapper.ts` (EDIT — add roles error codes)
  - `src/locales/{en,hi,ta,te,mr,bn,kn,ml,gu}.json` (EDIT — add `roles.*` namespace)
  - `src/components/index.ts` (EDIT — export new shared components)
  - `src/components/composite/RoleGate.tsx` (NEW)
  - `src/components/composite/RoleBadge.tsx` (NEW)
  - `jest.setup.js` (EDIT only if a new mock is needed; otherwise untouched)
- **Depends on**: —
- **Produces (contracts — FROZEN, downstream codes against these)**:
  - **Types** in `src/types/roles.ts`: `PermissionKey`, `StaffRoleLabel`, `StaffStatus`, `RoleContextDto`, `TodayStatsDto`, `StaffResponseDto`, `InviteStaffResponseDto`, `RemoveStaffResponseDto`, `SupplyListOptionDto { listId: string; name: string }` (OQ-6, stub-backed until US-005), plus input types `InviteStaffInput { phone: string; name?: string; areaRouteLabel?: string; permissions?: PermissionKey[]; assignedListIds?: string[]; sendVia?: 'whatsapp'|'sms' }` and `UpdateStaffInput { status?: 'ACTIVE'|'DISABLED'; areaRouteLabel?: string|null; permissions?: PermissionKey[] }`. (Shapes per FEATURE_PLAN.)
  - **APIPath additions** (exact): `APIPath.Vendors.Role(vendorId)`, `.Staff.List(vendorId)`, `.Staff.Detail(vendorId, staffId)`, `.Staff.Invite(vendorId)`, `.Vendors.SupplyLists(vendorId)` (OQ-6 stub), `.Staff.Lists(vendorId, staffId)` (POST assign, OQ-6 stub), `.Staff.ListDetail(vendorId, staffId, listId)` (DELETE unassign, OQ-6 stub), and `APIPath.Auth.AcceptInvite = '/auth/accept-invite'`. (Functions returning the path strings under `/vendors/...`.)
  - **`mapApiError`** returns these i18n keys for new codes: `roles.error_forbidden` (403), `roles.error_already_staff` (409), `roles.error_staff_limit` (451), `roles.error_staff_not_found`/`roles.error_no_membership` (404), `roles.error_invite_expired` (422 on accept), `roles.error_invite_invalid` (404 on accept).
  - **`RoleGate`** prop API: `{ require?: 'owner'; permission?: PermissionKey; listId?: string; fallback?: ReactNode; children: ReactNode }` (exactly one condition prop set).
  - **`RoleBadge`** prop API: `{ role: 'owner'|'staff'; areaLabel?: string | null }`.
  - **i18n keys**: the full `roles.*` key list in FEATURE_PLAN → Localization.
  - **`http.ts`**: exports `httpClient` (axios instance, `baseURL`/`timeout` from `API_CONFIG`) and registers a response interceptor that, on 401/403 for authenticated calls, triggers `auth.store.logout()` (import lazily to avoid cycle).
- **Skills**: `component-development.md`, `accessibility-ux.md`, `localization-i18n.md`, `api-integration.md`, `error-handling.md`, `security-auth.md`

### Phase 2 — Feature workstreams (run in parallel; depend only on WS-0 contracts)

**WS-1: Roles service + store + role hooks**
- **Phase**: 2
- **Owned files**:
  - `src/modules/roles/service/roles.service.ts` (+ `__tests__/roles.service.test.ts`)
  - `src/services/mocks/roles.mock.ts` (NEW) and `src/services/mocks/index.ts` (EDIT — add roles mock exports) *(see note)*
  - `src/modules/roles/store/roles.store.ts` (+ `__tests__/roles.store.test.ts`)
  - `src/modules/roles/hooks/useRole.ts`, `src/modules/roles/hooks/useRequireOwner.ts`
  - `src/modules/auth/store/auth.store.ts` (EDIT — call `clearRoles()` in `logout()`) *(see note)*
- **Depends on**: WS-0 (types, APIPath, mapApiError, http.ts)
- **Consumes (contracts)**: all WS-0 types + APIPath + `httpClient`.
- **Produces (contracts for WS-2/WS-3)**: roles.store actions incl. the OQ-6 list-assignment trio — `fetchSupplyListOptions() → Promise<void>` (fills `supplyListOptions: SupplyListOptionDto[]`), `assignLists(staffId, listIds) → Promise<void>`, `unassignList(staffId, listId) → Promise<void>` — plus `supplyListOptions`/`isSupplyListsLoading` state. (Stub-backed until US-005 — OQ-6 dependency risk.)
- **Note on shared files**: `src/services/mocks/index.ts` and `src/modules/auth/store/auth.store.ts` are touched ONLY by WS-1 (not by WS-0 or any other WS-2/3/4 stream) — assigned here to keep them single-owner. If the orchestrator prefers, the two one-line edits can be hoisted into WS-0; pick one and keep it consistent.
- **Skills**: `api-integration.md`, `state-management.md`, `offline-first.md`, `error-handling.md`, `security-auth.md`, `testing-strategy.md`

**WS-2: Owner staff-management screens (List, Invite, Detail) + StaffCard/PermissionToggleList**
- **Phase**: 2
- **Owned files**:
  - `src/modules/roles/components/StaffCard.tsx`, `src/modules/roles/components/PermissionToggleList.tsx`, `src/modules/roles/components/SupplyListMultiSelect.tsx` (module-local composites; + tests) — `SupplyListMultiSelect` is the OQ-6 assign UI
  - `src/modules/roles/screens/StaffListScreen.tsx` (+ test)
  - `src/modules/roles/screens/InviteStaffScreen.tsx` (+ test)
  - `src/modules/roles/screens/StaffDetailScreen.tsx` (+ test)
  - `app/(app)/staff/_layout.tsx`, `app/(app)/staff/index.tsx`, `app/(app)/staff/invite.tsx`, `app/(app)/staff/[staffId].tsx` (route files importing the screens)
- **Depends on**: WS-0 (RoleGate, RoleBadge, types, i18n), WS-1 (roles.store actions + `useRole`/`useRequireOwner`)
- **Consumes (contracts)**: `useRole()`, `roles.store` actions (`fetchStaffList`, `fetchStaffDetail`, `inviteStaff`, `updateStaff`, `removeStaff`, and the OQ-6 trio `fetchSupplyListOptions`/`assignLists`/`unassignList` + `supplyListOptions` state), WS-0 component APIs + `SupplyListOptionDto`.
- **Skills**: `screen-development.md`, `component-development.md`, `form-validation.md`, `navigation-routing.md`, `animation-haptics.md`, `accessibility-ux.md`, `error-handling.md`, `performance-optimization.md`, `localization-i18n.md`, `testing-strategy.md`

**WS-3: Staff Join screen + Staff Home + role routing**
- **Phase**: 2
- **Owned files**:
  - `src/modules/roles/screens/StaffJoinScreen.tsx` (+ test)
  - `src/modules/roles/screens/StaffHomeScreen.tsx` (+ test)
  - `src/modules/auth/store/auth.store.ts` is NOT owned here (WS-1 owns it). Join uses a NEW `acceptInvite` action — see note.
  - `app/join/[token].tsx` (NEW public route), `app/(app)/index.tsx` (NEW role router), `app/(app)/staff-home.tsx`
  - `app/index.tsx` (EDIT — redirect authenticated users to `/(app)` role router instead of `/(app)/home`)
- **Depends on**: WS-0 (types, i18n, RoleBadge), WS-1 (`useRole`, role fetch). Auth `acceptInvite` action: to keep `auth.store.ts` single-owner (WS-1), the `acceptInvite(token, password, name?)` action is added by **WS-1** (it lives in `auth.store` and reuses `LoginResponseDto`); WS-3 only calls it. Listed as a WS-1→WS-3 contract below.
- **Consumes (contracts)**: `auth.store.acceptInvite(token, password, name?) → Promise<void>` (sets tokens + vendorContext like login); `useRole()`; `roles.store.fetchRole()`.
- **Skills**: `screen-development.md`, `navigation-routing.md`, `security-auth.md`, `form-validation.md`, `animation-haptics.md`, `accessibility-ux.md`, `error-handling.md`, `localization-i18n.md`, `testing-strategy.md`

> **Cross-stream contract (WS-1 → WS-3)**: WS-1 adds `acceptInvite` to `auth.store` and `clearRoles` wiring in `logout`; WS-3 consumes `acceptInvite` only. Because both relate to `auth.store.ts`, **WS-1 is the sole editor of that file**; WS-3 must not edit it. This keeps the partition file-disjoint.

> **Verify before fan-out**: the only files appearing in more than one stream above are intentionally assigned to a single owner (`auth.store.ts`→WS-1, `mocks/index.ts`→WS-1). No true overlaps.

### Phase 3 — Integration polish (single owner, after Phase 2 merges)
**WS-5: Wiring & perf pass** — owner More-menu entry to `/(app)/staff`, role badge into headers, performance pass on Staff List, end-to-end manual smoke of role routing. Owned files: whichever home/menu file gains the entry (e.g. `app/(app)/home.tsx` if a menu row is added) + a perf review of WS-2 list. Skills: `performance-optimization.md`, `navigation-routing.md`.

---

## Task List (ordered; each maps to a workstream)

### Task 1: Roles types & DTOs  _(WS-0)_
- **Skills**: `api-integration.md`
- Create `src/types/roles.ts` with all frozen DTOs + input types from the contract. No `any`. Add a purpose header comment.
- **Acceptance**: types compile; mirror backend `staff.types.ts` exactly (field names, nullability, `PermissionKey` union = `mark_deliveries|mark_leaves|add_extra_charges`); `accept-invite` reuses existing `LoginResponseDto`.

### Task 2: API paths & shared http client  _(WS-0)_
- **Skills**: `api-integration.md`, `error-handling.md`, `security-auth.md`
- Add `APIPath.Vendors.*` path builders and `APIPath.Auth.AcceptInvite`. Create `src/services/http.ts` (shared axios instance from `API_CONFIG`; response interceptor: on 401/403 for authenticated calls → `auth.store.logout()` via lazy import, no cycle).
- **Acceptance**: paths match `/api/v1/vendors/:vendorId/...` and `/auth/accept-invite`; interceptor logs via `logError` and triggers logout once; unit-tested with a mocked 403.

### Task 3: Error mapping for roles codes  _(WS-0)_
- **Skills**: `error-handling.md`, `localization-i18n.md`
- Extend `mapApiError` with the roles code→i18n-key table. Do not duplicate the mapper.
- **Acceptance**: each backend code (403/409/451/404/422) returns the documented `roles.*` key; network error still → `common.offline_message`; correlationId still extracted.

### Task 4: Shared components — RoleGate, RoleBadge  _(WS-0)_
- **Skills**: `component-development.md`, `accessibility-ux.md`
- Build `RoleGate` (renders children only when condition met; default `fallback={null}`) and `RoleBadge` (over `AppBadge`). Export from `src/components/index.ts`. Tokens-only, purpose headers.
- **Acceptance**: RoleGate hides children for unauthorized role/permission/list; RoleBadge shows correct label + optional area; a11y label present; unit tests cover owner/staff/permission/list cases.

### Task 5: Localization keys (all 9 languages)  _(WS-0)_
- **Skills**: `localization-i18n.md`
- Add the full `roles.*` namespace to `en, hi, ta, te, mr, bn, kn, ml, gu`. Use interpolation (`{{count}}`, `{{name}}`, etc.) consistently.
- **Acceptance**: every `roles.*` key present in all 9 files with the same key set; no hardcoded user-facing strings introduced elsewhere; en is human English (others translated, not English placeholders).

### Task 6: Roles service + mock  _(WS-1)_
- **Skills**: `api-integration.md`, `error-handling.md`
- Create `roles.service.ts` (mock/real via `isMockMode`, using `httpClient` + `APIPath`): `getRole`, `listStaff(page,limit)`, `getStaff(staffId)`, `inviteStaff(input)` (input may carry `assignedListIds`), `updateStaff(staffId, patch)`, `removeStaff(staffId)`, and the **OQ-6 list-assignment trio** `listSupplyLists()` (stub `GET /vendors/:id/supply-lists` → `SupplyListOptionDto[]`), `assignLists(staffId, listIds)` (POST stub), `unassignList(staffId, listId)` (DELETE stub). Add `roles.mock.ts` with deterministic owner+staff fixtures **plus supply-list option fixtures**; export from `mocks/index.ts`.
- **Acceptance**: real mode hits correct paths and unwraps `{ data }`/`meta`; mock returns typed fixtures incl. an empty-list case, a `null todayStats`, and an empty supply-list-options case; assign/unassign mock mutates fixture `assignedListIds` deterministically; service unit tests for each method (mock mode) pass.

### Task 7: Roles store + auth.store wiring  _(WS-1)_
- **Skills**: `state-management.md`, `offline-first.md`, `security-auth.md`
- Build `roles.store.ts` (state + actions from FEATURE_PLAN; `useShallow`-friendly; `logError`+`mapApiError` in catch; persist only `roleContext`+`assignedListIds`). Include the **OQ-6 list-assignment actions** `fetchSupplyListOptions`/`assignLists`/`unassignList` + `supplyListOptions`/`isSupplyListsLoading` state (re-fetch staff detail after assign/unassign). Add `clearRoles()` and call it in `auth.store.logout()`. Add `acceptInvite(token,password,name?)` to `auth.store` (reuses `authService`/accept-invite endpoint → tokens to SecureStore → set `vendorContexts[0]`).
- **Acceptance**: logout clears roles + tokens (verified); persisted role survives reload; mutations set loading/error correctly; assign/unassign update cached detail's `assignedListIds`; store unit tests cover success + 403/409/451 paths + assign/unassign; no token/PII in persisted state.

### Task 8: Role hooks  _(WS-1)_
- **Skills**: `state-management.md`
- `useRole()` → `{ roleContext, isOwner, isStaff, hasPermission, canAccessList, isLoading, error }`; `useRequireOwner()` redirects non-owners to `/(app)/staff-home`.
- **Acceptance**: hooks pure, selector-based; `hasPermission` true for owner always (owner = all-allow), checks `permissions[]` for staff; `canAccessList` true for owner, checks `assignedListIds` for staff; tested.

### Task 9: StaffCard, PermissionToggleList & SupplyListMultiSelect  _(WS-2)_
- **Skills**: `component-development.md`, `accessibility-ux.md`, `animation-haptics.md`
- Module-local composites. `StaffCard` (avatar/name/phone/lists/today/status badge, ≥44 tap target, memoized). `PermissionToggleList` (over `AppCheckbox`/`AppToggle`, `editable` prop, `accessibilityRole="switch"`). **`SupplyListMultiSelect`** (OQ-6 — `props: { options: SupplyListOptionDto[]; value: string[]; onChange; isLoading? }`; checkbox list over `AppCheckbox`; loading skeleton; empty state "Create a supply list first"; ≥44 rows; `accessibilityState={{ checked }}`).
- **Acceptance**: render/behaviour tests for all three; haptic on toggle/select; null `todayStats` shows placeholder; `SupplyListMultiSelect` reflects/edits selection and shows loading + empty states; all reuse existing primitives (no new primitive).

### Task 10: Staff List screen + route  _(WS-2)_
- **Skills**: `screen-development.md`, `navigation-routing.md`, `performance-optimization.md`, `error-handling.md`, `localization-i18n.md`, `animation-haptics.md`, `accessibility-ux.md`
- 5 states; `FlatList` (memoized item, keyExtractor, initialNumToRender); FAB → invite; card → detail; pull-to-refresh; `useRequireOwner` guard; offline banner + disabled FAB. **OQ-5: show only "Active: N" (real, from staff count); omit the plan/staff-allowed line** (deferred to US-009).
- **Acceptance**: all 5 states reachable; only "Active: N" shown (no plan/allowed line); owner-only guard works; pagination past 50; haptics on tap/FAB; wrapped in `ScreenErrorBoundary`; tests for states + navigation.

### Task 11: Invite Staff screen + route  _(WS-2)_
- **Skills**: `screen-development.md`, `form-validation.md`, `navigation-routing.md`, `error-handling.md`, `animation-haptics.md`, `accessibility-ux.md`, `localization-i18n.md`
- Form per wireframe 2.14 (phone required, name/area optional, permissions, send-via segmented). Inline validation (`validatePhone`, area max 200). **OQ-6: render the full `SupplyListMultiSelect` inline** (options from `fetchSupplyListOptions`); selected `listIds` go in the invite body as `assignedListIds`; loading/empty states handled. Success → `AppBottomSheet` with `inviteUrl` + share. Map 409 to banner; **451 → generic "staff limit reached — contact support to upgrade" `AppAlert` (no in-app upgrade CTA, OQ-5)**. Offline disables submit.
- **Acceptance**: inline errors clear live; double-tap guarded; multi-select loads options and includes selected `assignedListIds` in the request; success sheet shows URL + share works (Linking/Sharing); 409 banner + 451 generic message + network mapped correctly; tests cover validate/success/error/list-select.

### Task 12: Staff Detail screen + route  _(WS-2)_
- **Skills**: `screen-development.md`, `form-validation.md`, `navigation-routing.md`, `error-handling.md`, `animation-haptics.md`, `accessibility-ux.md`, `localization-i18n.md`
- Per wireframe 2.15: profile, **assigned lists with full assign/unassign UI (OQ-6)** — each assigned row has "Unassign" (→ `AppConfirmDialog` → `unassignList`); "+ Assign to Another List" opens `SupplyListMultiSelect` in an `AppBottomSheet` (→ `assignLists`); re-fetch detail after each. Month stats placeholder, area inline edit, permissions toggle+save, disable/enable, remove (`AppConfirmDialog`). Owner-self actions never rendered; surface server 403 ("cannot modify/remove owner") gracefully. 404 → empty state.
- **Acceptance**: each mutation calls the right `updateStaff`/`removeStaff`/`assignLists`/`unassignList` shape; assign/unassign update the assigned-lists section after re-fetch; confirm dialog on remove + unassign with Warning haptic; offline disables all mutations (incl. assign/unassign); 5 states; tests cover toggle-save, disable, remove, assign, unassign, 404.

### Task 13: Staff Join screen + public deep-link route  _(WS-3)_
- **Skills**: `screen-development.md`, `navigation-routing.md`, `security-auth.md`, `form-validation.md`, `error-handling.md`, `animation-haptics.md`, `accessibility-ux.md`, `localization-i18n.md`
- `app/join/[token].tsx` (public). **OQ-1: render invite summary (vendor name + supply-list labels) from the URL query params** (server-side validation still on submit); read-only phone; password (≥8); "Join as Staff" → `auth.store.acceptInvite` → role-routed home. **OQ-2: if a session exists, show the "signed in as <X> — sign out to join" prompt with "Sign out & continue" (calls `logout()` first); do NOT silently log out.** **OQ-4: deep link is `paycyclevendor://join/<token>`** — the `paycyclevendor` scheme already exists in `app.json`, so no config change is needed; the existing `app/join/[token].tsx` route resolves it (no universal link for v1). Map 404/422 invite errors to full-screen empty state. Offline disables submit.
- **Acceptance**: `paycyclevendor://join/<token>` deep link opens the screen; summary renders from query params; logged-in user is required to sign out first (no silent logout); successful accept auto-logs-in (tokens in SecureStore) and lands on staff-home; expired/invalid token shows correct message; tests cover success + already-logged-in + both error states + offline.

### Task 14: Staff Home + role router  _(WS-3)_
- **Skills**: `screen-development.md`, `navigation-routing.md`, `error-handling.md`, `localization-i18n.md`, `accessibility-ux.md`
- `app/(app)/index.tsx` role router (Owner→home, Staff→staff-home; waits for `isHydrated` + role fetch, shows loader). `StaffHomeScreen` per wireframe 3.1 (today summary placeholder, assigned lists, financial-owner-only note, RoleBadge with area). Update `app/index.tsx` to redirect to `/(app)`.
- **Acceptance**: owner never sees staff-home and vice-versa; role router handles loading/offline (cached role) without flicker; 5 states on staff-home; tests for routing + states.

### Task 15: Session-revocation handling  _(WS-1 core, consumed by WS-2/WS-3)_
- **Skills**: `error-handling.md`, `security-auth.md`, `real-time-sync.md`
- In `http.ts` interceptor + store actions: 403 → logout + `roles.access_changed` alert on login; on screen focus re-`fetchRole`, if permissions changed show `roles.permissions_updated`. (Reactive only per OQ-7.)
- **Acceptance**: simulated 403 logs out and routes to login with the alert; permission drift re-renders gates; logged via shared logger with correlationId, no PII.

### Task 16: Offline behavior  _(WS-1 + WS-2/WS-3 screens)_
- **Skills**: `offline-first.md`, `real-time-sync.md`
- Reads serve cache + banner; security mutations (invite/update/remove/accept) are online-only and submit-disabled offline (documented deviation in FEATURE_PLAN). Re-fetch role on `isOnline` true transition.
- **Acceptance**: offline shows cached role/staff with banner; mutation buttons disabled offline with a11y hint; reconnect refreshes role; no write queued for security mutations.

### Task 17: Tests  _(each WS owns its tests)_
- **Skills**: `testing-strategy.md`
- Co-located `__tests__` for components (Task 4, 9), service (Task 6), store/hooks (Task 7, 8), and each screen (Tasks 10–14). Cover 5 states, role gating, error codes, offline-disabled mutations.
- **Acceptance**: suite green under `jest-expo`; meaningful assertions (not snapshots-only) for gating and error mapping.

### Task 18: Security & multi-tenancy pass  _(WS-1 + reviewers)_
- **Skills**: `security-auth.md`
- `vendorId` only from `auth.store.vendorContext`; tokens only in SecureStore; `clearRoles` on logout; no role/permission decision trusted from client for actual data access (UI gate is convenience; server enforces). No PII in logs.
- **Acceptance**: grep shows no `vendorId` from route params/user input for API calls; logout wipes roles store + SecureStore; persisted state contains no tokens/PII.

### Task 19: Performance pass  _(WS-5, Phase 3)_
- **Skills**: `performance-optimization.md`
- Memoize `StaffCard`; tune `FlatList`; ensure role hooks use `useShallow`; verify `/(app)/staff/*` only loads for owners.
- **Acceptance**: no avoidable re-renders on Staff List scroll (verified via render count in test or manual profiler note); list smooth with 50+ items on a 2GB-RAM target.

---

## Resolved decisions (see FEATURE_PLAN → "Resolved Decisions")
All US-002 open questions are resolved (2026-06-08): OQ-1 invite preview via URL query params (approved); OQ-2 require explicit sign-out before joining while logged in (approved); OQ-3 shared `http.ts` 401/403 interceptor in Foundation (approved); OQ-4 `paycyclevendor://join/<token>` scheme deep link, no universal link in v1 (approved); OQ-5 show only "Active: N" + generic 451 message, real upgrade deferred to US-009 (approved); **OQ-6 build the FULL assign/unassign supply-list multi-select NOW against the stub (CHANGED from read-only) — carries a US-005 dependency risk that Review/QA must track**; OQ-7 reactive role detection for v1, Socket.IO push later (approved).

> **OQ-6 dependency risk (Review/QA awareness)**: `SupplyListMultiSelect`, `listSupplyLists`/`assignLists`/`unassignList`, `SupplyListOptionDto`, and the stub endpoints run against the backend's list-assignment **stub** until **US-005** ships the real supply-list service. The full UI is built now per the user's decision; these contracts must be re-verified when US-005 lands and may require rework.

## Definition of Done (feature)
- All 5 screens render Loading/Empty/Error/Content/Offline.
- OQ-6 full assign/unassign multi-select works on Invite + Detail against the stub (with the US-005 re-verification risk noted).
- Role routing correct (owner vs staff) and owner-only routes guarded (route group + `useRequireOwner`).
- All backend error codes mapped to localized messages; failures logged with correlationId, no PII.
- All `roles.*` keys present in all 9 locales; zero hardcoded strings.
- Security mutations online-only; tokens in SecureStore; `clearRoles` on logout.
- Tests green; Review skill-compliance clean; QA validates observable outcomes; Architect signoff.
