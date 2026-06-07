---
name: Skills Are A Binding Contract
description: 15 mandatory skill files exist at .claude/skills/ (+ README index); all agents follow them, review enforces each skill's Definition of Done checklist
metadata:
  type: project
---
The skill files referenced by the agents now exist at `.claude/skills/` (previously the directory was empty / references were broken):

`component-development`, `screen-development`, `state-management`, `api-integration`, `offline-first`, `navigation-routing`, `localization-i18n`, `error-handling`, `accessibility-ux`, `animation-haptics`, `performance-optimization`, `security-auth`, `real-time-sync`, `testing-strategy`, `form-validation` (15 total) — indexed in `.claude/skills/README.md`.

`form-validation.md` (added later): strict-yet-sensible rules — trim, always max-length, allowlist regex per field, injection/control-char guard as defense-in-depth (server is the real authority). Inline error UX reuses `AppInput`'s existing `error` prop (red border + message below); error must clear live as the field becomes valid (re-validate touched fields on every change). Validators stay pure in `src/utils/validation.ts` returning i18n keys (extends existing `validatePassword`/`validatePhone`).

Each skill has: When to use, Rules, a real-code Pattern (grounded in this repo — tokens from `@constants/tokens`, `isMockMode` services, `useShallow` Zustand selectors, `ScreenErrorBoundary`, SecureStore tokens, `mapApiError`, haptics), a **Definition of Done** checklist, and a **Common violations → findings** table.

- **Architect** tags each `FEATURE_TASKS.md` task with the skill(s) to follow.
- **Dev** follows the per-layer step order in `README.md` ("Dev Implementation Order"), reading each skill before that layer.
- **Review** (prime directive, Rule 0 in review.md): walk every applicable skill's Definition of Done against the code and raise a finding for every deviation; fill the Skill Compliance Summary.
- **QA** validates observable outcomes (5 states, haptics, a11y, i18n, offline).

Skill precedence: `CLAUDE.md` > `FEATURE_PLAN.md` > skills. See [[Error Logging Standard]] (referenced by error-handling.md) and [[Agent Workflow Pipeline]].
