# Feature Bugs: US-005 Supply Lists Management — Frontend

> Populated by the QA agent during testing. Severity: Critical / High / Medium / Low.
> Status: Open / In Progress / Fixed / Verified / Won't Fix / Deferred.
> Reproduce on a low-end Android profile (2 GB RAM, Android 8+) where relevant, and note
> mock vs. real API mode (`EXPO_PUBLIC_API_MODE`).

| ID | Title | Severity | Device/OS | Steps to Reproduce | Expected | Actual | Status |
|----|-------|----------|-----------|--------------------|----------|--------|--------|
| —  | _(none yet)_ | — | — | — | — | — | — |

## Notes / Test Environment
- API mode: ____ (mock / real) · Base URL: ____
- Locales spot-checked: ____ of 9 (en, hi, ta, te, mr, bn, kn, ml, gu)
- Backend branch under test: `feat/us-005-supply-lists`
- Known stubs in play: `DeliveryStats` zeroed until US-006 (today/month cards show "no data yet");
  customers depend on US-008 (available-customers may be empty on a fresh vendor — see OQ-6).
