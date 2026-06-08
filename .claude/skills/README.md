# PayCycle Vendor — Skills (MANDATORY)

These skills are the **binding implementation contract** for the project. Every agent in the pipeline (Architect → Dev → Review → QA) MUST read and follow the relevant skill before acting.

- **Architect** references skills to ensure plans are implementable and tags each task in `FEATURE_TASKS.md` with the skill(s) the Dev must follow.
- **Dev** reads the referenced skill **before writing code for that layer** and follows its patterns and rules exactly.
- **Review** verifies the implementation against **every** applicable skill's "Definition of Done" checklist and raises a finding for **any** deviation (see Enforcement Contract below).
- **QA** validates the observable outcomes the skills require (5 states, haptics, a11y, i18n, offline).

A skill is not a suggestion. If a skill conflicts with `FEATURE_PLAN.md`, follow the plan and escalate to the Architect. If a skill conflicts with `CLAUDE.md`, `CLAUDE.md` wins.

---

## Skill Index

| # | Skill | Layer / Concern |
|---|---|---|
| 01 | [component-development.md](component-development.md) | Reusable UI components (primitives, layout, composite) |
| 02 | [screen-development.md](screen-development.md) | Screens + all 5 states |
| 03 | [state-management.md](state-management.md) | Zustand stores & selectors |
| 04 | [api-integration.md](api-integration.md) | Service layer (mock/real), DTOs |
| 05 | [offline-first.md](offline-first.md) | Local-first writes, mutation queue, sync |
| 06 | [navigation-routing.md](navigation-routing.md) | Expo Router screens, routes, deep links |
| 07 | [localization-i18n.md](localization-i18n.md) | Translations across all 9 languages |
| 08 | [error-handling.md](error-handling.md) | Error boundaries, error mapping, logging |
| 09 | [accessibility-ux.md](accessibility-ux.md) | Touch targets, screen reader, contrast |
| 10 | [animation-haptics.md](animation-haptics.md) | Motion + tactile feedback |
| 11 | [performance-optimization.md](performance-optimization.md) | Lists, memory, re-renders, bundle |
| 12 | [security-auth.md](security-auth.md) | Auth, secure storage, multi-tenancy |
| 13 | [real-time-sync.md](real-time-sync.md) | Socket.IO, live updates, background sync |
| 14 | [testing-strategy.md](testing-strategy.md) | Component, store, service, screen tests |
| 15 | [form-validation.md](form-validation.md) | Input validation rules + inline error UX |

---

## Dev Implementation Order (step by step)

For any new feature, the Dev implements in this sequence — each step has a dedicated skill:

1. **Types** — define DTOs/models in `src/types/` (typed, no `any`).
2. **Components** → `component-development.md` — build/reuse primitives & composites.
3. **State** → `state-management.md` — Zustand store slice for the feature.
4. **Service** → `api-integration.md` — mock + real API methods.
5. **Screen** → `screen-development.md` — assemble UI with all 5 states.
   - **Validation** → `form-validation.md` — for any form: validators in `src/utils/validation.ts` + inline `AppInput` error (red border + message below, clears live).
6. **Navigation** → `navigation-routing.md` — wire routes / deep links.
7. **Offline** → `offline-first.md` — local-first writes + queue.
8. **Localization** → `localization-i18n.md` — keys in all 9 locale files.
9. **Animation & Haptics** → `animation-haptics.md` — feedback on every interaction.
10. **Error handling** → `error-handling.md` — boundaries, mapping, logging.
11. **Accessibility** → `accessibility-ux.md` — labels, targets, contrast.
12. **Security** → `security-auth.md` — token/tenant rules (if applicable).
13. **Real-time** → `real-time-sync.md` — live updates (if applicable).
14. **Tests** → `testing-strategy.md` — cover the above.
15. **Performance pass** → `performance-optimization.md` — memoization, list tuning.

---

## Enforcement Contract (Review)

The Review agent MUST:

1. Determine which skills apply to the change (any touched layer = its skill applies).
2. Walk each applicable skill's **Definition of Done** checklist against the actual code.
3. Raise a finding for **every** deviation — no silent passes. Map severity:
   - **BLOCKER** — security/privacy violation (token in AsyncStorage, PII in logs, cross-tenant leak).
   - **CRITICAL** — missing screen state, missing error boundary, no offline handling, `any` types, broken i18n.
   - **MAJOR** — missing haptics, hardcoded strings/values, missing a11y props, untuned FlatList, no tests.
   - **MINOR** — naming, comment/purpose header, spacing token nits.
4. Record skill-by-skill compliance in `REVIEW_REPORT.md` and loop back to Dev until clean.

"Looks fine" is not a review. If a skill's checklist item cannot be verified, that is itself a finding.
