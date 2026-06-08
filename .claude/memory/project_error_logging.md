---
name: Error Logging Standard
description: App runtime errors logged to daily file Logs/YYYY-MM-DD.txt via shared logger, with correlationId, no PII; Logs/ git-ignored
metadata:
  type: project
---
All app runtime errors must be persisted to a daily log file for debugging:

- **Location**: a `Logs/` folder at project root (sibling of `src/`), **git-ignored**, NOT under `docs/`. On device, write via `expo-file-system` under a `Logs/` dir in the document directory.
- **File per day**: `Logs/YYYY-MM-DD.txt` (today's date), append mode.
- **Each entry**: ISO timestamp, error message + stack/details, `correlationId` from the API error response when available (or other identifying data — endpoint, request id, screen, user action) needed to debug.
- **Never log customer PII** (phone, address, name) — log IDs and correlation data only. Consistent with the data-privacy rule.
- Route all logging through a single shared logger utility (e.g. `src/utils/logger.ts`) — no scattered `console.error` + ad-hoc file writes.

Documented in CLAUDE.md ("Error Logging"), enforced in review.md, planned by architect.md, implemented by dev.md. `Logs/` added to `.gitignore`.
