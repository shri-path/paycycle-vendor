---
name: Git Workflow
description: Branch/commit/push rules — Claude may branch & commit, must NOT delete branches or push without explicit instruction
metadata:
  type: feedback
---
Rules for any git operations by Claude or agents:

1. **Branching** — Claude MAY create and check out new branches when needed. Branch off `main` unless told otherwise. Never commit feature work directly to `main`.
2. **No branch deletion** — NEVER delete a branch (`git branch -d/-D`, `git push --delete`) without the user's explicit instruction.
3. **Committing** — Claude SHOULD commit completed work following the [[Commit Strategy]] (conventional format, split by concern, co-author line).
4. **No pushing** — NEVER `git push` without the user's explicit instruction. Commit locally and stop.
5. **No history rewrites** — Never force-push, hard-reset shared history, or amend pushed commits without explicit instruction.

**Why:** User wants control over what reaches the remote and over branch lifecycle. Branching and local commits are safe/reversible; pushing and deleting branches are not.

**How to apply:** Freely branch and commit as work progresses. Before any `git push` or branch deletion, stop and wait for the user to explicitly ask.
