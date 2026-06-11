# Feature Tasks: US-004 Staff Management — Frontend

Delta on the shipped US-002 `src/modules/roles/` module. Ordered, dependency-aware.
Each task tags the skill(s) the Dev must follow. Build on the **current branch**
`fix/reset-password-otp-only`; commit ONLY US-004 files (leave unrelated WIP alone).
Do NOT push.

## Parallel Workstreams (conflict-free partition)

> Each workstream owns a disjoint set of files. Dev/Review/QA launch one sub-agent per
> workstream within a phase. Sub-agents edit ONLY their owned files and never commit —
> the orchestrator integrates.

### Phase 1 — Foundation (run first, single owner)

**WS-0: Foundation / shared**
- **Owned files**:
  - `src/types/roles.ts`
  - `src/constants/apiPaths.ts`
  - `src/services/mocks/roles.mock.ts`
  - `src/utils/errorMapper.ts`
  - `src/locales/en.json`, `hi.json`, `ta.json`, `te.json`, `mr.json`, `bn.json`, `kn.json`, `ml.json`, `gu.json`
  - `src/modules/roles/components/InviteShareSheet.tsx` (+ `components/__tests__/InviteShareSheet.test.tsx`)
- **Depends on**: —
- **Produces (contracts)** — frozen for Phase 2:
  - **Types**
    ```ts
    type InviteChannel = 'whatsapp' | 'sms'            // (alias of existing InviteSendVia)
    interface PermissionGrantDto { key: PermissionKey; granted: boolean }
    interface ResendInviteResponseDto { inviteUrl: string; expiresAt: string; sentVia: InviteChannel | null }
    interface StaffLimitsDto { maxStaff: number | null; currentActive: number; canAddMore: boolean }
    interface UpdatePermissionsResponseDto { permissions: PermissionGrantDto[] }
    interface UpdateStaffInput { name?: string; status?: 'ACTIVE'|'DISABLED'; areaRouteLabel?: string|null; permissions?: PermissionKey[] }  // + name
    ```
  - **apiPaths**
    ```ts
    Staff.ResendInvitation: (vendorId, staffId) => `/vendors/${vendorId}/staff/${staffId}/resend-invitation`
    Staff.Permissions:      (vendorId, staffId) => `/vendors/${vendorId}/staff/${staffId}/permissions`
    ```
  - **errorMapper**: `ApiErrorContext` adds `'resend'`; `resend` 422 → `'roles.error_resend_not_pending'` (404→`error_staff_not_found`, 403→`error_forbidden`).
  - **mocks**: `mockStaffLimits: StaffLimitsDto` exported (default unlimited; QA fixture variant `{maxStaff:4,currentActive:4,canAddMore:false}`).
  - **i18n keys** (all 9): `roles.staff_usage`, `roles.staff_limit_reached`, `roles.staff_limit_upgrade_hint`, `roles.staff_limit_hint`, `roles.edit_name`, `roles.save_name`, `roles.resend_invite_section`, `roles.resend_invite`, `roles.resend_invite_sent`, `roles.error_resend_not_pending`.
  - **`InviteShareSheet` prop API** (frozen):
    ```ts
    interface InviteShareSheetProps {
      visible: boolean; inviteUrl: string | null; expiresAt?: string | null;
      onDismiss: () => void; title?: string; testID?: string;
    }
    ```
- **Skills**: `component-development.md`, `localization-i18n.md`, `error-handling.md`, `accessibility-ux.md`, `ui-visual-design.md`, `api-integration.md`

### Phase 2 — Feature workstreams (run in parallel; depend only on WS-0 contracts)

**WS-1: Service + store wiring**
- **Owned files**:
  - `src/modules/roles/service/roles.service.ts` (+ `service/__tests__/roles.service.test.ts`)
  - `src/modules/roles/store/roles.store.ts` (+ `store/__tests__/roles.store.test.ts`)
- **Depends on**: WS-0 (types, apiPaths, mocks, errorMapper)
- **Consumes**: `ResendInviteResponseDto`, `UpdatePermissionsResponseDto`, `StaffLimitsDto`, `PermissionGrantDto`, updated `UpdateStaffInput`, `APIPath.Staff.ResendInvitation/Permissions`, `mockStaffLimits`, `mapApiError(_, 'resend')`.
- **Produces (contracts for WS-2/WS-3)**:
  ```ts
  // service
  rolesService.resendInvite(vendorId, staffId, sendVia?) => Promise<ResendInviteResponseDto>
  rolesService.updatePermissions(vendorId, staffId, grants: PermissionGrantDto[]) => Promise<UpdatePermissionsResponseDto>
  ListStaffResult = { staff: StaffResponseDto[]; meta: StaffListMeta; limits: StaffLimitsDto | null }
  rolesService.updateStaff(vendorId, staffId, { name }) // name now accepted
  // store
  staffLimits: StaffLimitsDto | null
  resendInvite(staffId, sendVia?) => Promise<ResendInviteResponseDto>
  updatePermissions(staffId, grants: PermissionGrantDto[]) => Promise<void>
  ```
- **Skills**: `api-integration.md`, `state-management.md`, `offline-first.md`, `error-handling.md`, `testing-strategy.md`

**WS-2: StaffListScreen (limits gating)**
- **Owned files**: `src/modules/roles/screens/StaffListScreen.tsx` (+ `screens/__tests__/StaffListScreen.test.tsx`)
- **Depends on**: WS-0 (i18n), WS-1 (`staffLimits` store contract)
- **Consumes**: `staffLimits`, `roles.staff_usage`, `roles.staff_limit_*`.
- **Skills**: `screen-development.md`, `accessibility-ux.md`, `ui-visual-design.md`, `localization-i18n.md`, `performance-optimization.md`, `testing-strategy.md`

**WS-3: StaffDetailScreen + InviteStaffScreen refactor**
- **Owned files**:
  - `src/modules/roles/screens/StaffDetailScreen.tsx` (+ `screens/__tests__/StaffDetailScreen.test.tsx`)
  - `src/modules/roles/screens/InviteStaffScreen.tsx` (+ `screens/__tests__/InviteStaffScreen.test.tsx`) — refactor to consume `InviteShareSheet`
- **Depends on**: WS-0 (`InviteShareSheet`, i18n, types), WS-1 (`resendInvite`, `updatePermissions`, `updateStaff({name})`)
- **Consumes**: `InviteShareSheet` props, store `resendInvite`/`updatePermissions`, `roles.edit_name`/`save_name`/`resend_invite*`, `PermissionGrantDto`.
- **Skills**: `screen-development.md`, `form-validation.md`, `animation-haptics.md`, `localization-i18n.md`, `accessibility-ux.md`, `ui-visual-design.md`, `error-handling.md`, `testing-strategy.md`

> **Owned-file overlap check**: WS-0 / WS-1 / WS-2 / WS-3 file sets are disjoint.
> `InviteStaffScreen.tsx` is touched ONLY by WS-3 (it consumes the WS-0 component).
> All shared files (types, apiPaths, mocks, errorMapper, locales, new component) live in WS-0.

---

## Task List (ordered by implementation sequence)

### Task 1: Types — extend `src/types/roles.ts`  _(WS-0)_
- **Skills**: `api-integration.md`
- **Do**: add `InviteChannel`, `PermissionGrantDto`, `ResendInviteResponseDto`,
  `StaffLimitsDto`, `UpdatePermissionsResponseDto`; add `name?: string` to `UpdateStaffInput`.
  Keep FROZEN alignment with `paycycle_api/src/modules/staff/staff.types.ts`.
- **Acceptance**: field names/nullability/unions exactly mirror backend DTOs; no `any`;
  TypeScript strict passes; file purpose comment updated to note US-004.

### Task 2: API paths — `src/constants/apiPaths.ts`  _(WS-0)_
- **Skills**: `api-integration.md`
- **Do**: add `Staff.ResendInvitation` and `Staff.Permissions` builders (exact strings in WS-0 contract). Leave the OQ-6 `Lists`/`ListDetail` builders untouched (US-005).
- **Acceptance**: builders return the documented paths; reused via `APIPath` (no hardcoded routes elsewhere).

### Task 3: Mocks + errorMapper  _(WS-0)_
- **Skills**: `api-integration.md`, `error-handling.md`
- **Do**: export `mockStaffLimits` (default unlimited + a `canAddMore:false` fixture for QA);
  add `'resend'` to `ApiErrorContext` with 422→`roles.error_resend_not_pending` (404/403 reuse).
- **Acceptance**: `mapApiError(<422>, 'resend')` returns the key; existing `invite`/`staff`
  mappings unchanged; mock fixtures typed against `StaffLimitsDto`.

### Task 4: i18n keys — all 9 locales  _(WS-0)_
- **Skills**: `localization-i18n.md`
- **Do**: add the 10 new `roles.*` keys to en/hi/ta/te/mr/bn/kn/ml/gu with real
  translations (not English fallback); preserve key order and ICU placeholders
  (`{{current}}`, `{{max}}`).
- **Acceptance**: all 9 files have all 10 keys; JSON valid; no missing-key warnings;
  placeholders identical across locales.

### Task 5: `InviteShareSheet` component + test  _(WS-0)_
- **Skills**: `component-development.md`, `accessibility-ux.md`, `ui-visual-design.md`
- **Do**: extract the invite share sheet (AppBottomSheet + WhatsApp/SMS/generic share
  buttons + optional `expiresAt` caption via `roles.invite_expires`) into the frozen
  prop API. Presentational only (no store). Tokens only.
- **Acceptance**: renders nothing when `inviteUrl` null / `visible` false; share buttons
  have testIDs + ≥44×44 targets; matches InviteStaffScreen's prior visual; unit test covers
  visible/dismiss/share-press.

### Task 6: Service layer — resend + permissions + limits  _(WS-1)_
- **Skills**: `api-integration.md`, `offline-first.md`
- **Do**: add `resendInvite` (mock: 422 when not INVITED) and `updatePermissions`
  (mock: MERGE grants, owner all-allow); thread `limits` into `ListStaffResult`
  (mock returns `mockStaffLimits`; real reads `data.meta.limits`). `updateStaff` already
  forwards `name` via the patch body — confirm it passes through.
- **Acceptance**: mock + real branches for both new calls; `listStaff` returns `limits`;
  paths come from `APIPath`; service tests cover happy path, 422 resend, owner no-op,
  limits passthrough.

### Task 7: Store — staffLimits + resendInvite + updatePermissions  _(WS-1)_
- **Skills**: `state-management.md`, `error-handling.md`
- **Do**: add `staffLimits` to state + `initialNonPersisted` (non-persisted; cleared by
  `clearRoles`); capture `limits` in `fetchStaffList`; add `resendInvite` (returns DTO,
  no list mutation) and `updatePermissions` (writes returned grants back to
  `staffDetail`+`staffList`). Every catch → `logError({screen,action,endpoint})` +
  `mapApiError`; no PII.
- **Acceptance**: `useShallow` selectors unaffected; `staffLimits` null-safe; writes
  online-only (no queue); store tests cover limits hydration, resend success/422,
  permissions merge-back, `clearRoles` wipes `staffLimits`.

### Task 8: StaffListScreen — usage line + Invite gating  _(WS-2)_
- **Skills**: `screen-development.md`, `accessibility-ux.md`, `ui-visual-design.md`, `localization-i18n.md`
- **Do**: read `staffLimits`; render usage line only when `maxStaff !== null`
  (`staff_usage`); when `canAddMore === false` disable FAB + hide empty CTA + show
  `staff_limit_reached`/`upgrade_hint` info alert + FAB `accessibilityHint`. `null`
  limits ⇒ treat as unlimited (FAB enabled). Disabled-if-offline logic preserved.
- **Acceptance**: 5 states intact; FAB disabled iff `!isConnected || !canAddMore`;
  limit messaging never colour-only; tests cover unlimited, under-cap, at-cap, offline.

### Task 9: StaffDetailScreen — name edit + permissions endpoint + resend  _(WS-3)_
- **Skills**: `screen-development.md`, `form-validation.md`, `animation-haptics.md`, `error-handling.md`, `localization-i18n.md`
- **Do**:
  (a) inline name `AppSection` (AppInput + `validateStaffName` + sanitize + Save →
  `updateStaff(staffId, { name })`), disabled when `mutationsDisabled`.
  (b) permissions Save → build full 3-key `PermissionGrantDto[]` from local `permissions`
  and call `updatePermissions(staffId, grants)`; seed toggles from returned state.
  (c) INVITED-only resend section: WhatsApp/SMS segmented control + "Resend Invite" →
  `resendInvite(staffId, sendVia)` → open `InviteShareSheet` with fresh url/expiry; 422 →
  banner + `fetchStaffDetail` re-fetch. Reuse the existing `mutate()` haptic wrapper.
- **Acceptance**: owner row renders none of the three; all disabled offline; resend hidden
  unless INVITED; permissions hit `/permissions` (not `/staff`); name persists; haptics on
  start/success/error; tests cover name save, permissions merge, resend success, resend 422.

### Task 10: InviteStaffScreen — consume `InviteShareSheet`  _(WS-3)_
- **Skills**: `screen-development.md`, `localization-i18n.md`
- **Do**: replace the inlined AppBottomSheet+share buttons with `<InviteShareSheet>`;
  behaviour and testIDs unchanged.
- **Acceptance**: invite flow visually + functionally identical; existing
  InviteStaffScreen tests still pass (share buttons reachable via same testIDs).

### Task 11: Tests — service/store/screens  _(WS-1 + WS-2 + WS-3)_
- **Skills**: `testing-strategy.md`
- **Do**: extend each owned `__tests__` for its workstream's new behaviour (enumerated in
  Tasks 6–10). Cover: limits hydration + gating, resend success/422, permissions MERGE +
  owner no-op, name edit, `InviteShareSheet` reuse.
- **Acceptance**: all new paths covered; jest (jest-expo@56 / jest@29) green; no `any` in tests.

### Task 12: Error & offline states verification  _(WS-2 + WS-3)_
- **Skills**: `error-handling.md`, `offline-first.md`
- **Do**: confirm all new actions disabled offline with `accessibilityHint`; 422 resend +
  404 detail + 451 invite gate behave per plan; all caught errors logged via `logError`
  (no PII), displayed via `t(mapApiError(...))`.
- **Acceptance**: every new write online-only; banners use i18n keys; logs contain
  staffId/correlationId only.

---

## Definition of Done (feature)
- All 4 US-004 capabilities wired; 5 states on both touched screens intact.
- All user-facing strings via `t()` in all 9 locales; tokens-only styling.
- Errors via `mapApiError`; runtime errors via shared logger (correlationId, no PII).
- Out-of-scope items remain stubbed (US-005 assign paths untouched; OQ-1 flagged, not fixed).
- Committed on `fix/reset-password-otp-only`, US-004 files only, conventional commits, no push.
