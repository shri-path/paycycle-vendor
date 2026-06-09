# Feature: Roles & Access Control (US-002)

## Overview

A two-tier role system layered on top of the already-shipped authentication feature (US-003). Every authenticated user is, within a given vendor, either an **Owner** (full access, subscription holder) or **Staff** (limited operational access scoped to assigned supply lists). This feature delivers the **frontend** half of US-002 only — the backend (`paycycle_api` staff module) is complete and its contracts are fixed (see "API Integration" — do NOT invent or change them).

Scope of this feature (frontend):

1. **Role detection & context** — resolve the caller's role + permissions for the active vendor and expose it app-wide (hooks: `isOwner`, `isStaff`, `hasPermission`, `canAccessList`).
2. **Role-aware routing** — Owner lands on the dashboard; Staff lands on a today's-delivery home. A hard guard prevents Staff from reaching owner-only routes.
3. **Staff management (Owner-only)** — Staff List, Staff Detail, Invite Staff.
4. **Staff Join via invite link** — public deep-linked screen that activates a membership and auto-logs-in.
5. **Permission-gated UI primitives** — reusable gate components/hooks that other features (US-005/006/009) consume to show/hide controls.
6. **Session-revocation handling** — detect 403 (disabled/removed mid-session) and 409 (permissions changed) and react (logout / refresh-role prompt).

> Out of scope (other stories own these screens): Supply Lists CRUD (US-005), delivery marking screens (US-006), payments (US-008), subscription (US-009). This feature only provides the **role/permission gates and the role-detection contract** those screens will consume, plus the staff-management and join screens that are unique to US-002.

---

## User Story Reference

- Story: `project_documents/vendor_app/user_stories/US-002-roles-access-control.md`
- Feature: `project_documents/vendor_app/features/02-roles-access.md`
- Wireframes: `wireframes/06-staff-management.md` (2.13–2.15), `wireframes/16-staff-screens.md` (3.1 Staff home), `wireframes/01-authentication.md` (1.3 Staff Join)
- Depends on (shipped): US-003 Authentication (`src/modules/auth/**`, `auth.store`, SecureStore tokens, `mapApiError`, `logger`).

---

## Screen Flow

All primary actions are reachable in ≤ 2 taps from the relevant home.

```
(auth group, public)
  /login ──┐
  /signup  ├─ existing (US-003)
  /join/[token]  ← NEW: staff join via invite deep link → auto-login → role-routed home

(app group, authenticated, role-routed at /(app)/index)
  Owner:
    /(app)/home  (dashboard — existing; gains a role badge + "Staff" menu entry)
      └─tap "Staff"→ /(app)/staff            (Staff List, owner-only)   [tap 1]
            ├─FAB "+ Invite Staff" → /(app)/staff/invite                [tap 2]
            └─tap a staff card   → /(app)/staff/[staffId]               [tap 2]
                  └─ inline: toggle permissions, disable, remove (confirm dialog)

  Staff:
    /(app)/staff-home  (today's delivery checklist — NEW)
      └─ owner-only routes are guarded → redirect to /(app)/staff-home
```

### Entry points from existing screens
- `/(app)/index` (NEW redirect route) replaces the current direct redirect to `/(app)/home`: it reads role and routes Owner → `home`, Staff → `staff-home`.
- Existing `app/index.tsx` already redirects authenticated users into the app group; it will redirect to `/(app)` (the role router) instead of `/(app)/home`.
- The **More/Settings** menu (owner) gains a "Staff Management" row → `/(app)/staff`.

---

## Screen Specifications

> Shared rules for every screen below: wrapped in `ScreenErrorBoundary`; renders all 5 states (Loading skeleton, Empty, Error, Content, Offline); all strings via `t()`; touch targets ≥ 44×44; haptics on every primary action; reuses existing primitives/composites.

### 1. Staff Join — `/join/[token]` (public, NEW)

Wireframe 1.3. Reachable from the `paycyclevendor://join/<token>` deep link / invite URL while logged out (and while logged in — explicit sign-out required, see "Already-logged-in" below).

- **Layout**: Centered logo (reuse LoginScreen logo block), invite summary card (vendor name + assigned-list labels), pre-filled phone (read-only), password field, "Join as Staff" primary button (bottom-anchored).
- **Invite preview source (OQ-1, resolved)**: the owner's shared invite URL embeds the **vendor name + supply-list labels as query params** (the owner has this data when creating the invite). The Join screen renders them optimistically from the URL; the token itself is only truly validated server-side on submit. Query params are cosmetic/human-readable (business name + list labels only — no PII); real auth happens on `accept-invite`.
- **Component tree**: `ScreenContainer(SafeAreaView)` → `ScrollView` → logo `YStack` → `AppCard` (invite summary, from query params) → `AppInput` (phone, `editable={false}`) → `AppInput` (password, show/hide toggle — reuse LoginScreen pattern) → `AppButton` (primary).
- **Already-logged-in (OQ-2, resolved)**: if an authenticated session exists when `/join/[token]` opens, render a "You're signed in as <X>. Sign out to join as staff?" state with a **"Sign out & continue"** button that calls `auth.store.logout()` first, then proceeds to the join form. Joining while logged in is **not** allowed silently — explicit sign-out is required (accept-invite issues a fresh session; avoids ambiguous multi-account state on shared low-end devices).
- **States**:
  - **Loading**: skeleton card while reading query params / checking session (no GET endpoint — token decoded client-side only enough to render; real validation happens on submit).
  - **Empty**: n/a (single record flow).
  - **Error**: invalid/expired/used token → full-screen `AppEmptyState` (icon + message + "Back to Sign In" CTA). Maps backend `INVALID_INVITE` (404) and `EXPIRED_INVITE` (422).
  - **Content**: invite summary + form (or the sign-out-first prompt when a session exists, per OQ-2).
  - **Offline**: `AppAlert type="warning"` banner; submit disabled (join needs the network — it is an auth mutation, not offline-queueable; see "Offline Behavior").
- **Interactions**: (if logged in, require sign-out first per OQ-2) → tap submit → validate password (`validatePassword`, ≥ 8) → call store `acceptInvite(token, password, name?)` → on success auto-login (tokens to SecureStore) → route to role home. Double-tap guarded via `useRef` (LoginScreen pattern).
- **Haptics**: Medium impact on submit; Success/Error notification on result.
- **Animation**: fade-in of summary card (reanimated `FadeIn`, ≤ 200ms).

### 2. Staff List — `/(app)/staff` (Owner-only, NEW)

Wireframe 2.13.

- **Layout**: `AppHeader` (title "Staff Management", back). Activity line showing **only "Active: N"** (real, from staff count) — the plan/staff-allowed line is **omitted for v1** (OQ-5, resolved); the real plan banner + in-app upgrade flow is deferred to US-009. `AppSection "Active Staff"` → `FlatList` of staff cards. `AppSection "Disabled (n)"` → collapsed list. FAB "+ Invite Staff" bottom-right.
- **Component tree**: `AppHeader` → `FlatList`(staff) with `StaffCard` (NEW composite) item → `AppSection` headers → `AppButton`/`AppIconButton` FAB.
- **`StaffCard`** shows: `AppAvatar` (initial), name, phone, assigned list names, `todayStats` ("73/82 done" — `todayStats` may be `null` until US-006; render "—" placeholder), `AppBadge` status (Active/Disabled/Invited).
- **States**:
  - **Loading**: 3 skeleton cards (shape, not spinner).
  - **Empty**: `AppEmptyState` "No staff yet" + illustration + "Invite Staff" CTA.
  - **Error**: inline retry card (`AppAlert` + retry button) — never blank.
  - **Content**: active + disabled sections.
  - **Offline**: show cached list (from store) with an offline banner; FAB disabled (invite is online-only).
- **Interactions**: tap card → detail; pull-to-refresh re-fetches; FAB → invite. `403` on load (owner demoted) → see session-revocation handling.
- **Haptics**: Light selection on card tap; Medium on FAB.
- **Performance**: `FlatList` with `keyExtractor`, memoized `StaffCard` (`React.memo`), `initialNumToRender={8}`. Story notes >50 staff is rare; paginate via `page`/`limit` (backend supports it) with infinite scroll only past page 1.

### 3. Invite Staff — `/(app)/staff/invite` (Owner-only, NEW)

Wireframe 2.14.

- **Layout**: `AppHeader` (title "Invite Staff", back) → `ScrollView` form → bottom-anchored "Send Invite" `AppButton`.
- **Fields**: phone (`AppPhoneInput`, required, `validatePhone`), name (`AppInput`, optional), area/route label (`AppInput`, optional, max 200), **supply-list assign multi-select** (full `SupplyListMultiSelect` checkbox list, OQ-6 resolved — see below), permissions checkboxes (`mark_deliveries`, `mark_leaves`, `add_extra_charges` via `AppCheckbox`), "Send via" `AppSegmentedControl` (WhatsApp / SMS).
- **Supply-list multi-select (OQ-6, resolved — build the FULL UI now)**: the multi-select sources its options from the backend's **list-assignment stub** via `rolesService.listSupplyLists(vendorId)` (returns `SupplyListOptionDto[]`). The owner picks zero-or-more lists; selected `listIds` go in the `invite` body as `assignedListIds`. This is a real, working assign UI (not read-only). **Dependency risk (flag for Review/QA)**: the supply-list data source is a stub until **US-005** ships a real supply-list service; option labels/IDs may change shape when US-005 lands, so the `SupplyListOptionDto` contract and `listSupplyLists`/assign endpoints are pinned in this plan and must be re-verified against US-005.
- **States**:
  - **Loading**: skeleton for the supply-list multi-select section while options load.
  - **Empty**: if the stub returns no supply lists → inline note "Create a supply list first" with the multi-select hidden; lists are optional on the `invite` body, so submit is still allowed with no lists selected.
  - **Error**: inline field errors (red border via `AppInput.error`); banner for API errors. Specific mappings: `409 CONFLICT` → "This phone number is already a staff member"; `451 SUBSCRIPTION_LIMIT` → **generic** "staff limit reached — contact support to upgrade" `AppAlert` (no in-app upgrade screen in v1; real upgrade deferred to US-009, OQ-5).
  - **Content**: full form incl. populated multi-select.
  - **Offline**: banner + submit disabled (invite generates a server-side token; online-only). The multi-select also serves the last-cached options offline (read-cached) but submit stays disabled.
- **Interactions**: validate → `inviteStaff({ ..., assignedListIds })` → on success show **success sheet** (`AppBottomSheet`) with the returned `inviteUrl` + "Share via WhatsApp/SMS" buttons (`expo-sharing`/`Linking`) → on dismiss return to Staff List (refetch). Double-tap guarded.
- **Haptics**: Medium on submit; Success on invite created; Error on validation/API failure.

### 4. Staff Detail — `/(app)/staff/[staffId]` (Owner-only, NEW)

Wireframe 2.15.

- **Layout**: `AppHeader` (title "Staff: <name>", back). Profile `AppCard` (avatar, name, phone, area, joined date, status badge). `AppSection "Assigned Supply Lists"` — **full assign/unassign UI (OQ-6, resolved)**: each assigned list row has an "Unassign" action, plus a "+ Assign to Another List" button that opens a `SupplyListMultiSelect` (in an `AppBottomSheet`) to add lists. `AppStatsCard` month stats (placeholder until US-006). Area label inline edit (`AppInput` + Save). Permissions `AppToggle` rows + "Save Changes". "Temporarily Disable" / "Enable" `AppButton`. "Remove Staff" destructive `AppButton` → `AppConfirmDialog`.
- **States**:
  - **Loading**: skeleton profile + sections.
  - **Empty**: n/a.
  - **Error**: full-screen error with retry; `404` (staff removed elsewhere) → `AppEmptyState` "Staff no longer exists" + back.
  - **Content**: full detail.
  - **Offline**: read cached detail with banner; all mutations disabled.
- **Interactions**:
  - Toggle permissions then "Save Changes" → `updateStaff(staffId, { permissions })`.
  - Edit area label → `updateStaff(staffId, { areaRouteLabel })`.
  - **Assign lists** → pick lists in the multi-select sheet → `assignLists(staffId, listIds)` (backend list-assignment stub) → optimistic-off, re-fetch detail on success.
  - **Unassign a list** → `AppConfirmDialog` → `unassignList(staffId, listId)` → re-fetch detail.
  - Disable/Enable → `updateStaff(staffId, { status: 'DISABLED' | 'ACTIVE' })` with confirm.
  - Remove → `AppConfirmDialog` (destructive) → `removeStaff(staffId)` → back to list. Owner-self attempts are blocked server-side (`403 FORBIDDEN`, "Cannot modify/remove the owner membership") — surface as a friendly message; the UI also never renders these actions for the owner's own row.
  - **Dependency risk (OQ-6, flag for Review/QA)**: `assignLists`/`unassignList` and the list options run against the **stub** list-assignment adapter until **US-005** ships the real supply-list service; behavior and option shape must be re-verified when US-005 lands.
- **Haptics**: Light on toggle; Warning notification before destructive confirm; Success/Error on result.

### 5. Staff Home — `/(app)/staff-home` (Staff-only, NEW)

Wireframe 3.1. Minimal v1 surface for US-002 (the full delivery flow is US-006). Renders the **role-correct landing** so Staff never see the owner dashboard.

- **Layout**: `AppHeader` (vendor name + "Staff: <name>" + area label badge). Today summary `AppStatsCard` (total / completed — placeholder values until US-006 wires real stats). "Your Supply Lists" section (assigned lists, from role context `assignedListIds` resolved to names via `rolesService.listSupplyLists` — the same stub-backed source as the assign UI, OQ-6 resolved) each with progress + "Continue/View". Note: "Financial data visible to owner only".
- **States**: Loading skeleton; Empty ("No lists assigned yet — contact your owner"); Error retry; Content; Offline banner (cached).
- **Interactions**: tap list → opens delivery list (US-006 route; until that ships, a "Coming soon"/disabled state is acceptable — flagged as a cross-story dependency, not a blocker for US-002).
- **Haptics**: Light on list tap.

### 6. Role badge in navigation (Owner home + Staff home)
- Owner: small "Owner" `AppBadge` in the header/profile menu.
- Staff: "Staff" `AppBadge` + area label.

---

## Component Requirements

### New components (Foundation, WS-0 — shared, reusable across stories)
- **`RoleGate`** (composite) — `props: { require: 'owner' } | { permission: PermissionKey } | { listId: string }; fallback?: ReactNode; children: ReactNode`. Renders children only if the role context satisfies the condition; else `fallback` (default `null`). Pure presentational wrapper over the role hooks. Used by US-005/006/008/009 to gate buttons.
- **`StaffCard`** (composite, staff-management-specific but kept generic) — `props: { staff: StaffSummary; onPress: (staffId: string) => void }`.
- **`PermissionToggleList`** (composite) — `props: { value: PermissionKey[]; onChange: (next: PermissionKey[]) => void; editable: boolean }`. Used by Invite + Detail. Built on `AppCheckbox`/`AppToggle`.
- **`SupplyListMultiSelect`** (module-local composite, OQ-6) — `props: { options: SupplyListOptionDto[]; value: string[]; onChange: (next: string[]) => void; isLoading?: boolean }`. Checkbox list (built on `AppCheckbox`) for assigning a staff member to supply lists. Used by Invite (inline) and Detail (in an `AppBottomSheet`). Sources options from `rolesService.listSupplyLists` (stub until US-005).
- **`RoleBadge`** (primitive-ish) — `props: { role: 'owner' | 'staff'; areaLabel?: string | null }`. Thin wrapper over `AppBadge`.

### Reused existing components (no new build)
`AppHeader`, `AppCard`, `AppAvatar`, `AppBadge`, `AppButton`, `AppIconButton`, `AppInput`, `AppPhoneInput`, `AppCheckbox`, `AppToggle`, `AppSegmentedControl`, `AppSection`, `AppEmptyState`, `AppAlert`, `AppStatsCard`, `AppBottomSheet`, `AppConfirmDialog`, `AppLoader`, `ScreenErrorBoundary`.

### Modifications to existing components
- None required. (If `StaffCard` needs a skeleton, build it locally in the module — do not modify primitives.)

---

## State Management

New Zustand store: `src/modules/roles/store/roles.store.ts` (mirrors `auth.store` conventions — `useShallow` selectors, `logError` + `mapApiError` in catch, no PII).

```ts
interface RolesState {
  // Role context for the ACTIVE vendor (auth.store.vendorContext.vendorId)
  roleContext: RoleContextDto | null          // { role, vendorId, staffId, permissions }
  assignedListIds: string[]                    // convenience mirror of roleContext (+ future list names)
  isRoleLoading: boolean
  roleError: string | null                     // i18n key

  // Owner staff-management cache
  staffList: StaffSummary[]
  staffListMeta: { page: number; limit: number; total: number; totalPages: number } | null
  isStaffLoading: boolean
  staffError: string | null
  staffDetail: Record<string, StaffDetail>     // keyed by staffId (cache for offline read)

  // Supply-list options for the assign UI (OQ-6; stub-backed until US-005)
  supplyListOptions: SupplyListOptionDto[]     // cached options for the multi-select
  isSupplyListsLoading: boolean

  // Actions
  fetchRole: () => Promise<void>               // GET /vendors/:vendorId/role
  fetchStaffList: (page?: number) => Promise<void>
  fetchStaffDetail: (staffId: string) => Promise<void>
  inviteStaff: (input: InviteStaffInput) => Promise<InviteStaffResult>  // input may carry assignedListIds
  updateStaff: (staffId: string, patch: UpdateStaffInput) => Promise<void>
  removeStaff: (staffId: string) => Promise<void>
  fetchSupplyListOptions: () => Promise<void>             // OQ-6 — GET stub list options
  assignLists: (staffId: string, listIds: string[]) => Promise<void>   // OQ-6 — assign to lists
  unassignList: (staffId: string, listId: string) => Promise<void>     // OQ-6 — unassign from a list
  clearRoles: () => void                        // called on logout (data-residency: wipe on logout)
}
```

- **Derived selectors / hooks** (pure, in `src/modules/roles/hooks/`):
  - `useRole()` → `{ roleContext, isOwner, isStaff, hasPermission(key), canAccessList(listId), isLoading, error }`.
  - `useRequireOwner()` → effect hook: if hydrated && role resolved && not owner → `router.replace('/(app)/staff-home')`. Used in owner-only screens as defence-in-depth (route group guard is primary).
- **Persistence**: persist only `roleContext` + `assignedListIds` (non-sensitive) via the same AsyncStorage pattern as `auth.store` so role is known instantly offline on next launch; `clearRoles()` wired into `auth.store.logout()` (logout must clear ALL local data).
- **`vendorId` source**: always `auth.store.vendorContext.vendorId` (derived from JWT on the server) — never from route params or user input (multi-tenancy rule).

---

## API Integration

Backend is **complete** — contracts below are taken from `paycycle_api` (do not modify). Base prefix: `/api/v1`. Staff routes mounted at `/api/v1/vendors`. Response envelope: `{ success: true, data: <T> }` (+ `meta` for lists). On error: `{ success?: false, error: { code, message, correlationId? } }` (the existing `mapApiError` + `extractCorrelationId` already parse this).

New service: `src/modules/roles/service/roles.service.ts` (mock + real via `isMockMode`, mirroring `auth.service`). New mock: `src/services/mocks/roles.mock.ts`. Add `rolesService` to the `src/services/api.service.ts` barrel and add paths to `src/constants/apiPaths.ts`.

### Endpoints

| Method | Path | Auth | Request | Response (`data`) |
|---|---|---|---|---|
| GET | `/vendors/{vendorId}/role` | any active member | — | `RoleContextDto` |
| GET | `/vendors/{vendorId}/staff?page&limit` | owner | query | `StaffResponseDto[]` + `meta {page,limit,total,totalPages}` |
| GET | `/vendors/{vendorId}/staff/{staffId}` | owner | — | `StaffResponseDto` |
| POST | `/vendors/{vendorId}/staff/invite` | owner | `{ phone, name?, areaRouteLabel?, permissions?: PermissionKey[], assignedListIds?: string[], sendVia?: 'whatsapp'\|'sms' }` | `InviteStaffResponseDto { staff, inviteUrl, expiresAt }` |
| PATCH | `/vendors/{vendorId}/staff/{staffId}` | owner | `{ status?: 'ACTIVE'\|'DISABLED', areaRouteLabel?: string\|null, permissions?: PermissionKey[] }` (≥1 field) | `StaffResponseDto` |
| DELETE | `/vendors/{vendorId}/staff/{staffId}` | owner | — | `RemoveStaffResponseDto { staffId, status, removedAt }` |
| POST | `/auth/accept-invite` (public) | — | `{ token, password, name? }` | `LoginResponseDto { user, tokens, vendorContexts }` |
| GET | `/vendors/{vendorId}/supply-lists` (stub until US-005) | owner | — | `SupplyListOptionDto[]` |
| POST | `/vendors/{vendorId}/staff/{staffId}/lists` (stub) | owner | `{ listIds: string[] }` | `StaffResponseDto` (updated `assignedListIds`) |
| DELETE | `/vendors/{vendorId}/staff/{staffId}/lists/{listId}` (stub) | owner | — | `StaffResponseDto` (updated `assignedListIds`) |

> **OQ-6 dependency risk**: the three list-assignment rows above run against the backend's **list-assignment stub** and a stub `supply-lists` source. `US-005` (Supply Lists) owns the real supply-list service; when it ships, re-verify `SupplyListOptionDto`, the stub paths, and the assign/unassign request shapes. The invite body also accepts optional `assignedListIds: string[]`. These contracts are pinned here so the full assign UI can be built now (per resolved OQ-6); changes must be coordinated with the US-005 plan.

### Frozen DTO shapes (mirror in `src/types/roles.ts`)

```ts
type PermissionKey = 'mark_deliveries' | 'mark_leaves' | 'add_extra_charges'
type StaffRoleLabel = 'owner' | 'staff'
type StaffStatus = 'ACTIVE' | 'DISABLED' | 'INVITED' | 'REMOVED'  // VendorUserStatus

interface RoleContextDto { role: StaffRoleLabel; vendorId: string; staffId: string | null; permissions: PermissionKey[] }
interface TodayStatsDto { deliveriesMarked: number; leavesMarked: number }
interface StaffResponseDto {
  staffId: string; userId: string | null; name: string | null; phone: string | null
  role: StaffRoleLabel; status: StaffStatus; areaRouteLabel: string | null
  permissions: PermissionKey[]; assignedListCount: number; assignedListIds: string[]
  todayStats: TodayStatsDto | null
  invitedAt: string | null; joinedAt: string | null; createdAt: string; updatedAt: string
}
interface InviteStaffResponseDto { staff: StaffResponseDto; inviteUrl: string; expiresAt: string }
interface RemoveStaffResponseDto { staffId: string; status: StaffStatus; removedAt: string | null }
// OQ-6 — supply-list option for the assign multi-select (stub-backed until US-005; shape may change)
interface SupplyListOptionDto { listId: string; name: string }
```

> `accept-invite` reuses the **existing** `LoginResponseDto` (`src/types/auth.ts`) — so staff auto-login goes through `auth.store` exactly like login (tokens → SecureStore, set `vendorContexts[0]`).

### Error handling per endpoint (route through shared logger with `correlationId`, no PII)
Extend `mapApiError` (do not duplicate it) with the new codes; log every failure via `logError(err, { screen, action, endpoint })`:

| Backend code / status | i18n key | Where surfaced |
|---|---|---|
| `FORBIDDEN` (403) | `roles.error_forbidden` | session-revocation handler (see below) |
| `CONFLICT` (409) on invite | `roles.error_already_staff` | Invite form banner |
| `SUBSCRIPTION_LIMIT` (451) on invite | `roles.error_staff_limit` | Invite — upgrade prompt |
| `NOT_FOUND` (404) on staff/role | `roles.error_staff_not_found` / `roles.error_no_membership` | Detail/List/role fetch |
| `UNPROCESSABLE_ENTITY` (422) invite accept (expired) | `roles.error_invite_expired` | Join screen |
| `NOT_FOUND` (404) invite accept (invalid/used) | `roles.error_invite_invalid` | Join screen |
| network (no response) | `common.offline_message` | banner (already handled) |

### Session-revocation handling (Edge cases 1, 2, 6 from story)
Centralized in the shared `src/services/http.ts` axios response interceptor (OQ-3, resolved — Foundation owns it; the roles service uses `httpClient`, auth stays as-is for this story):
- **401/403 on any authenticated call** while role was previously owner/active → staff was disabled/removed or owner demoted → the interceptor calls `auth.store.logout()` (lazy import to avoid cycle) and routes to `/login` with an `AppAlert` "Your access has changed. Please sign in again."
- **Permissions changed** (no dedicated event in v1 sync) → **reactive detection (OQ-7, resolved)**: on screen focus, re-`fetchRole()`; if `permissions` changed, show non-blocking `AppAlert` "Your permissions were updated." and re-render gates. Socket.IO `staff.updated`/`staff.disabled` push is **deferred** to a later iteration once the backend emits those events; v1 relies on re-fetch-on-focus + 403-on-next-call only.

---

## Offline Behavior

Role/permission features are **read-cached, write-online**:

- **Reads (works offline)**: `fetchRole`, `fetchStaffList`, `fetchStaffDetail` serve last-cached values from the store (persisted `roleContext`; in-memory `staffList`/`staffDetail` cache with an offline banner). Role context is persisted so the **correct home screen renders instantly offline** on next launch — critical for delivery staff on 2G.
- **Writes (online-only, NOT queued)**: invite / update / remove / accept-invite are **security-sensitive mutations** (they change access and issue server tokens). Per the offline-first skill, these are explicitly **excluded** from the offline mutation queue — attempting them offline shows the offline banner and disables the submit button. Rationale: optimistically granting/revoking access locally would create a security/consistency hazard (a removed staff appearing active). This is a deliberate deviation from "queue all mutations" and is documented here so Review does not flag it.
- **Conflict resolution**: not applicable to queued writes (none). For permission drift while offline, last server `fetchRole` on reconnect wins (re-fetch on focus + on `isOnline` true transition).
- **Sync indicator UX**: reuse the existing offline banner pattern (`AppAlert type="warning"` + `useNetworkStatus`). Disabled submit buttons carry an `accessibilityHint` explaining "needs connection".

---

## Localization

New namespace `roles.*` in all 9 locale files (`en, hi, ta, te, mr, bn, kn, ml, gu`). Keys (English reference):

```
roles.owner_badge = "Owner"
roles.staff_badge = "Staff"
roles.staff_management = "Staff Management"
roles.active_staff = "Active Staff"
roles.disabled_staff = "Disabled ({{count}})"
roles.invite_staff = "Invite Staff"
roles.staff_phone = "Staff Phone Number"
roles.staff_name = "Staff Name"
roles.area_label = "Area / Route Label"
roles.area_label_placeholder = "e.g. Sector 15, Tower A-D"
roles.assign_lists = "Assign to Supply Lists"
roles.permissions = "Permissions"
roles.perm_mark_deliveries = "Mark deliveries"
roles.perm_mark_leaves = "Mark leaves"
roles.perm_add_extra_charges = "Add extra charges"
roles.send_via = "Send via"
roles.send_whatsapp = "WhatsApp"
roles.send_sms = "SMS"
roles.send_invite = "Send Invite"
roles.invite_created_title = "Invite Sent"
roles.invite_share = "Share Invite Link"
roles.invite_expires = "Link expires {{date}}"
roles.staff_detail_title = "Staff: {{name}}"
roles.assigned_lists = "Assigned Supply Lists"
roles.assign_another = "Assign to Another List"
roles.unassign = "Unassign"
roles.unassign_confirm_title = "Unassign list?"
roles.unassign_confirm_body = "{{name}} will no longer deliver this list."
roles.select_lists = "Select Supply Lists"
roles.no_supply_lists = "Create a supply list first"
roles.save_assignments = "Save"
roles.month_stats = "This Month"
roles.days_active = "Days Active"
roles.deliveries = "Deliveries"
roles.avg_per_day = "Avg/day"
roles.edit_label = "Edit Label"
roles.save_changes = "Save Changes"
roles.temporarily_disable = "Temporarily Disable"
roles.enable_staff = "Enable Staff"
roles.remove_staff = "Remove Staff"
roles.remove_confirm_title = "Remove staff?"
roles.remove_confirm_body = "{{name}} will lose all access and be unassigned from every list."
roles.status_active = "Active"
roles.status_disabled = "Disabled"
roles.status_invited = "Invited"
roles.no_staff = "No staff yet"
roles.no_staff_desc = "Invite your first delivery staff to get started."
roles.no_lists_assigned = "No lists assigned yet"
roles.contact_owner = "Contact your owner to change assignments."
roles.active_count = "Active: {{active}}"
# OQ-5: plan/staff-allowed line omitted in v1 (deferred to US-009). Keep no plan_label/staff_allowed keys.
roles.today_done = "{{done}}/{{total}} done"
roles.today_pending = "{{done}}/{{total}} pending"
roles.financial_owner_only = "Financial data visible to owner only"
roles.join_title = "Join {{vendor}}"
roles.join_subtitle = "You've been invited as delivery staff"
roles.join_as_staff = "Join as Staff"
roles.join_signed_in_title = "You're signed in as {{name}}"
roles.join_signed_in_body = "Sign out to join as staff with this invite."
roles.join_sign_out_continue = "Sign out & continue"
roles.access_changed = "Your access has changed. Please sign in again."
roles.permissions_updated = "Your permissions were updated."
roles.error_forbidden = "You don't have permission for this action."
roles.error_already_staff = "This phone number is already a staff member."
roles.error_staff_limit = "Staff limit reached. Contact support to upgrade."
roles.error_staff_not_found = "Staff member not found."
roles.error_no_membership = "You're not a member of this business."
roles.error_invite_expired = "This invite has expired. Ask your owner for a new one."
roles.error_invite_invalid = "This invite link is invalid or already used."
```
Plus `validation.password_min_8` (exists) reused on Join. RTL: none of the 9 languages are RTL — no RTL work needed.

---

## Performance Considerations
- **Lists**: Staff List uses `FlatList` (project rule) with memoized `StaffCard`, `keyExtractor`, `initialNumToRender={8}`, `removeClippedSubviews` on Android. Pagination only kicks in past 50 staff (rare). No FlashList (not in stack).
- **Images**: avatars are initials (no network images) — zero image cost.
- **Memory**: detail cache keyed by `staffId` is bounded (owner-managed staff count is small); `clearRoles()` frees it on logout. Staff Home holds only assigned lists.
- **Re-renders**: role hooks select with `useShallow`; `RoleGate` is cheap and memoizable. Gates must not cause parent re-render storms — select only the needed slice.
- **Bundle**: no new heavy deps. `expo-sharing`/`Linking` for invite share are tiny / already-present platform APIs. Code lives in a lazy route group (`/(app)/staff/*`) so it is only loaded for owners.

## Accessibility
- All actionable rows/cards ≥ 44×44; `accessibilityRole="button"`, `accessibilityLabel` on every tappable.
- Permission toggles: `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, label = permission name.
- Destructive "Remove Staff" announces via confirm dialog; button `accessibilityHint`.
- Disabled-while-offline buttons set `accessibilityState={{ disabled: true }}` + hint "needs connection".
- Status conveyed by text + badge, not color alone (color-blind safe). Trust-green/error contrast already meets AA in tokens.

---

## Resolved Decisions (was Open Questions)

> All open questions for US-002 have been resolved by the user (2026-06-08). Recorded here for the decision trail; consequences are folded into the relevant screens/tasks above.

**OQ-1 — Invite preview on the Join screen — RESOLVED (recommended option approved).**
Embed the **vendor name + supply-list labels as query params** in the shared invite URL; render them optimistically on the Join screen. Server-side validation of the token still happens on submit (`accept-invite`). See "Screen 1. Staff Join → Invite preview source".

**OQ-2 — Join while already logged in — RESOLVED (recommended option approved).**
**Require explicit sign-out first.** No silent logout. The Join screen shows a "You're signed in as <X> — sign out to join as staff?" prompt with a "Sign out & continue" action. See "Screen 1. Staff Join → Already-logged-in".

**OQ-3 — 401/403 session-revocation centralization — RESOLVED (recommended option approved).**
Shared **`src/services/http.ts` axios response interceptor in Foundation (WS-0)**; roles service uses `httpClient`; auth stays as-is for this story. See "API Integration → Session-revocation handling".

**OQ-4 — Invite deep-link scheme — RESOLVED (recommended option approved).**
**Expo Router custom-scheme deep link `paycyclevendor://join/<token>` for v1** (universal `https://` link deferred until a domain exists). Owner instructs staff to install the app first.

**OQ-5 — Plan banner / 451 flow — RESOLVED (recommended option approved).**
Show **only the real "Active: N"** on Staff List; **omit the plan/staff-allowed line**. On `451`, show a **generic** "staff limit reached — contact support to upgrade" message (no in-app upgrade screen). Real upgrade flow deferred to **US-009**. See "Screen 2. Staff List" and "Screen 3. Invite Staff → Error".

**OQ-6 — Supply-list assignment UI — RESOLVED (CHANGED from recommendation).**
**Build the FULL assign/unassign multi-select UI NOW** (not read-only) against the backend's **list-assignment stub**, on both Invite (inline) and Staff Detail (in a bottom sheet). New `SupplyListMultiSelect` component, `fetchSupplyListOptions`/`assignLists`/`unassignList` store actions, and the stub endpoints in API Integration.
- **Dependency risk (flagged for Review/QA)**: the supply-list data source and assign/unassign endpoints are **stubs until US-005** ships the real supply-list service. `SupplyListOptionDto`, the stub paths, and the assign/unassign request shapes are pinned in this plan and **must be re-verified when US-005 lands**; option labels/IDs may change shape and could require rework. Build the full UI now per the user's decision, accepting this risk.

**OQ-7 — Real-time propagation — RESOLVED (recommended option approved).**
v1 uses **reactive detection** (re-`fetchRole` on screen focus + handle 403 on the next API call). Socket.IO `staff.updated`/`staff.disabled` push is deferred to a later iteration once the backend emits those events. See "API Integration → Session-revocation handling".
