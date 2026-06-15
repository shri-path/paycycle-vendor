# Feature Tasks — US-014 Referral Engine (Frontend)

Conflict-free, file-owned workstreams. Each **Phase** starts only after the prior phase
completes. Streams within a phase own non-overlapping files and run in parallel.

Complexity: **Moderate** (6 read-heavy screens, 3 commands, 10 endpoints, reused patterns).

---

## Phase 1 (parallel — foundation, no cross-stream file overlap)

### Stream A — Contracts & shared wiring
**Files owned:** `src/types/referral.ts`, `src/constants/apiPaths.ts`,
`src/utils/errorMapper.ts`
- **A1**: `src/types/referral.ts` — all DTOs + string-literal status unions per §6 of FEATURE_PLAN
  (ids string, money number, provisional `distance: number | null`).
- **A2**: `apiPaths.ts` — add `Referral` + `VendorCredit` path groups (§5 builders).
- **A3**: `errorMapper.ts` — add `'referral'` + `'vendor_credit'` contexts + code→key map (§9).

### Stream B — i18n
**Files owned:** `src/locales/*.json` (×9)
- **B1**: Add `referral` namespace (all key groups §9) + `nav.more.section.growth` +
  `nav.more.row.*` to **all 9 locales** with real translations.

### Stream C — Service + mock
**Files owned:** `src/modules/referral/service/*`
**Depends on:** A1 types (interface only — can stub-import while A1 lands; sequence A1→C if needed)
- **C1**: `referral.mock.ts` — realistic fixtures for all 10 responses (incl. null `distance`,
  `PENDING_PAYOUT`, empty `byCategory`, paginated lists).
- **C2**: `referral.service.ts` — mock+real branching, envelope unwrap, id coercion, null guards
  (§5 method table).
- **C3**: `service/__tests__/referral.service.test.ts` — envelope + coercion + mock-mode tests.

---

## Phase 2 (parallel — after Phase 1)

### Stream D — Store
**Files owned:** `src/modules/referral/store/*`, plus the `clearReferral()` edit in
`src/modules/auth/store/auth.store.ts`
**Depends on:** A1, C2
- **D1**: `referral.store.ts` — slices, query actions (swallow), command actions (rethrow),
  pagination append, `redeemCredits` balance+dashboard invalidation, `clearReferral()` (§4).
- **D2**: Wire `clearReferral()` lazy-require into `auth.store.logout()` (mirror `clearCredit`).
- **D3**: `store/__tests__/referral.store.test.ts` — CQS (query swallow / command rethrow),
  vendorId guard, append paging.

### Stream E — Presentational components
**Files owned:** `src/modules/referral/components/*`
**Depends on:** A1 types, B1 keys
- **E1**: Static/simple cards — `BenefitsCard`, `ReferralCodeCard` (Copy/Share, null code),
  `ReferralMessagePreview`, `ShareViaWhatsAppButton`, `EarningsSummaryCard`, `CustomerGrowthCard`.
- **E2**: Referral/milestone — `VendorReferralCard`, `MilestoneProgressBar` (null nextMilestone),
  `RedemptionOptionCard`, `WithdrawalThresholdNotice`.
- **E3**: Invite + tracking + nearby — `CustomerStatusSummary`, `InviteTargetSelector`,
  `InviteLanguageSelector`, `SmartInviteSettings`, `TopReferrerRow`, `RecentAdditionRow`,
  `YourBusinessCard`, `NearbyVendorCategorySection`.
- **E4**: `components/__tests__/referralComponents.test.tsx`.

---

## Phase 3 (parallel — after Phase 2)

### Stream F — Screens
**Files owned:** `src/modules/referral/screens/*`
**Depends on:** D1 store, E1–E3 components
- **F1**: `ReferVendorScreen` + `BulkInviteCustomersScreen` (command-heavy, WhatsApp share).
- **F2**: `ReferralDashboardScreen` + `CreditRedemptionScreen` (subscription-store lazy read,
  redemption routing).
- **F3**: `CustomerReferralsScreen` + `NearbyVendorsScreen` (paged tracking, dynamic categories).
- **F4**: `screens/__tests__/referralScreens.test.tsx`.

### Stream G — Routes + navigation
**Files owned:** `app/(app)/referrals/*`, `src/modules/navigation/nav.config.ts`
**Depends on:** F1–F3 screen exports
- **G1**: `app/(app)/referrals/_layout.tsx` + 6 thin route re-export files (§8).
- **G2**: `nav.config.ts` — add owner-only "Grow Your Business" section; **do not** touch
  `getStaffMoreSections()`. Update `nav.config.test.ts` expectations.

---

## Notes
- Streams A and B in Phase 1 are fully independent. C depends only on A1's type interface.
- Only `auth.store.ts` (D2) and `nav.config.ts` (G2) are pre-existing shared files; each is owned
  by exactly one stream → no merge conflicts.
- Every screen: `useRequireOwner()` + `ScreenErrorBoundary` + offline-disabled writes.
