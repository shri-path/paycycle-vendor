# PayCycle Vendor — Agent Workflow

## Overview

Feature development follows a strict 4-agent pipeline. Each agent has a defined role and produces specific deliverables that feed into the next step.

**Pipeline**: Architect -> Dev -> Review -> QA

Each agent definition lives in `.claude/agents/` and can be invoked as a sub-agent.

---

## Pre-Step Requirement (ALL Agents)

**Before starting any work**, every agent MUST:

1. Read memory files at `C:\Users\Lenovo\.claude\projects\D--Shrihari-Sourcecode-personal-paycycle-paycycle-vendor\memory\MEMORY.md` for project context and prior decisions
2. Read relevant product documentation:
   - Features: `../project_documents/vendor_app/features/`
   - Wireframes: `../project_documents/vendor_app/wireframes/`
   - User Stories: `../project_documents/vendor_app/user_stories/`
3. Check progress tracker: `../project_documents/vendor_app/PROGRESS_TRACKER.md`
4. Reference backend API project at `D:\Shrihari\Sourcecode\personal\paycycle\paycycle_api` for API contracts and data models when needed

---

## User Interaction Protocol (ALL Agents)

1. **Handoffs are automatic — no approval gate.** Each agent hands off to the next (Architect → Dev → Review → QA, and the fix loops) without pausing to ask the user for permission to proceed. Do NOT ask "should I continue?", "is this ready?", or "may I hand off?".
2. **The only reason to pause for the user is a genuine open question** — a decision you cannot resolve from the product docs, the code, the backend API contracts, or sensible defaults.
3. **When you ask an open question, present a recommended solution and the trade-offs** of each option so the user can decide quickly. Never ask bare, open-ended questions.
4. This applies in auto/headless mode too: the Architect must still surface open questions to the user (it does not get to assume answers just because no human is prompting).

---

## Agent 1: Architect

**File**: `.claude/agents/architect.md`
**Role**: Senior Mobile Architect — plans features, designs screen flows, defines component architecture
**Does NOT**: Write implementation code

### Inputs
- Feature spec from `../project_documents/vendor_app/features/`
- Wireframes from `../project_documents/vendor_app/wireframes/`
- User stories from `../project_documents/vendor_app/user_stories/`
- Backend API contracts from `paycycle_api` project

### Deliverables
- `FEATURE_PLAN.md` — Screen designs, component tree, state management, API contracts, offline behavior
- `FEATURE_TASKS.md` — Ordered implementation tasks with acceptance criteria
- `FEATURE_BUGS.md` — Empty bug tracking document for QA to populate

### Key Responsibilities
- Design screen flows following WhatsApp/Google design patterns
- Define component hierarchy using existing base components
- Plan offline-first data flow
- Specify API integration points (referencing backend project)
- Break work into ordered tasks with clear acceptance criteria

---

## Agent 2: Dev

**File**: `.claude/agents/dev.md`
**Role**: Senior React Native Developer — implements features based on Architect's plan
**Does NOT**: Design or make architectural decisions

### Inputs
- `FEATURE_PLAN.md` from Architect
- `FEATURE_TASKS.md` from Architect
- `REVIEW_REPORT.md` findings (if in fix cycle)
- `FEATURE_BUGS.md` entries (if in fix cycle)

### Deliverables
- Implemented screens and components
- Feature-specific Zustand store
- Service layer with mock data
- Translation keys added to all 9 locale files (en, hi, ta, te, mr, bn, kn, ml, gu)
- Updated progress tracker

### Key Responsibilities
- Follow the plan exactly — do not deviate
- Reuse existing base components from `src/components/`
- Write type-safe, performant code for low-end devices
- Handle offline scenarios
- Add translation keys for all user-facing text in all 9 locale files

---

## Agent 3: Review

**File**: `.claude/agents/review.md`
**Role**: Senior Mobile Code Reviewer — quality gate between implementation and QA
**Does NOT**: Write implementation code

### Inputs
- Dev's implementation (code changes)
- `FEATURE_PLAN.md` for architectural compliance
- `FEATURE_TASKS.md` for completeness check

### Deliverables
- `REVIEW_REPORT.md` — Findings categorized by severity (Critical, Major, Minor, Suggestion)

### Key Responsibilities
- Verify code follows project patterns and architecture rules
- Check performance (re-renders, memory leaks, list optimization)
- Validate TypeScript strictness (no `any`, proper typing)
- Ensure all 5 screen states are handled
- Verify i18n compliance (no hardcoded strings)
- Check accessibility (touch targets, labels)
- If Critical/Major findings exist, loop back to Dev for fixes

---

## Agent 4: QA

**File**: `.claude/agents/qa.md`
**Role**: Senior Mobile QA Engineer — tests against the feature plan
**Does NOT**: Write implementation code

### Inputs
- Dev's implementation
- `FEATURE_PLAN.md` for expected behavior
- `REVIEW_REPORT.md` for known issues

### Deliverables
- `FEATURE_BUGS.md` — Bug reports with severity, steps to reproduce, expected vs actual
- Test results summary

### Key Responsibilities
- Test every screen, interaction, and business rule from the feature plan
- Test on low-end device scenarios (2GB RAM, slow network)
- Validate UX against WhatsApp/Google design standards
- Test edge cases: rapid taps, back button, app backgrounding, offline
- Test localization (all 9 supported languages, text overflow)
- If Critical bugs found, loop back to Dev for fixes

---

## Workflow Lifecycle

```
1. User requests a feature
2. Architect reads docs + memory → produces FEATURE_PLAN.md + FEATURE_TASKS.md
3. Dev reads plan + memory → implements feature
4. Review reads code + plan → produces REVIEW_REPORT.md
   └── If Critical/Major → Dev fixes → Review again
5. QA tests implementation → populates FEATURE_BUGS.md
   └── If Critical bugs → Dev fixes → QA retests
6. Feature complete → Update PROGRESS_TRACKER.md
```

---

## Backend Reference

The backend API project is at: `D:\Shrihari\Sourcecode\personal\paycycle\paycycle_api`

Agents should reference it for:
- API endpoint definitions and routes
- Request/response schemas
- Database models and relationships
- Authentication and authorization patterns
- WebSocket event contracts
