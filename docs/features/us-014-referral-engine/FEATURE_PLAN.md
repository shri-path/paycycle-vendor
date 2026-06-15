# Feature Plan — US-014 Referral Engine & Network Growth (Frontend)

> Repo: `paycycle_vendor` · Branch: `feat/us-014-referral-engine`
> Authoritative API contract: `paycycle_api/docs/features/us-014-referral-engine/API_SPEC.md` (FROZEN)
> Build strictly against the API_SPEC, **not** the user story's illustrative JSON.

---

## 1. Summary

Six **owner-only** screens that let a vendor owner refer other vendors, track referral
earnings + customer-driven growth, redeem credits (subscription / upgrade / cash
withdrawal), bulk-invite their customers to PayCycle via WhatsApp, and view nearby
vendors on the platform. Staff get **no referral surface** at all (see §11).

New module: `src/modules/referral/` (screens + components + service[mock+real] + store).
Routes mount under `app/(app)/referrals/*` (Expo Router stack). Entry point is a new
**More-menu section** ("Grow Your Business") visible to owners only.

This mirrors the US-012 (`credit`) module shape exactly: mock-first service with
`isMockMode` branching, a no-persistence Zustand store with sliced state, query actions
that swallow + set per-slice error **keys**, command actions that rethrow, `clearReferral()`
wired into `auth.store.logout()`, an `APIPath.Referral` / `APIPath.VendorCredit` path group,
`mapApiError(_, 'referral')` context, the in-house i18n layer (9 locale files), and
`useRequireOwner()` defence-in-depth on every screen.

### Provisional contract items (design defensively)
| Item | Contract behavior | Frontend handling |
|------|-------------------|-------------------|
| `nearby-vendors[].distance` | `null` in v1 (no PostGIS) | Never render a number; null-guard. Show "nearby" / hide the distance row when null. |
| Cash withdrawal | returns `status: "PENDING_PAYOUT"` (no live bank transfer) | Success copy = "Withdrawal requested — funds in 2–3 business days." No synchronous confirmation UI. |
| Customer ₹50 reward | modeled server-side as a **bill discount**, not a wallet | Customer-tracking screen says "₹50 bill credit" (not "wallet"); no balance UI for customers. |
| Credit permissions | namespaced `vendor_credit:*` | Permission gating uses `vendor_credit:read` / `vendor_credit:redeem` distinct from `referral:*`. |

---

## 2. Module Structure

```
src/modules/referral/
├── screens/
│   ├── ReferVendorScreen.tsx              (2.40)
│   ├── ReferralDashboardScreen.tsx        (2.41)
│   ├── CreditRedemptionScreen.tsx         (2.42)
│   ├── BulkInviteCustomersScreen.tsx      (2.43)
│   ├── CustomerReferralsScreen.tsx        (2.44)
│   ├── NearbyVendorsScreen.tsx            (2.45)
│   └── __tests__/referralScreens.test.tsx
├── components/
│   ├── BenefitsCard.tsx                   ₹500 / ₹1k / ₹5k / 10% revenue-share list
│   ├── ReferralCodeCard.tsx              code + Copy + Share buttons (null-guarded code)
│   ├── ReferralMessagePreview.tsx        editable message body
│   ├── ShareViaWhatsAppButton.tsx        wraps WhatsApp deep-link → Share fallback
│   ├── EarningsSummaryCard.tsx           credits / revenueShare / total / availableBalance
│   ├── VendorReferralCard.tsx            one referral row + milestone progress + Follow-Up
│   ├── MilestoneProgressBar.tsx          progress / target (null nextMilestone = "All done")
│   ├── CustomerGrowthCard.tsx            new-this-month / +revenue / top referrer
│   ├── RedemptionOptionCard.tsx          generic option card (subscription/upgrade/withdraw)
│   ├── WithdrawalThresholdNotice.tsx     "₹X more needed" when ineligible
│   ├── CustomerStatusSummary.tsx         total / on-paycycle / not-on-paycycle
│   ├── InviteTargetSelector.tsx          all_not_on_paycycle | specific
│   ├── InviteLanguageSelector.tsx        hi / en / customer-pref
│   ├── SmartInviteSettings.tsx           autoResend + maxAttempts
│   ├── TopReferrerRow.tsx                rank + name + count + Thank / Give Discount
│   ├── RecentAdditionRow.tsx             referred + referrer + joinedDate
│   ├── YourBusinessCard.tsx              name / customersOnPaycycle / rankInArea
│   ├── NearbyVendorCategorySection.tsx   category header + vendor rows (★ yourReferral)
│   └── __tests__/referralComponents.test.tsx
├── service/
│   ├── referral.service.ts               mock+real branching, envelope unwrap, id coercion
│   ├── referral.mock.ts                  realistic fixtures (faker-style hardcoded)
│   └── __tests__/referral.service.test.ts
└── store/
    ├── referral.store.ts                 sliced no-persist store; CQS discipline
    └── __tests__/referral.store.test.ts
```

Cross-cutting (touch existing files, additive only):
- `src/constants/apiPaths.ts` — add `Referral` + `VendorCredit` groups.
- `src/utils/errorMapper.ts` — add `'referral'` + `'vendor_credit'` contexts.
- `src/locales/*.json` (×9) — add `referral` namespace.
- `src/modules/auth/store/auth.store.ts` — add `clearReferral()` lazy-require in `logout()`.
- `src/modules/navigation/nav.config.ts` — add owner-only "Grow Your Business" section.
- `app/(app)/referrals/*` — Expo Router stack + 6 route files.

---

## 3. The 6 Screens (owner-only)

All screens: call `useRequireOwner()`, render their own `AppHeader` (so `headerShown:false`
on the stack), are wrapped by `ScreenErrorBoundary`, and disable **write** actions when offline.

### 3.1 ReferVendorScreen — `/(app)/referrals/refer-vendor` (2.40)
- `BenefitsCard` (static i18n copy).
- `ReferralCodeCard` — needs the vendor's `referralCode`. **The dashboard does NOT return it**
  (API_SPEC note). The code/link come only from `POST …/referrals/vendor` response.
  → On mount, the screen has **no code yet**; show the code card in a "generate" affordance,
  OR call the create endpoint when the owner submits. Decision: **OQ-1** (default below).
- Vendor details form: `vendorName` (optional, max 100), `phoneNumber` (required, 10–15 digits;
  reuse existing phone validation in `@utils/validation`).
- `ReferralMessagePreview` — editable; default template from i18n, interpolates `{code}` + link.
- `ShareViaWhatsAppButton` — primary action. On press → `createVendorReferral()` (command,
  rethrows) → on success, deep-link WhatsApp to the entered phone with the returned `message`.
- Errors: `SELF_REFERRAL_BLOCKED` (403) → "You can't refer your own number";
  `DUPLICATE_REFERRAL` (409) → "You already have an open referral to this number";
  `RATE_LIMITED` (429) → "Daily referral limit reached, try tomorrow";
  `VALIDATION_ERROR` (400) → inline phone error.

### 3.2 ReferralDashboardScreen — `/(app)/referrals/dashboard` (2.41)
- `EarningsSummaryCard` (`totalEarnings.{credits,revenueShare,total}`, `availableBalance`)
  + "Redeem Credits" button → `/(app)/referrals/redeem-credits`.
- `vendorReferrals[]` → `VendorReferralCard` each: name, referredDate, status badge
  (`PENDING|SIGNED_UP|QUALIFIED|REWARDED`), customerCount, earned breakdown
  (`signup/milestone10/milestone50/revenueShare/total`), `MilestoneProgressBar`
  (null `nextMilestone` → "All milestones achieved"). `PENDING` rows show "Follow Up" → re-share.
- `customerGrowthFromReferrals` → `CustomerGrowthCard`. `topReferrer` may be absent/zero → guard.
- "Refer More Vendors" → `/(app)/referrals/refer-vendor`.
- Pull-to-refresh re-fetches the dashboard.

### 3.3 CreditRedemptionScreen — `/(app)/referrals/redeem-credits` (2.42)
- Reads `GET …/credits` (`availableCredits`, `withdrawalEligible`, `withdrawalMinimum`).
- Reads subscription `nextDue` from the existing **subscription store** (lazy-require, the
  credit-store cross-module pattern) for the "Pay Subscription" card — **do not** re-implement
  subscription fetching. If subscription data is absent, hide the subscription card's amounts
  gracefully (it remains actionable; backend computes the real applied amount).
- Three `RedemptionOptionCard`s:
  - **Pay Subscription** → `redeem({type:'subscription', amount})` → on success route to `/(app)/subscription`.
  - **Upgrade Plan** → `redeem({type:'upgrade', amount})` → route to subscription upgrade.
  - **Cash Withdrawal** → disabled when `!withdrawalEligible`; show `WithdrawalThresholdNotice`
    ("₹{minimum − available} more needed"). When eligible: show 10% fee + "2–3 business days".
    `redeem({type:'withdraw', amount: availableCredits})` → success ⇒ `PENDING_PAYOUT` copy.
- Errors: `WITHDRAWAL_THRESHOLD` (400), `INSUFFICIENT_CREDITS` (409), `VALIDATION_ERROR` (400).
- On any successful redemption, the store updates `creditBalance` from `newBalance` and
  invalidates the referral dashboard (availableBalance changed).

### 3.4 BulkInviteCustomersScreen — `/(app)/referrals/invite-customers` (2.43)
- `CustomerStatusSummary` — total / already-on-PayCycle / not-on-PayCycle. **Source: OQ-2.**
  Default: derive counts client-side from the existing customers store (no new endpoint),
  using a `onPaycycle` flag if present, else show only the actionable target without counts.
- `InviteTargetSelector` (`all_not_on_paycycle` | `specific`). `specific` opens a customer
  multi-select (reuse customers-store list; collect `customerIds` as strings).
- `InviteLanguageSelector` (`hi` default / `en` / customer-pref → sends `messageLanguage`).
- `ReferralMessagePreview` (editable → `customMessage`).
- `SmartInviteSettings` (`autoResend` default true, `maxAttempts` 1–3 default 3).
- "Send to N customers" → `sendBulkInvite()` (command, rethrows). Result card:
  `totalSent / delivered / failed / skippedAlreadyOnPaycycle`.
- `totalSent: 0` is a **success**, not an error → show "No eligible customers to invite."

### 3.5 CustomerReferralsScreen — `/(app)/referrals/customer-tracking` (2.44)
- `summary` (newThisMonth / totalFromReferrals / percentageOfBase).
- `topReferrers[]` → `TopReferrerRow` with **Thank** + **Give Discount** actions.
  Neither action has a backing endpoint in this contract → **OQ-3** (default: "Thank" opens a
  WhatsApp message to the customer; "Give Discount" deep-links to the customer's
  credit-settings screen from US-012). No new API calls.
- `recentAdditions[]` (paginated via `?page&limit`) → `RecentAdditionRow`; infinite scroll
  appends (credit-store history pattern: keep `meta`, guard `onEndReached`).
- "View All Referrals" → loads next page (or no-op if `totalPages<=1`).

### 3.6 NearbyVendorsScreen — `/(app)/referrals/nearby-vendors` (2.45)
- `YourBusinessCard` (name / customersOnPaycycle / rankInArea).
- `byCategory` is a **dynamic-key object** → iterate `Object.entries`, render a
  `NearbyVendorCategorySection` per category with localized category label (fallback: raw key).
- Each vendor row: name + `customersOnPaycycle` + ★ when `yourReferral`. **`distance` is null in
  v1 → never render distance.** Header shows "(within 2 km)" from `radius` echo, not per-vendor.
- Empty area: `byCategory === {}` → empty state with "Refer a Vendor in Your Area" CTA.
- "Refer a Vendor in Your Area" → `/(app)/referrals/refer-vendor`.

---

## 4. Zustand Store Design — `referral.store.ts`

No persistence (financial/PII-adjacent data, like `credit.store`). `error` fields hold i18n
**keys**. All failures go through `logError(err, {screen, action, endpoint})` (correlationId,
no PII) + `mapApiError(err, 'referral' | 'vendor_credit')`. `vendorId` always from
`useAuthStore.getState().vendorContext?.vendorId` — never from route params/user input.

### Slices
```
dashboard:        ReferralDashboardDto | null            + isDashboardLoading + dashboardError
vendorReferrals:  VendorReferralListDto[] + meta         + isListLoading + listError + listStatusFilter
customerRefs:     CustomerReferralsDto | null            + recentAdditions paging meta + isCustomerRefsLoading + customerRefsError
nearby:           NearbyVendorsDto | null                + isNearbyLoading + nearbyError + nearbyRadius (default 2)
creditBalance:    CreditBalanceDto | null                + isBalanceLoading + balanceError
creditTxns:       CreditTransactionDto[] + meta          + isTxnsLoading + txnsError + txnTypeFilter   (ledger; optional surface)
leaderboard:      LeaderboardRowDto[] + meta             + isLeaderboardLoading + leaderboardError + leaderboardPeriod  (optional surface)
lastReferral:     CreateReferralResultDto | null         (holds code/link/message after create — feeds ReferralCodeCard)

isMutating:  boolean
mutationError: string | null
```

### Query actions (CQS: swallow, set per-slice error key)
`fetchDashboard()`, `fetchVendorReferrals(status?, page?)`, `fetchCustomerReferrals(page?)`,
`fetchNearbyVendors(radius?)`, `fetchCreditBalance()`, `fetchCreditTransactions(type?, page?)`,
`fetchLeaderboard(period?, page?)`.
- Paged actions (`vendorReferrals`, `customerReferrals.recentAdditions`, `creditTransactions`,
  `leaderboard`) append on `page > 1`, keep `meta`, replace on `page === 1` (credit-store pattern).

### Command actions (CQS: rethrow so screens can haptic + route)
- `createVendorReferral(dto): Promise<CreateReferralResultDto>` — sets `lastReferral` on success.
- `sendBulkInvite(dto): Promise<BulkInviteResultDto>`.
- `redeemCredits(dto): Promise<RedeemResultDto>` — on success sets `creditBalance.availableCredits
  = newBalance` and **invalidates** `dashboard` (lazy re-fetch) since availableBalance changed.

### Lifecycle
`clearErrors()`, `clearReferral()` (resets to `initialState`). `clearReferral()` is invoked from
`auth.store.logout()` via lazy-require (try/catch swallow if store not loaded) — identical to the
US-012 `clearCredit()` wiring.

---

## 5. Service Layer — `referral.service.ts` (+ `referral.mock.ts`)

Same shape as `credit.service.ts`:
- `if (isMockMode) { await simulateNetworkDelay(); return {...mockX} }` then real path via
  `httpClient` + `APIPath`.
- Unwrap standard envelope: single → `data.data`; list → `data.data` + `data.meta`.
- **Coerce all ids to strings** (`String(id)`) — backend serializes numeric ids as strings but
  defend anyway (referralId, vendorReferrals[].id, topReferrers[].customerId, txn ids, leaderboard vendorId).
- Null-guard arrays (`?? []`) and `distance` (leave null).

### Methods → endpoints (all under `/api/v1`, vendorId in path = routing only)
| Method | Endpoint | CQS |
|--------|----------|-----|
| `createVendorReferral(vendorId, dto)` | `POST …/referrals/vendor` | Command |
| `getDashboard(vendorId)` | `GET …/referrals/dashboard` | Query |
| `getVendorReferrals(vendorId, {status?,page,limit})` | `GET …/referrals/vendor` | Query |
| `getCustomerReferrals(vendorId, {page,limit})` | `GET …/customer-referrals` | Query |
| `sendBulkInvite(vendorId, dto)` | `POST …/customers/bulk-invite` | Command |
| `getCreditBalance(vendorId)` | `GET …/credits` | Query |
| `getCreditTransactions(vendorId, {type?,page,limit})` | `GET …/credits/transactions` | Query |
| `redeemCredits(vendorId, dto)` | `POST …/credits/redeem` | Command |
| `getNearbyVendors(vendorId, {radius})` | `GET …/nearby-vendors` | Query |
| `getLeaderboard(vendorId, {period,page,limit})` | `GET …/referrals/leaderboard` | Query |

### apiPaths additions
```
Referral: {
  CreateVendor: (v) => `/vendors/${v}/referrals/vendor`,   // POST
  VendorList:   (v) => `/vendors/${v}/referrals/vendor`,   // GET (same path, method-distinguished)
  Dashboard:    (v) => `/vendors/${v}/referrals/dashboard`,
  Leaderboard:  (v) => `/vendors/${v}/referrals/leaderboard`,
  CustomerReferrals: (v) => `/vendors/${v}/customer-referrals`,
  BulkInvite:   (v) => `/vendors/${v}/customers/bulk-invite`,
  NearbyVendors:(v) => `/vendors/${v}/nearby-vendors`,
}
VendorCredit: {
  Balance:      (v) => `/vendors/${v}/credits`,
  Transactions: (v) => `/vendors/${v}/credits/transactions`,
  Redeem:       (v) => `/vendors/${v}/credits/redeem`,
}
```

---

## 6. Types — `src/types/referral.ts`

Plain DTO interfaces mirroring the API_SPEC response shapes (all ids `string`, money `number`).
Key request/result DTOs:
- `CreateVendorReferralDto { vendorName?: string; phoneNumber: string }`
- `CreateReferralResultDto { referralId; referralCode; referralLink; message; status: 'PENDING'; createdAt }`
- `ReferralDashboardDto`, `VendorReferralListDto`, `CustomerReferralsDto`, `NearbyVendorsDto`
- `CreditBalanceDto { availableCredits; lifetimeEarned; lifetimeUsed; withdrawalEligible; withdrawalMinimum }`
- `CreditTransactionDto`, `LeaderboardRowDto`
- `BulkInviteDto`, `BulkInviteResultDto`
- `RedeemCreditsDto { redemptionType: 'subscription'|'upgrade'|'withdraw'; amount: number }`
- `RedeemResultDto { redemptionType; amountApplied; feeCharged; newBalance; status: 'APPLIED'|'PENDING_PAYOUT' }`
- Status string-literal unions exactly per contract:
  - referral status: `'PENDING'|'SIGNED_UP'|'QUALIFIED'|'REWARDED'`
  - `nextMilestone.type`: `'10_customers'|'50_customers'|null`
  - txn type: `'EARNED'|'USED'|'EXPIRED'|'ADJUSTMENT'`; rewardKind union incl. `null`.

---

## 7. WhatsApp Share + Clipboard + Deep-Link

Reuse the established `InviteShareSheet` deep-link approach (WhatsApp → SMS → generic `Share`
fallback). New small helpers (module-local components, no new global util needed):
- **`ShareViaWhatsAppButton`** — `whatsapp://send?phone={e164}&text={encodeURIComponent(message)}`
  with a `try/catch` → `Share.share({ message })` fallback (exactly the `handleShareVia` pattern).
  Fire `Haptics.impactAsync(Light)` on press.
- **Clipboard copy** in `ReferralCodeCard` — use `expo-clipboard` (`Clipboard.setStringAsync`).
  > **OQ-4**: confirm `expo-clipboard` is installed. Default: add it; otherwise fall back to
  > `Share.share` for the code. (Generic `Share` already works without new deps.)
- **Deep links the app emits** (not consumed here): `referralLink` from create response, and
  the bulk-invite join link `paycycle.app/join/{code}` rendered in the message preview. Inbound
  `?ref=CODE` capture on signup is a **separate auth/onboarding concern, out of scope** for US-014
  frontend (noted as OQ-5).

---

## 8. Navigation / Route Wiring (Expo Router)

```
app/(app)/referrals/
├── _layout.tsx            Stack, headerShown:false (screens render AppHeader)
├── refer-vendor.tsx       → ReferVendorScreen
├── dashboard.tsx          → ReferralDashboardScreen
├── redeem-credits.tsx     → CreditRedemptionScreen
├── invite-customers.tsx   → BulkInviteCustomersScreen
├── customer-tracking.tsx  → CustomerReferralsScreen
└── nearby-vendors.tsx     → NearbyVendorsScreen
```
Each route file is a thin re-export (the `collections/index.tsx` pattern). Owner guard lives
inside each screen via `useRequireOwner()` (defence-in-depth); the route group is the primary guard.

### More-menu entry (owner only)
Add to `getOwnerMoreSections()` in `nav.config.ts` a new section:
```
titleKey: 'nav.more.section.growth'
rows:
  - referralDashboard → navigate('/(app)/referrals/dashboard')   testID more-row-referral-dashboard
  - referVendor       → navigate('/(app)/referrals/refer-vendor') testID more-row-refer-vendor
  - inviteCustomers   → navigate('/(app)/referrals/invite-customers') testID more-row-invite-customers
  - nearbyVendors     → navigate('/(app)/referrals/nearby-vendors') testID more-row-nearby-vendors
```
`getStaffMoreSections()` is **NOT** modified → staff have zero referral entry points (§11).
Redeem-credits and customer-tracking are reached from within the dashboard (not top-level rows)
to keep the menu lean.

---

## 9. i18n Namespace Plan

New top-level `referral` namespace in all 9 locale files (`en, hi, bn, gu, kn, ml, mr, ta, te`)
— **real translations**, not English placeholders (matches the US-013 9-locale discipline).
Key groups:
```
referral.refer.*        title, benefits (signup/m10/m50/revenueShare), code_label, copy, share,
                        vendor_name, vendor_phone, message_default, share_whatsapp, success
referral.dashboard.*    title, total_earnings, credits, revenue_share, available_balance,
                        redeem_cta, status_pending/signed_up/qualified/rewarded, earned,
                        next_milestone, all_milestones_done, follow_up, customer_growth, refer_more
referral.redeem.*       title, available_credit, pay_subscription, upgrade_plan, cash_withdrawal,
                        min_notice, more_needed, fee_10, transfer_2_3_days, withdraw, withdraw_pending,
                        applied_success
referral.invite.*       title, status_summary, total/on_paycycle/not_on_paycycle, target_all,
                        target_specific, language, msg_preview, customize, auto_resend, max_attempts,
                        send_n, no_eligible, result_summary
referral.customer.*     title, new_this_month, total, pct_base, top_referrers, thank, give_discount,
                        recent_additions, referred_by, joined, bill_credit_note, view_all
referral.nearby.*       title, radius_caption, your_business, customers_on_paycycle, rank_in_area,
                        your_referral, empty_state, refer_in_area, category.<key> (milk/newspaper/bread/water/...)
referral.error.*        self_referral, duplicate, rate_limited, withdrawal_threshold,
                        insufficient_credits, generic
nav.more.section.growth + nav.more.row.{referralDashboard,referVendor,inviteCustomers,nearbyVendors}
```
Add `'referral'` and `'vendor_credit'` to the `mapApiError` context union; map:
`SELF_REFERRAL_BLOCKED→referral.error.self_referral`, `DUPLICATE_REFERRAL→referral.error.duplicate`,
`RATE_LIMITED→referral.error.rate_limited`, `WITHDRAWAL_THRESHOLD→referral.error.withdrawal_threshold`,
`INSUFFICIENT_CREDITS→referral.error.insufficient_credits`, `404→common.not_found`,
`403 (FORBIDDEN)→roles.error_forbidden`, network→`common.offline_message`.

---

## 10. Business Rules / Error Handling (frontend)

- **Self-referral**: client may pre-check entered phone against the owner's own phone (if known)
  to fail fast; server is authoritative (403).
- **Withdrawal min ₹2000 + 10% fee**: drive the disabled state from `withdrawalEligible`
  (server-computed) — never re-derive the threshold locally beyond the "more needed" copy.
- **`totalSent:0`** on bulk invite = success.
- **Multi-tenant**: 404 = wrong tenant; render generic "not found", never reveal existence.
- **Offline**: all command actions (`createVendorReferral`, `sendBulkInvite`, `redeemCredits`)
  are disabled offline (reuse the offline-disabled-writes pattern); queries may show cached/empty.
- **Null guards**: `nextMilestone`, `topReferrer`, `distance`, dynamic `byCategory` keys,
  empty `recentAdditions`.

---

## 11. Staff get NO referral surface — confirmed

- All 6 screens call `useRequireOwner()` → staff hitting a deep link are redirected to staff-home.
- `nav.config.ts`: only `getOwnerMoreSections()` gains the "Grow Your Business" section;
  `getStaffMoreSections()` is untouched.
- No tab, no staff-home card, no staff route references referral screens.
- Server enforces `referral:*` / `vendor_credit:*` as owner-only (404/403); the frontend never
  assumes staff can reach these endpoints.

---

## 12. Security & Performance

- `vendorId` always JWT-derived (`vendorContext`), never from params/input.
- No referral data persisted (financial + customer PII) → cleared on logout via `clearReferral()`.
- Error keys only in store; raw messages + correlationId only to `logError` (no PII).
- Pull-to-refresh + paginated appends; debounce nothing here (no live-typing queries).
- Reuse subscription/customers stores via lazy-require to avoid module cycles and duplicate fetches.

---

## 13. Open Questions (defaults applied; provisional, flagged in code)

**OQ-1 — Source of the owner's referral code on ReferVendorScreen.**
The dashboard does not return `referralCode`; only `POST …/referrals/vendor` does, and that
endpoint *creates* a referral (needs a phone, rate-limited 10/day). So there is no pure "read my
code" call.
- **Recommendation (default applied):** Treat the screen as *referral creation*. Show the code
  card in a placeholder/"your code appears after you send" state; populate `ReferralCodeCard` from
  `lastReferral` after the owner submits a phone and shares. Do **not** auto-call create on mount
  (would consume rate limit + require a phone).
- **Trade-off:** Owner can't copy a bare code before entering a recipient — slightly less flexible
  than the wireframe (which shows a standing code). Cleanest given the contract; avoids burning the
  10/day rate limit on idle screen visits. *Alternative:* ask backend to expose the code on the
  vendor profile / dashboard (one-line addition) — preferred long-term, raised to backend.

**OQ-2 — Customer status counts (total / on-PayCycle / not-on-PayCycle) on Bulk Invite.**
No dedicated endpoint returns these counts; `bulk-invite` only returns post-send tallies.
- **Recommendation (default applied):** Derive counts client-side from the existing customers
  store list, using an `onPaycycle`/`isAppUser` flag if the customer DTO carries one; if it does
  not, show the target selector without numeric counts and rely on the server's
  `skippedAlreadyOnPaycycle` in the result.
- **Trade-off:** Counts may be approximate/absent pre-send if the customer DTO lacks the flag.
  Avoids a new endpoint. *Alternative:* backend adds the flag to the customer list DTO (small,
  preferred) — raised to backend.

**OQ-3 — "Thank" and "Give Discount" actions on Customer Referral Tracking.**
No backing endpoints in the contract.
- **Recommendation (default applied):** "Thank" → open a WhatsApp message to that customer
  (deep-link, no API). "Give Discount" → navigate to that customer's US-012 credit-settings screen
  (existing surface), not a new referral endpoint.
- **Trade-off:** "Give Discount" reuses an existing flow rather than a one-tap referral-specific
  discount; acceptable for v1, no new contract. *Alternative:* dedicated "apply ₹X referral
  thank-you discount" endpoint — out of scope, raised to backend.

**OQ-4 — Clipboard dependency.**
`expo-clipboard` may or may not be installed.
- **Recommendation (default applied):** Use `expo-clipboard` for code copy; if unavailable,
  fall back to generic `Share.share`. WS-1 verifies presence and adds it if missing.
- **Trade-off:** Tiny dependency addition. Generic share already covers the share action without it.

**OQ-5 — Inbound referral-code capture on signup (`?ref=CODE` / `paycycle.app/join/{code}`).**
The story implies referred vendors/customers enter a code at signup.
- **Recommendation (default applied):** Treat inbound capture as **out of scope** for US-014
  vendor-app frontend (this app is for *existing* owners referring others). Capture belongs to the
  signup/onboarding flow (US-003) and the customer-facing app.
- **Trade-off:** US-014 frontend ships referral *creation/tracking* only; the redemption of a code
  at signup is tracked elsewhere. Keeps this story scoped to the 6 owner screens.

**OQ-6 — Credit ledger ("transactions") + leaderboard surfaces.**
The contract exposes `GET …/credits/transactions` and `…/referrals/leaderboard`, but the
wireframes (2.40–2.45) show no screen for either.
- **Recommendation (default applied):** Build the **service + store + types** for both (cheap,
  keeps the module complete and matches the frozen contract), but **do not** build dedicated
  screens in this PR. Surface the ledger as a future "Credit History" link from the redemption
  screen and the leaderboard as a future card on the dashboard.
- **Trade-off:** Slight unused-surface risk; minimal cost and avoids a follow-up contract round.
  *Alternative:* omit entirely until wireframed — but then the store would need a later edit.

**OQ-7 — Redemption amount semantics for subscription/upgrade.**
The contract requires `amount` for every redemption, but the UI for "Pay Subscription"/"Upgrade"
implies the system picks the amount (next due / monthly upgrade delta).
- **Recommendation (default applied):** For subscription, send `amount = nextDue` read from the
  subscription store; for upgrade, send the displayed monthly upgrade delta. If the subscription
  amount is unavailable client-side, **block the action** with a "couldn't load your bill, retry"
  message rather than guessing.
- **Trade-off:** Couples redemption to subscription-store availability. *Alternative:* backend
  accepts `amount: 'auto'` / computes the due amount server-side — preferred long-term, raised to
  backend.

---

## 14. Workstream Breakdown

See `FEATURE_TASKS.md`. Three conflict-free phases, file-ownership partitioned.
