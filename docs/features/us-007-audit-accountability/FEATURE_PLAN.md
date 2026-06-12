# US-007 — Audit & Accountability (Frontend) · FEATURE_PLAN

> Repo: `paycycle_vendor` · Slug: `us-007-audit-accountability` · Branch: `feat/us-007-audit-accountability`
> Authoritative API contract: `paycycle_api/docs/features/us-007-audit-accountability/API_SPEC.md`
> Backend PR: https://github.com/shri-path/paycycle_api/pull/11

## 1. Scope

Read-only audit & accountability surfaces for the vendor app. The backend ships 5 endpoints
under `/api/v1/vendors/:vendorId/audit-logs`. This story delivers the frontend that consumes
them. There are **no write operations** — everything is a query except the CSV export (a POST
that returns a file). Nothing here mutates domain state.

### Surfaces (from wireframe 2.24 + API_SPEC)
- **Staff Activity Log (Owner)** — timeline of all staff/owner actions with filters
  (staff, action-type, date range), conflict highlighting, and **Export Activity Report** (CSV).
- **Conflicts (Owner)** — list of deliveries where an owner/customer override contradicts the
  staff mark (derived live by the backend).
- **Staff Summary (Owner)** — per-staff activity aggregation (counts, active days, first/last).
- **My Activity (Owner + Staff)** — the caller's own recent activity + today/week/month counts.

### Role model
- Owner: all four surfaces. Activity Log, Conflicts, Staff Summary, Export are owner-only on the
  server (403 for staff). My Activity is self-scoped for everyone.
- Staff: only **My Activity** (server forces self-scope; the generic activity-log endpoint also
  returns own-only rows for staff, but we route staff to My Activity for the cleaner UX).

## 2. Architecture (mirrors US-008 customers + US-006 delivery)

```
src/types/audit.ts                         # DTOs frozen against API_SPEC
src/constants/apiPaths.ts → APIPath.Audit  # 5 path builders
src/utils/errorMapper.ts  → 'audit' ctx    # status-code → i18n key
src/modules/audit/
  service/audit.mock.ts                    # deterministic mock fixtures
  service/audit.service.ts                 # mock + real (httpClient)
  store/audit.store.ts                     # Zustand; ALL slices in-memory (PII), partialize → filters only
  components/AuditLogRow.tsx               # one timeline entry (conflict variant)
  components/ConflictCard.tsx              # staff-vs-override card
  components/StaffSummaryCard.tsx          # per-staff aggregation card
  components/ActivitySummaryStat.tsx       # today/week/month stat tiles (My Activity)
  components/index.ts                      # barrel
  screens/StaffActivityLogScreen.tsx       # owner timeline + filters + export
  screens/ConflictsScreen.tsx              # owner conflicts list
  screens/StaffSummaryScreen.tsx           # owner per-staff summary
  screens/MyActivityScreen.tsx             # owner+staff self activity
src/utils/exportFile.ts                    # write CSV string to a file + share (expo-sharing)
app/(app)/activity/_layout.tsx             # Stack (headerShown:false)
app/(app)/activity/index.tsx               # → StaffActivityLogScreen (owner)
app/(app)/activity/conflicts.tsx           # → ConflictsScreen (owner)
app/(app)/activity/staff-summary.tsx       # → StaffSummaryScreen (owner)
app/(app)/activity/my-activity.tsx         # → MyActivityScreen (owner+staff)
src/locales/*.json  → audit.* namespace    # 10 locales
src/modules/auth/store/auth.store.ts       # logout → clearAudit() (orchestrator-wired)
app/(app)/home.tsx + StaffHomeScreen.tsx   # nav entry points
```

### Conventions reused verbatim
- `httpClient` (token from SecureStore, 401/403 session-revocation interceptor).
- `isMockMode` / `simulateNetworkDelay` mock switch.
- `mapApiError(err, 'audit', action?)` → i18n key; store holds keys, never raw messages.
- `logError(err, { screen, action, endpoint })` — correlationId, no PII.
- `useRequireOwner()` defence-in-depth on owner screens; `RoleGate require="owner"`.
- `ScreenErrorBoundary` wraps every screen; 5 states (loading/error/empty/empty-filtered/data).
- `useNetworkStatus()` offline banner; export disabled offline.
- `formatLocaleDate` + locale-aware time formatting for timestamps.
- All ids are **strings**. Timestamps are ISO8601. Money is not surfaced here.

## 3. Data contract reconciliation (R-table)

| # | API_SPEC fact | Frontend handling |
|---|---------------|-------------------|
| R1 | `GET /audit-logs` → `data: { auditLogs, pagination, filters }` (standard `{success,data}`) | service returns `data.data`; store splits into `logs/pagination/filters` |
| R2 | `customer`, `supplyList`, `entityType`, `entityId`, `ipAddress` may be `null` | all optional/nullable in DTOs; components null-guard every field |
| R3 | `ipAddress` present only for owner | DTO `ipAddress?: string \| null`; row shows it only when present |
| R4 | `user.role` is `'owner' \| 'staff'` | typed union; conflict variant keyed off `actionType` containing `overridden` OR role |
| R5 | `GET /conflicts` → `data: { conflicts: [...] }`, owner-only (403 staff) | owner route + useRequireOwner; 403 → forbidden key |
| R6 | conflict `overrideAction.by` is `'owner'` (customer overrides also possible per story) | DTO `by: string` (render label by value) |
| R7 | `GET /staff-summary` → `data: { summary: [...] }`, owner-only | owner route; `byActionType`/`byDate` arrays |
| R8 | `POST /export` returns a **CSV file** (not JSON `downloadUrl`) | request `responseType:'text'`; write to file + `expo-sharing` share sheet |
| R9 | export body: only `format:'csv'` accepted; optional `staffId/actionType/startDate/endDate` | send current filters; always `format:'csv'` |
| R10 | `GET /my-activity` → `data: { activity, summary }`, self-scoped | owner+staff route |
| R11 | dates are `YYYY-MM-DD`; `page` default 1, `limit` default 50 max 100 | client sends `limit:50` |
| R12 | error envelope `{ success:false, error:{ code, message, correlationId } }` | `mapApiError` reads `error.code`; `logError` extracts `correlationId` |

> The story doc's `GET /api/staff/my-activity`, `downloadUrl`/`expiresAt` export response, and
> materialized-view shapes are **superseded** by the shipped API_SPEC (OQ resolutions in backend
> FEATURE_PLAN). We implement strictly against API_SPEC.

## 4. CSV export approach (R8)

The backend returns raw CSV (`text/csv`) inline — no S3 signed URL. On the client:
1. `httpClient.post(APIPath.Audit.Export(vendorId), body, { responseType: 'text' })`.
2. Write the CSV string to `FileSystem` document dir as `audit-logs-<epoch>.csv`.
3. Open the OS share sheet via `expo-sharing` (`Sharing.shareAsync(uri)`).
4. Guard: disabled offline; web falls back to a no-op + info alert (sharing unsupported).
All file/sharing calls are lazily required and fully guarded (same pattern as `logger.ts`) so the
unit tests and web build never touch native modules.

## 5. State & persistence (PII policy)

All audit rows carry actor/customer **PII** (names) → **in-memory only**. `partialize` persists
ONLY non-PII filter state (`filterStaffId`, `filterActionType`, date range) for UX continuity —
identical to the customers/delivery stores. `clearAudit()` wipes everything; wired into
`auth.store.logout()` (flagged to orchestrator, same as `clearCustomers`).

## 6. Workstreams (conflict-free file ownership)

- **WS-0 Foundation** — `src/types/audit.ts`, `APIPath.Audit`, `errorMapper` `'audit'` ctx,
  `src/utils/exportFile.ts`, `audit.*` i18n across 10 locales, 4 components + barrel.
- **WS-1 Service + Store** — `audit.mock.ts`, `audit.service.ts`, `audit.store.ts` + tests.
- **WS-2 Owner screens** — StaffActivityLog, Conflicts, StaffSummary + tests.
- **WS-3 Self + routing + wiring** — MyActivity, `app/(app)/activity/*`, home/staff-home nav,
  `auth.store` `clearAudit()` wiring + tests.

(Implemented sequentially here since sub-agent fan-out is unavailable in this environment;
file ownership is still partitioned exactly as above to keep the diff reviewable.)

## 7. Acceptance criteria mapping

| AC (story) | Surface |
|---|---|
| Owner views staff activity log | StaffActivityLogScreen |
| Filter by staff, date range (list filter N/A on FE — backend has no supplyList filter param) | filters |
| Shows timestamp, staff name, action, customer name | AuditLogRow |
| Conflict indicators | AuditLogRow conflict variant + ConflictsScreen |
| Conflict shows time difference | ConflictCard `timeDiffMinutes` |
| Export activity log as CSV | export button → exportFile |
| Staff sees only own activity | MyActivityScreen (self-scoped) + server enforcement |
| Activity log loads quickly | FlatList virtualization, limit 50, memoized rows |

## 8. Open Questions

**OQ-1: Supply-list filter in the activity log.** Wireframe 2.24 shows an "All Lists" filter, but
the shipped `GET /audit-logs` API_SPEC exposes no `supplyListId` query param (only staff/customer/
actionType/entityType/date). 
**Recommended:** ship Staff + Date-range + Action-type filters only; omit the list filter (it is not
queryable server-side). 
**Trade-off:** minor wireframe divergence vs. shipping a filter the backend silently ignores. Listing
the real, server-backed filters avoids a misleading control.

**OQ-2: CSV delivery mechanism.** API_SPEC returns the CSV inline as `text/csv`; the story doc
described an S3 `downloadUrl` + 1-hour expiry. 
**Recommended:** consume the inline CSV and hand it to the OS share sheet via `expo-sharing`
(write-to-file + `shareAsync`). 
**Trade-off:** no hosted download link, but it matches the shipped backend exactly and is the
natural mobile UX (share to WhatsApp/Drive/email). Web falls back to an info alert.

**OQ-3: Staff entry to the activity surface.** Staff can technically call `GET /audit-logs`
(own-only) and `GET /my-activity`. 
**Recommended:** route staff exclusively to **My Activity** (cleaner, purpose-built) and gate the
owner Activity-Log/Conflicts/Summary routes with `useRequireOwner`. 
**Trade-off:** staff don't get the filterable timeline, but the self-scoped My Activity screen
covers their need and avoids exposing owner-shaped UI to staff.

**OQ-4: Auto-refresh interval.** The story's sample screen polled every 30s. 
**Recommended:** no background polling; pull-to-refresh + refetch-on-focus only (battery/2G
friendly for tier 2-3 cities, consistent with US-006/US-008). 
**Trade-off:** not strictly real-time, but audit review is not a live-ops surface; manual refresh
is sufficient and cheaper on the network.
