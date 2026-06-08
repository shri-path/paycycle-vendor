---
name: Agent Interaction Protocol
description: Pipeline handoffs are automatic (no approval gate); pause for the user only for open questions, always with a recommended solution + trade-offs
metadata:
  type: feedback
---
How agents interact with the user during the [[Agent Workflow Pipeline]]:

1. **Handoffs are automatic — no approval gate.** Agents move Architect → Dev → Review → QA (and through fix loops) without pausing to ask the user for permission. Never ask "should I proceed / hand off / is this ready?".
2. **Pause for the user ONLY for genuine open questions** — decisions that cannot be resolved from product docs, code, backend API contracts, or sensible defaults.
3. **Every open question must include a recommended solution and the trade-offs** of each option. No bare, open-ended questions.
4. **The Architect must surface open questions even in auto/headless mode** — it does not get to silently assume answers just because no human is actively prompting. Resolved decisions are still recorded in `FEATURE_PLAN.md`'s Open Questions section.

**Why:** User wants the pipeline to run unattended end-to-end, interrupting them only when a real decision is needed — and when interrupted, wants enough context (recommendation + trade-offs) to decide in seconds.

**How to apply:** Run the pipeline through to completion. Only stop to ask when genuinely blocked on a requirement; format the ask as recommended-option-first with trade-offs. Documented in AGENTS.md, CLAUDE.md, and architect.md.
