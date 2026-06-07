# PayCycle Vendor App

## Project Overview

A production-grade Android + iOS mobile application using React Native (TypeScript).
The product is a **daily operating system for recurring local vendors** (milk, newspaper, bread), designed for **non-tech users from tier 2-3 Indian cities**.

The UX must feel familiar and intuitive, inspired by **WhatsApp**: clean layout, chat-style interactions, minimal typing, high readability.

---

## Related Projects

- **Backend API**: `D:\Shrihari\Sourcecode\personal\paycycle\paycycle_api` — Node.js + PostgreSQL backend. Agents should reference this for API contracts, data models, and endpoint definitions.

---

## Agent Workflow (MANDATORY)

All feature development follows a strict 4-agent pipeline. See `AGENTS.md` for full details.

**Workflow**: Architect -> Dev -> Review -> QA

**Before starting any step**, agents MUST read memory files at `.claude/memory/` (project-relative) for project context, workflow rules, and prior decisions. Start with `.claude/memory/MEMORY.md` for the index.

### User Interaction Protocol

- **Handoffs are automatic** — agents move through the pipeline (and fix loops) without pausing for user approval. Never ask "should I proceed / hand off / is this ready?".
- **Pause for the user ONLY for genuine open questions** — decisions that cannot be resolved from the docs, code, backend contracts, or sensible defaults.
- **When asking, always include a recommended solution and the trade-offs** of each option. No bare questions.
- The Architect must surface open questions to the user **even in auto/headless mode** — it never assumes answers.

---

## Product Documentation

All implementation must be based on these sources — do NOT invent flows:

- **Features**: `../project_documents/vendor_app/features/`
- **Wireframes**: `../project_documents/vendor_app/wireframes/`
- **User Stories**: `../project_documents/vendor_app/user_stories/`

### Progress Tracker

Track development progress at: `../project_documents/vendor_app/PROGRESS_TRACKER.md`

---

## Core Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo, TypeScript) |
| UI Library | Tamagui |
| Navigation | Expo Router + React Navigation |
| State | Zustand |
| Offline DB | WatermelonDB |
| Backend | Node.js + PostgreSQL |
| Realtime | Socket.IO |
| Auth | Mobile Number + Password |
| i18n | i18n-js (9 languages: en, hi, ta, te, mr, bn, kn, ml, gu) |

---

## Design System

### Colors (Trust Green Theme)

| Token | Value |
|---|---|
| Primary | #075E54 |
| Secondary | #128C7E |
| Accent | #25D366 |
| Background | #F0F2F5 |
| Surface | #FFFFFF |
| Text Primary | #111B21 |
| Text Secondary | #667781 |

---

## Project Structure

```
paycycle_vendor/
├── src/
│   ├── components/           # Reusable UI components (primitives, composite, layout)
│   ├── modules/              # Feature modules (screens, store, services per feature)
│   ├── store/                # Zustand stores
│   ├── services/             # API service layer + mocks
│   ├── hooks/                # Custom React hooks
│   ├── locales/              # Translation files (en, hi, ta, te, mr, bn, kn, ml, gu)
│   ├── types/                # TypeScript type definitions
│   ├── constants/            # Design tokens and constants
│   ├── utils/                # Utility functions
│   └── db/                   # WatermelonDB setup
├── app/                      # Expo Router entry point
├── assets/                   # Images, icons
└── .claude/agents/           # Agent definitions
```

---

## Architecture Rules

1. **Separation of Concerns**: UI in `components/`, logic in `modules/`, state in `store/`, API in `services/`
2. **DRY**: Reuse components and hooks — no duplicated UI or logic
3. **Modular Features**: Each feature in `modules/<feature>/` with its own screens, store, and service
4. **Service Layer**: Each service handles mock/real API modes via `config.ts`
5. **Offline-First**: All writes go to local DB first, sync in background
6. **No Business Logic in Components**: Components are presentational only

---

## Internationalization (MANDATORY)

- ALL user-facing text MUST use translation keys — no hardcoded strings
- Supported languages (v1): English, Hindi, Tamil, Telugu, Marathi, Bengali, Kannada, Malayalam, Gujarati
- Translations in `src/locales/{lang}.json` (en, hi, ta, te, mr, bn, kn, ml, gu)
- Usage: `const { t } = useTranslation(); t('key.name')`
- Support runtime language switching, fallback language, locale-aware dates/numbers

---

## UX Rules

- Tap-first UX (minimize typing)
- Numeric keypad for amounts
- Large touch targets (44x44 minimum)
- Clear confirmations for destructive actions
- Support low literacy users
- Every screen must handle: Loading, Empty, Error, Content, Offline states

---

## Code Quality

- TypeScript strict mode
- Strong typing for all APIs and models — no `any`
- No inline styles — use Tamagui tokens only
- Use FlatList for lists, memoize where needed
- Each file includes purpose comment

---

## Error Logging (MANDATORY)

All app runtime errors must be persisted to a daily log file for debugging:

- **Location**: a `Logs/` folder at the project root (sibling of `src/`). At runtime on device, write via `expo-file-system` under a `Logs/` directory in the document directory. The `Logs/` folder is **git-ignored** — never committed, never placed under `docs/`.
- **File per day**: `Logs/YYYY-MM-DD.txt` (today's date), append mode.
- **Each entry must include**: ISO timestamp, error message + stack/details, `correlationId` (from the API error response when available) or other identifying data (endpoint, request id, screen, user action) needed to debug.
- **Never log customer PII** (phone numbers, addresses, names) — consistent with the data-privacy rule. Log IDs and correlation data, not personal data.
- Route all error logging through a single shared logger utility (e.g. `src/utils/logger.ts`) — do not scatter `console.error` + file writes across the codebase.

---

## Commit Strategy (MANDATORY)

Follows conventional commit format, consistent with the `paycycle_api` backend repo.

**Format**: `type: short description`

**Types**:

| Type | Usage |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Maintenance, cleanup, config, tooling |
| `refactor` | Code restructure without behavior change |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

**Rules**:
1. Lowercase type, no capital after colon: `feat: add customer list screen`
2. Short first line — imperative mood, under 72 characters
3. Body (optional) — blank line after subject, explain *why* not *what*, wrap at 72 chars
4. Split logically — group related changes into separate commits by concern
5. Co-author line at end: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
6. Never bundle unrelated changes — a feature commit shouldn't include cleanup or config changes

---

## Git Workflow (MANDATORY)

These rules apply to Claude and all agents performing git operations:

1. **Branching**: Claude MAY create and check out new branches when needed (e.g. starting a feature). Branch off `main` unless told otherwise. Never commit feature work directly to `main`.
2. **No branch deletion**: NEVER delete a branch (`git branch -d/-D`, `git push --delete`) without the user's explicit instruction.
3. **Committing**: Claude SHOULD commit completed work following the Commit Strategy above (conventional format, split by concern).
4. **No pushing**: NEVER push to a remote (`git push`) without the user's explicit instruction. Commit locally and wait.
5. **No history rewrites**: Never force-push, hard-reset shared history, or amend pushed commits without explicit instruction.
