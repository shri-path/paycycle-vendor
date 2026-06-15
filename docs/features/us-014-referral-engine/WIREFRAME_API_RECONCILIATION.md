# Wireframe ↔ API_SPEC Reconciliation — US-014

Maps each wireframe screen (sections 2.40–2.45) to the **frozen** API_SPEC endpoints/fields.
Source of truth: `paycycle_api/docs/features/us-014-referral-engine/API_SPEC.md`.
Where the wireframe/story JSON differs from the contract, the **contract wins**.

Legend: ✅ direct field · 🔁 renamed/derived · ⚠️ provisional · ❌ no backing endpoint (see OQ).

---

## 2.40 Refer a Vendor → `POST …/referrals/vendor`
| Wireframe element | Contract field / source | Notes |
|---|---|---|
| Benefits (₹500/₹1k/₹5k/10%) | static i18n copy | not from API |
| "Your Referral Code" (KRISHNA2026) | 🔁 `data.referralCode` | only returned by **create** (not dashboard). See **OQ-1**. |
| Copy / Share buttons | 🔁 `referralCode` + `referralLink` | clipboard (OQ-4) + WhatsApp deep-link |
| Vendor Name (optional) | ✅ request `vendorName` (max 100) | |
| Vendor Phone * | ✅ request `phoneNumber` (10–15 digits) | |
| Message Preview | ✅ `data.message` (editable client-side) | interpolates code+link |
| SHARE VIA WHATSAPP | command → success → deep-link | errors: 403 self / 409 dup / 429 rate / 400 validation |

## 2.41 Referral Dashboard → `GET …/referrals/dashboard`
| Wireframe element | Contract field | Notes |
|---|---|---|
| Total Earnings ₹3,900 | ✅ `totalEarnings.total` | |
| Credits / Revenue Share | ✅ `totalEarnings.credits` / `.revenueShare` | |
| Available Balance | ✅ `availableBalance` | |
| Redeem Credits btn | → `/referrals/redeem-credits` | |
| Vendor referral name | ✅ `vendorReferrals[].referredVendorName` | |
| Referred: Jan 2026 | ✅ `vendorReferrals[].referredDate` | |
| Status: Active (35) | 🔁 `status` (`PENDING\|SIGNED_UP\|QUALIFIED\|REWARDED`) + `customerCount` | story's "active" → `QUALIFIED/REWARDED` |
| Earned breakdown | ✅ `earned.{signup,milestone10,milestone50,revenueShare,total}` | story used `milestone_10`; contract = `milestone10` |
| Next: 50 customers (+₹5000) | ✅ `nextMilestone.{type,reward,progress,target}` | `null` when all done |
| Pending Signup / Follow Up | 🔁 `status==='PENDING'` | "Follow Up" = client re-share, no endpoint |
| Customer Growth (new 25 / +₹12,500 / Top: Priya) | ✅ `customerGrowthFromReferrals.{totalFromReferrals,additionalMonthlyRevenue,topReferrer}` | guard missing `topReferrer` |

## 2.42 Credit Redemption → `GET …/credits` + `POST …/credits/redeem`
| Wireframe element | Contract field | Notes |
|---|---|---|
| Available Credit ₹1,500 | ✅ `availableCredits` | |
| Pay Subscription: Next Due ₹499 | 🔁 subscription store (`nextDue`) | not in this contract — read US-009 store. **OQ-7** for `amount`. |
| Apply to Subscription | command `{type:'subscription', amount}` → `status:'APPLIED'` | |
| Upgrade Plan ₹500/mo | command `{type:'upgrade', amount}` | amount = displayed delta (OQ-7) |
| Cash Withdrawal min ₹2,000 | ✅ `withdrawalMinimum` + `withdrawalEligible` | |
| "₹500 more needed" | 🔁 `withdrawalMinimum − availableCredits` | shown when `!withdrawalEligible` |
| Processing Fee 10% / 2–3 days | ⚠️ `feeCharged` (10%) + `status:'PENDING_PAYOUT'` | **provisional** — no live payout v1 |
| Withdraw (locked) | disabled when `!withdrawalEligible` | errors: 400 threshold / 409 insufficient |

## 2.43 Bulk Customer Invite → `POST …/customers/bulk-invite`
| Wireframe element | Contract field | Notes |
|---|---|---|
| Total / Already-on / Not-on counts | ❌ no endpoint | derive from customers store. **OQ-2** |
| All not on PayCycle (22) | ✅ `targetType:'all_not_on_paycycle'` | story said `all_not_on_deli`; contract = `all_not_on_paycycle` |
| Select specific | ✅ `targetType:'specific'` + `customerIds[]` | string ids |
| Message Language (Hindi/Eng/pref) | ✅ `messageLanguage` (default `hi`) | |
| Message Preview / Customize | ✅ `customMessage` (max 1000) | |
| Auto-resend after 7 days | ✅ `autoResend` (default true) | |
| Stop after 3 attempts | ✅ `maxAttempts` (1–3, default 3) | |
| SEND TO 22 CUSTOMERS | command → `{totalSent,delivered,failed,skippedAlreadyOnPaycycle}` | `totalSent:0` = success |

## 2.44 Customer Referral Tracking → `GET …/customer-referrals`
| Wireframe element | Contract field | Notes |
|---|---|---|
| New via referrals 8 / Total 25 / 50% | ✅ `summary.{newThisMonth,totalFromReferrals,percentageOfBase}` | |
| Top Referrers (Priya – 5) | ✅ `topReferrers[].{customerId,customerName,referralCount}` | |
| Thank / Give Discount | ❌ no endpoint | **OQ-3**: Thank→WhatsApp; Discount→US-012 credit-settings |
| Recent Additions (referred + referrer + joined) | ✅ `recentAdditions[].{referredCustomerName,referrerCustomerName,joinedDate}` | paginated `?page&limit` |
| Customer ₹50 reward | ⚠️ modeled as **bill discount** (not wallet) | copy = "₹50 bill credit"; no balance UI |
| View All Referrals | 🔁 next page via `meta` | |

## 2.45 Neighborhood Vendors → `GET …/nearby-vendors?radius=2`
| Wireframe element | Contract field | Notes |
|---|---|---|
| "(2 km radius)" header | ✅ `radius` (echoed) | |
| Your Business (name/50 customers/Rank #3) | ✅ `yourBusiness.{name,customersOnPaycycle,rankInArea}` | story used `customersOnDeli` → contract `customersOnPaycycle` |
| Category groups (🥛/📰/🍞/💧) | ✅ `byCategory` (dynamic keys) | iterate `Object.entries`; localize keys, fallback raw |
| Vendor name + N customers | ✅ `byCategory[k][].{name,customersOnPaycycle}` | |
| ⭐ Your Referral | ✅ `byCategory[k][].yourReferral` | |
| (per-vendor distance) | ⚠️ `distance: null` in v1 | **never render** until geo lands |
| Empty area | ✅ `byCategory:{}` + zero totals | empty state + refer CTA |
| Refer a Vendor in Your Area | → `/referrals/refer-vendor` | |

---

## Endpoints with no wireframe (built as service+store only — OQ-6)
| Endpoint | Reason | Plan |
|---|---|---|
| `GET …/credits/transactions` | no ledger wireframe | service+store+types now; screen later |
| `GET …/referrals/leaderboard` | no leaderboard wireframe | service+store+types now; card later |
| `GET …/referrals/vendor` (list) | dashboard shows referrals inline | backs the dashboard list / future "View all" |

## Field-name deltas (story JSON → frozen contract)
- `milestone_10/_50` → `milestone10/milestone50`
- `customersOnDeli` → `customersOnPaycycle`
- `all_not_on_deli` → `all_not_on_paycycle`
- status `active/pending/signed_up/churned` → `PENDING/SIGNED_UP/QUALIFIED/REWARDED`
- ₹50 customer reward: "credit/wallet" → **bill discount**
- credit permissions → `vendor_credit:*` (distinct from `referral:*`)
