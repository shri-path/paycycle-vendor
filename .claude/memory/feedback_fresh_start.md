---
name: Fresh Start - Keep Base Components
description: User wants to start fresh but retain common components, translations, and base infrastructure
metadata:
  type: feedback
---
When resetting the project, keep common/base components, translation keys, services, types, hooks, and store infrastructure. Only remove feature-specific screens and modules.

**Why:** Base components (AppButton, AppInput, etc.), translation setup, service layer, and type definitions represent foundational work that should be preserved across resets.

**How to apply:** When cleaning up or resetting, remove `src/screens/`, `src/modules/` content, and `src/App.tsx` navigation. Keep `src/components/`, `src/locales/`, `src/services/`, `src/types/`, `src/hooks/`, `src/store/`, `src/constants/`.
