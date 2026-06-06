---
name: Commit Strategy
description: Conventional commit format matching paycycle_api backend repo — must be strictly followed for all commits
metadata:
  type: feedback
---
Follow conventional commit format, matching the backend repo (paycycle_api) style.

**Format**: `type: short description`

**Types**:
- `feat` — New feature or capability
- `fix` — Bug fix
- `chore` — Maintenance, cleanup, config, tooling (no user-facing change)
- `refactor` — Code restructure without behavior change
- `docs` — Documentation only
- `test` — Adding or updating tests
- `perf` — Performance improvement
- `ci` — CI/CD changes

**Rules**:
1. **Lowercase type**, no capital after colon: `feat: add customer list screen`
2. **Short first line** — imperative mood, under 72 characters
3. **Body** (optional) — blank line after subject, explain *why* not *what*, wrap at 72 chars
4. **Split logically** — group related changes into separate commits by concern (e.g., cleanup, new feature, i18n separately)
5. **Co-author line** at end: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
6. **Never bundle unrelated changes** — a feature commit shouldn't include cleanup or config changes

**Why:** User wants consistent commit history across paycycle_api and paycycle_vendor repos. The backend already follows this pattern.

**How to apply:** Before every commit, classify changes by type, split into logical groups, and write messages in this format. Never skip the co-author line.
