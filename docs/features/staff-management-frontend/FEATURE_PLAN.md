# Feature: US-004 Staff Management — Frontend (paycycle_vendor)

## Overview

US-004 is a **delta on top of the already-shipped US-002 staff module** at
`src/modules/roles/`. The US-004 backend (merged on `main` at
`paycycle_api/src/modules/staff/`) added four owner-facing capabilities that the
frontend must now wire up. **No new screens, no new module, no new routes** — this
is types + apiPaths + service + mocks + store + two existing screens + i18n + tests.

The four capabilities (verified against `staff.routes.ts` / `staff.controller.ts` /
`staff.types.ts`):

1. **Resend invitation** — `POST /vendors/:vendorId/staff/:staffId/resend-invitation`,
   body `{ sendVia?: 'whatsapp'|'sms' }` → `ResendInviteResponseDto { inviteUrl, expiresAt, sentVia }`.
   Valid only while `status === 'INVITED'` (else **422**). Surfaced on **StaffDetailScreen**
   for INVITED staff, reusing the invite share UX (WhatsApp / SMS / generic share).
2. **Dedicated permissions endpoint** — `PATCH /vendors/:vendorId/staff/:staffId/permissions`,
   body `{ permissions: { key, granted }[] }` (grant-MAP **MERGE** — absent keys unchanged;
   distinct from `PATCH /staff` which **REPLACES**). Returns full 3-key grant state
   `UpdatePermissionsResponseDto { permissions: {key,granted}[] }`. Owner target is an
   **idempotent no-op returning all-allow**. The permission toggles on **StaffDetailScreen**
   switch from the generic `updateStaff({permissions})` path to **this** endpoint.
3. **Editable name** — `PATCH /vendors/:vendorId/staff/:staffId` now accepts `name?: string`.
   Add `name` to `UpdateStaffInput` and an inline **name edit** on StaffDetailScreen.
4. **Limits block** — `GET /vendors/:vendorId/staff` now returns `meta.limits =
   StaffLimitsDto { maxStaff: number|null, currentActive, canAddMore }` (maxStaff null =
   unlimited stub until US-009). `listStaff` currently **drops** it. Surface plan usage on
   **StaffListScreen**; when `canAddMore === false`, **disable the Invite action** and show
   upgrade-style messaging. Invite over-cap also returns **451** — already handled by the
   existing `invite` error context; keep it.

## User Story Reference

- `project_documents/vendor_app/user_stories/US-004-staff-management.md`
- Builds directly on US-002 (`US-002-roles-access-control.md`). The US-002
  `FEATURE_PLAN`'s Open Questions (OQ-5 plan line, OQ-6 assign/unassign stub,
  OQ-7 focus re-fetch) carry forward and are partly resolved here (see Open Questions).

## Scope — files to change / add

### Change (existing)
| File | Change |
|---|---|
| `src/types/roles.ts` | Add `InviteChannel`, `ResendInviteResponseDto`, `StaffLimitsDto`, `PermissionGrantDto`, `UpdatePermissionsResponseDto`; add `name?: string` to `UpdateStaffInput`. |
| `src/constants/apiPaths.ts` | Add `Staff.ResendInvitation(vendorId, staffId)` and `Staff.Permissions(vendorId, staffId)` path builders. |
| `src/modules/roles/service/roles.service.ts` | Add `resendInvite`, `updatePermissions`; thread `limits` through `listStaff`'s `ListStaffResult`. |
| `src/modules/roles/store/roles.store.ts` | Add `staffLimits` state + `resendInvite` + `updatePermissions` actions; capture `limits` in `fetchStaffList`. |
| `src/modules/roles/screens/StaffListScreen.tsx` | Render limits usage line; gate Invite FAB + empty-state CTA on `canAddMore`; over-cap message. |
| `src/modules/roles/screens/StaffDetailScreen.tsx` | Inline name edit; switch permission save to `updatePermissions`; "Resend invite" action + share sheet for INVITED staff. |
| `src/services/mocks/roles.mock.ts` | Add `mockStaffLimits: StaffLimitsDto`; export. |
| `src/utils/errorMapper.ts` | Add `resend` context → 422 maps to `roles.error_resend_not_pending`. |
| `src/locales/*.json` (all 9) | New `roles.*` keys (see Localization). |
| Existing `__tests__` for service/store/both screens | Extend for the 4 capabilities. |

### Add (new)
- None outside the above. The resend share sheet **reuses** `AppBottomSheet` +
  the existing invite-share button pattern; **extract the share buttons into a small
  shared presentational component** `src/modules/roles/components/InviteShareSheet.tsx`
  so InviteStaffScreen and StaffDetailScreen don't duplicate it (DRY). New component
  + its test live in Foundation (WS-0) so both screen workstreams consume, never create, it.

## Screen Flow

No navigation changes. Both touched screens are already ≤2 taps from Home
(Home → Staff Management → Staff Detail). New actions are **in-place** on existing
screens — they add zero navigation depth:

- **Resend invite**: StaffDetailScreen (INVITED staff) → "Resend invite" button → share sheet (1 tap to open, 1 tap to share).
- **Edit name**: StaffDetailScreen inline field → "Save" (in-place).
- **Permissions**: StaffDetailScreen toggles → "Save Changes" (in-place, now hits `/permissions`).
- **Limits**: StaffListScreen header line + FAB state (no new screen).

## Screen Specifications

### StaffListScreen (modify)

- **Layout**: unchanged header + count row + FlatList + Invite FAB. Add a **limits
  line** in the existing `countRow` directly under "Active: N":
  - `maxStaff === null` → show nothing extra (unlimited stub; keeps OQ-5 behaviour).
  - `maxStaff !== null` → `t('roles.staff_usage', { current: currentActive, max: maxStaff })` (e.g. "Staff: 3 / 5").
- **Invite gating** (drives FAB **and** empty-state CTA):
  - `canAddMore === false` → FAB `disabled`, `accessibilityHint = t('roles.staff_limit_hint')`; render a non-blocking `AppAlert type="info"` with `t('roles.staff_limit_reached')` + `t('roles.staff_limit_upgrade_hint')` above the list. Empty-state CTA hidden.
  - Offline already disables the FAB (unchanged). Disabled wins if either is true.
- **States**:
  - **Loading**: existing skeleton (unchanged).
  - **Empty**: existing empty state; CTA shown only when `isConnected && canAddMore`.
  - **Error**: existing inline retry (unchanged).
  - **Content**: + limits line + over-cap alert when applicable.
  - **Offline**: existing offline banner; FAB disabled.
- **Haptics**: unchanged (Invite tap = Medium). No haptic when tapping a disabled FAB.
- **Source of `limits`**: store `staffLimits`, hydrated by `fetchStaffList`. If
  `staffLimits === null` (not yet loaded / mock pre-fetch) treat as **unlimited /
  canAddMore=true** so the FAB never wrongly locks before data arrives.

### StaffDetailScreen (modify)

Three additions, all in-place; owner-self rows still render none of these.

**(a) Inline name edit** — new `AppSection title={t('roles.staff_name')}` above the
area-label section, mirroring the existing area-label edit:
- `AppInput` seeded from `staff.name`, `maxLength={LIMITS.name}`, `validateStaffName`
  inline error, sanitize on change, "Save" button → `updateStaff(staffId, { name })`.
- Disabled when `mutationsDisabled` (offline or owner row).

**(b) Permissions save → `/permissions`** — the existing permissions section keeps
`PermissionToggleList`, but "Save Changes" now calls **`updatePermissions(staffId, grants)`**
(builds the full 3-key grant map from the local `permissions` array: every
`PermissionKey` → `{ key, granted: permissions.includes(key) }`). On success the store
replaces `staff.permissions` from the returned full grant state.
- Rationale: the dedicated endpoint is the US-004 contract for permission edits; sending
  the full 3-key map makes MERGE semantics deterministic (we always state all three).

**(c) Resend invite** — only when `staff.status === 'INVITED'`, render an
`AppSection title={t('roles.resend_invite_section')}`:
- A "Resend invite" `AppButton` (variant secondary) → `resendInvite(staffId, sendVia)`.
  `sendVia` from a small `AppSegmentedControl` (WhatsApp / SMS) defaulting to WhatsApp,
  same as Invite screen.
- On success, open the **shared `InviteShareSheet`** with the fresh `inviteUrl` +
  `expiresAt` (reusing the WhatsApp/SMS/generic share buttons). Dismiss returns to the
  same screen (no navigation).
- Disabled offline. **422** (`error_resend_not_pending`) → error banner (covers the
  race where status changed to ACTIVE between list load and tap; on banner, re-fetch detail).

- **States** (whole screen):
  - **Loading**: existing detail skeleton (unchanged).
  - **Empty**: n/a (single record); 404 → existing "no longer exists" empty state.
  - **Error**: existing `staffError` banner; resend 422 surfaces there.
  - **Content**: + name edit, + (INVITED only) resend section.
  - **Offline**: existing offline banner; all three new actions disabled.
- **Haptics**: reuse the existing `mutate()` wrapper (Medium impact on start, Success/
  Error notification on settle) for name save, permissions save, and resend.

## Component Requirements

### New (Foundation / WS-0)
- **`InviteShareSheet`** (`src/modules/roles/components/InviteShareSheet.tsx`) —
  presentational, no store access.
  ```ts
  interface InviteShareSheetProps {
    visible: boolean
    inviteUrl: string | null
    expiresAt?: string | null            // optional "Link expires {date}" caption
    onDismiss: () => void
    title?: string                       // defaults to t('roles.invite_created_title')
    testID?: string
  }
  ```
  Wraps `AppBottomSheet` + the three share buttons (`handleShare`, `handleShareVia`)
  currently inlined in InviteStaffScreen. **InviteStaffScreen is refactored to consume
  it** (behaviour identical) so the resend flow reuses one implementation.

### Modified
- None of the existing primitives/composites change. `StaffCard`,
  `PermissionToggleList`, `SupplyListMultiSelect` unchanged.

## State Management

`useRolesStore` additions:

```ts
// state
staffLimits: StaffLimitsDto | null         // hydrated by fetchStaffList; null ⇒ treat as unlimited

// actions
resendInvite: (staffId: string, sendVia?: InviteSendVia) => Promise<ResendInviteResponseDto>
updatePermissions: (staffId: string, grants: PermissionGrantDto[]) => Promise<void>
```

- `fetchStaffList` captures `limits` from the service result into `staffLimits`
  (reset to its prior value on error; cleared by `clearRoles()` like the rest).
- `staffLimits` is **non-persisted** (added to `initialNonPersisted`) — it's a usage
  snapshot, must not go stale across sessions, and contains no PII.
- `resendInvite`: sets `isStaffLoading`, calls service, returns the DTO to the screen
  (screen owns the share sheet). On error: `logError` + `mapApiError(err, 'resend')` →
  `staffError`, rethrow (screen fires error haptic). Does **not** mutate `staffList`.
- `updatePermissions`: calls service, then writes the returned full grant state back
  into `staffDetail[staffId].permissions` (and the matching `staffList` row) so the
  toggles reflect server truth. Same logging/error pattern as `updateStaff`.
- **Owner no-op**: backend returns all-allow for an owner target; the screen never
  renders permission toggles for an owner row, so this path is defensive only — the
  store still writes whatever the server returns.
- Writes remain **online-only / not offline-queued** (documented US-002 deviation
  carried forward; screens disable submit offline).

## API Integration

| Action | Method + Path (`APIPath`) | Request | Response | Errors handled |
|---|---|---|---|---|
| Resend invite | `POST` `Staff.ResendInvitation(v,s)` | `{ sendVia? }` | `ResendInviteResponseDto` | **422** → `roles.error_resend_not_pending`; 404 → `error_staff_not_found`; 403 → `error_forbidden`; offline → `common.offline_message` |
| Update permissions | `PATCH` `Staff.Permissions(v,s)` | `{ permissions: {key,granted}[] }` | `UpdatePermissionsResponseDto` | 404/403 via `staff` context; offline |
| Edit name | `PATCH` `Staff.Detail(v,s)` (existing) | `{ name }` | `StaffResponseDto` | 422 → `validation.required` (existing); 404/403 via `staff` |
| List + limits | `GET` `Staff.List(v)` (existing) | `?page&limit` | `data[]` + `meta.limits` | unchanged; over-cap invite 451 → `error_staff_limit` (existing `invite` ctx) |

- All calls go through `httpClient`; `vendorId` is in the URL **for routing only** —
  derived from the JWT server-side, never user input (multi-tenancy rule).
- **Error logging**: every catch routes through `logError(err, { screen, action,
  endpoint })` (the shared `@utils/logger`) — ISO timestamp, message/stack,
  `correlationId` from the API error, screen/action/endpoint context. **No PII**
  (no phone/name) in logs — staffId + correlationId only.
- `mapApiError` gains a `resend` context (422 → `roles.error_resend_not_pending`).
  `invite` (451/409) and `staff` (404/403) contexts already exist — reused as-is.

### Mock mode (`isMockMode`)
- `resendInvite`: if `findMockStaff(staffId).status !== 'INVITED'` → throw
  `'roles.error_resend_not_pending'` (exercises the 422 path); else return a fresh
  `{ inviteUrl: 'paycyclevendor://join/mock-token-<ts>?...', expiresAt: +7d, sentVia }`.
- `updatePermissions`: merge grants into the mock staff (`granted` true ⇒ add key,
  false ⇒ remove), return the full 3-key grant array; **owner target** ⇒ return all-allow
  unchanged.
- `listStaff` mock: return `limits: mockStaffLimits` (default `{ maxStaff: null,
  currentActive: <active count>, canAddMore: true }`) so unlimited-stub UI is the
  default; a fixture variant with `maxStaff: 4, canAddMore: false` lets QA exercise gating.

## Offline Behavior

- **Reads**: `staffList` + `staffLimits` come from the in-memory cache; the last
  fetched limits stay visible offline. `roleContext` stays persisted (US-002).
- **Writes** (resend, permissions, name): **online-only**, disabled offline — consistent
  with every other US-002 staff mutation. No queue, no optimistic write for these
  security-sensitive ops. Offline banner shown; buttons disabled with
  `accessibilityHint = t('common.needs_connection')`.
- **Conflict**: last-write-wins server-side; the 422 resend path is the one observable
  conflict (status changed underneath) — handled with a banner + detail re-fetch.
- **Sync indicator**: existing offline banner + per-action loading state; no new sync UI.

## Localization

New `roles.*` keys — **all 9 locales** (en, hi, ta, te, mr, bn, kn, ml, gu):

| Key | English |
|---|---|
| `roles.staff_usage` | `Staff: {{current}} / {{max}}` |
| `roles.staff_limit_reached` | `Staff limit reached` |
| `roles.staff_limit_upgrade_hint` | `You've reached your plan's staff limit. Contact support to add more.` |
| `roles.staff_limit_hint` | `Upgrade your plan to invite more staff.` |
| `roles.edit_name` | `Edit Name` |
| `roles.save_name` | `Save Name` |
| `roles.resend_invite_section` | `Pending Invite` |
| `roles.resend_invite` | `Resend Invite` |
| `roles.resend_invite_sent` | `Invite resent` |
| `roles.error_resend_not_pending` | `This invite can no longer be resent — the staff member has already joined.` |

- All strings via `t()`; design for ~+35% text expansion (usage line + alerts wrap,
  no fixed-width). Use `start`/`end` (not `left`/`right`) — existing screens already comply.
- Reuse existing keys where possible: `invite_share*`, `invite_expires`,
  `invite_created_title`, `send_whatsapp/sms`, `staff_name`, `common.*`.
- Locale-aware `expiresAt` date formatting reuses the existing `formatJoinedDate` approach.

## Performance Considerations

- No new lists; StaffListScreen FlatList config unchanged. Limits line + alert are
  O(1) renders behind memoized `canAddMore`.
- StaffDetailScreen is a `ScrollView` of small sections — name edit + resend section
  add a handful of nodes; negligible on 2GB devices.
- No new images, no bundle-heavy deps. `InviteShareSheet` extraction is net-neutral
  (moves existing code). Memory budget unchanged.

## Accessibility

- New buttons reuse `AppButton` (≥44×44). Disabled Invite/resend expose
  `accessibilityHint` explaining why (limit reached / needs connection).
- Limit state is **never colour-only** — paired with text ("Staff limit reached") +
  an icon in the `AppAlert`.
- Name `AppInput` uses the existing inline-error pattern (red border + message),
  contrast ≥ 4.5:1 via tokens.
- Resend share buttons carry `testID`s and clear labels for screen readers.

## Error Paths (explicit)

1. **422 resend (not pending)** → `roles.error_resend_not_pending` banner on
   StaffDetailScreen; on show, re-fetch detail so the resend section disappears if the
   member has joined. Error haptic.
2. **451 invite over cap** → existing `invite` context → `roles.error_staff_limit`
   alert on InviteStaffScreen (unchanged). Prevented up-front by the `canAddMore` FAB gate.
3. **Owner no-op permissions** → backend returns all-allow; store writes it back;
   UI never shows owner permission toggles (defensive only).
4. **Offline on any write** → button disabled; if somehow attempted, `mapApiError`
   no-response → `common.offline_message`.
5. **404 on detail/permissions/resend** → `roles.error_staff_not_found`.

## Out of Scope (deferred — keep stubbed)

- **US-005**: real assign-list / unassign-list writes + "one primary per list".
  Backend `assign-list` / `unassign-list/:listId` (single-id) is still 503-gated.
- **US-005/US-006**: staff-persona dashboard endpoints + activity/today view; month
  stats stay placeholders.
- **Real WhatsApp/SMS provider** — `sentVia` is logged server-side; client still uses
  device share/deep-link.
- **US-009**: real tier caps. `maxStaff` is the `null` unlimited stub; UI only reacts
  to whatever the backend sends.
- **Path-shape reconciliation (OQ-6)**: the existing frontend assign/unassign paths
  (`/lists`, `/lists/:listId`, body `{listIds}`) do **NOT** match the backend's
  `/assign-list` + `/unassign-list/:listId` (single-id) shape. **Flagged as OQ-6 /
  US-005 reconciliation — do NOT fix in US-004.** See Open Question 1.

## Open Questions

> Per the Agent Interaction Protocol, surfaced with a recommended option + trade-offs.
> Recorded here for the trail. The architect proceeds on the recommended options.

**OQ-1 (carried from OQ-6): assign/unassign path & body mismatch with backend.**
Frontend `assignLists` posts `{ listIds }` to `/staff/:id/lists`; backend US-005 will
expose `/staff/:id/assign-list` (single `supplyListId`, `isPrimary`) and
`/unassign-list/:listId`. These are incompatible.
- **Recommended: leave as-is for US-004; reconcile in US-005** (the real writes are
  503-gated, so nothing exercises the mismatch yet; assign/unassign run mock-only).
  Trade-off: a known-wrong real path lingers, but it's unreachable and re-verified when
  US-005 lands (already documented in `types/roles.ts` + service header).
- Alt A: fix the paths now to the single-id shape. Trade-off: churns US-002 code and
  tests for an endpoint that still 503s — risk of re-churn when US-005 finalizes the DTO.
- Alt B: delete the frontend assign UI until US-005. Trade-off: regresses shipped US-002
  behaviour and tests.

**OQ-2: permissions — send full 3-key map or only changed keys?**
The endpoint MERGEs (absent keys unchanged).
- **Recommended: always send all 3 keys** (`{key, granted}` for every `PermissionKey`).
  Trade-off: simplest and deterministic — the toggle UI already holds the full set, so
  MERGE and REPLACE converge; no "which changed?" diffing. Slightly larger payload (3 keys).
- Alt: send only toggled keys. Trade-off: smaller payload but needs change-tracking
  state and is harder to reason about/test for no real benefit at 3 keys.

**OQ-3: limits line when `maxStaff === null` (unlimited stub).**
- **Recommended: show nothing** (no usage line, FAB always enabled) until US-009 sends a
  real cap — matches the US-002 OQ-5 decision to omit the plan line. Trade-off: owners
  see no usage indicator yet, but avoids implying a cap that doesn't exist.
- Alt: show "Staff: N" with no max. Trade-off: mild value, but inconsistent with OQ-5 and
  risks confusion ("N of what?").

**No blocking questions.** All three have safe recommended defaults grounded in the
shipped US-002 decisions and the backend contract; proceeding on the recommendations.
