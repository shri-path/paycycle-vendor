# Feature Tasks — US-013 Multi-Language & Voice Interface (Frontend)

> Implement in order. Each task lists exact files + the skill(s) to follow. Reuse existing base
> components (`src/components/`), the existing i18n layer (`src/locales`, `src/hooks/useTranslation`),
> and the existing `useDeliveryStore`. Mirror the US-012 `src/modules/credit` module shape.
> Module home: **`src/modules/voice`** (new).

Skill legend: TYPES, `api-integration`, `state-management`, `component-development`,
`ui-visual-design`, `screen-development`, `form-validation`, `navigation-routing`,
`localization-i18n`, `error-handling`, `accessibility-ux`, `animation-haptics`,
`performance-optimization`, `security-auth`, `offline-first`, `testing-strategy`.

---

## Step 0 — Dependencies & config
- **T-00** — Add `expo-audio` (OQ-3) and ensure `expo-file-system` is present
  (`package.json`). Add microphone permission config to `app.json`: Android `RECORD_AUDIO`,
  iOS `NSMicrophoneUsageDescription` (localized rationale string). *Skill: `api-integration`,
  `security-auth`.* **Output:** edited `package.json`, `app.json`. **AC:** app builds; mic
  permission prompt appears on first record. *If the pinned Expo SDK lacks `expo-audio`, use
  `expo-av` and note it.*

## Step 1 — Types & paths
- **T-01** — Create `src/types/voice.ts` with every DTO in FEATURE_PLAN §4 (mirror API_SPEC
  exactly: `LanguagePreferencesDto`, `UpdateLanguagePreferencesDto`, `MessageTemplateDto`,
  `SaveMessageTemplateDto`, `PreviewTemplateDto`, `VoiceInterpretationDto`,
  `VoiceTranscribeResultDto`, `ExecutableInterpretation`, discriminated `ExecuteCommandResultDto`,
  `VoiceCandidateDto`, and the enums). Reuse `SupportedLanguage` from `@locales/index` as the
  `LanguageCode` source. *Skill: TYPES. No `any`.* **Output:** `src/types/voice.ts`.
- **T-02** — Add `Users.LanguagePreferences`, `MessageTemplates.{List,Preview}`, and
  `Voice.{Transcribe,Execute}` builders to `src/constants/apiPaths.ts` (FEATURE_PLAN §4, no `/v1`
  prefix). **Output:** edited `apiPaths.ts`. **AC:** builders exported, typed.
- **T-03** — Create `src/modules/voice/service/templatePlaceholders.ts` (allowed-placeholder map
  per template type, FEATURE_PLAN §4) and `src/modules/voice/service/templateDefaults.ts`
  (one default template body per `templateType × language`, all 9 languages — real translations).
  *Skill: `localization-i18n`.* **Output:** both files.

## Step 2 — Services (each with `*.mock.ts`)
- **T-04** — `src/modules/voice/service/language.service.ts` (`languageService`):
  `getPreferences(userId)`, `updatePreferences(userId, patch)`. Branch on `isMockMode`;
  envelope `data.data`; userId in path only. Mock fixtures in `language.mock.ts`.
  *Skill: `api-integration`, `security-auth`.* **Output:** `language.service.ts`, `language.mock.ts`.
- **T-05** — `src/modules/voice/service/template.service.ts` (`templateService`):
  `list(vendorId, filter?)`, `save(vendorId, dto)` (PUT upsert; surface 201 vs 200),
  `preview(vendorId, dto)`. Mock fixtures in `template.mock.ts` (use `templateDefaults`).
  *Skill: `api-integration`.* **Output:** `template.service.ts`, `template.mock.ts`.
- **T-06** — `src/modules/voice/service/voice.service.ts` (`voiceService`):
  `transcribe(input)`, `executeCommand(input)`. JSON body with base64 `audioData`; coerce ids to
  string. Deterministic mock that returns a high-confidence `mark_delivered` and (variant) an
  ambiguous/unknown result for testing. *Skill: `api-integration`.*
  **Output:** `voice.service.ts`, `voice.mock.ts`.
- **T-07** — Export `languageService`, `templateService`, `voiceService` from
  `src/services/api.service.ts` barrel. **Output:** edited `api.service.ts`.

## Step 3 — i18n reactivity + stores
- **T-08** — Create `src/modules/voice/store/language.store.ts` (`useLanguageStore`,
  FEATURE_PLAN §3a): `appLanguage`, `version`, `preferences` slice, `setAppLanguage` (calls
  `locales.setLanguage` + bump `version` + persist), `fetchPreferences`, `updatePreferences`
  (rethrow), `clearLanguage`. **Persist only `appLanguage`** via Zustand `persist` + the SSR-safe
  AsyncStorage helper used by `auth.store`. `userId` from `auth.store.user.id`. *Skill:
  `state-management`, `security-auth`, `offline-first`, `error-handling`.* **Output:**
  `language.store.ts`.
- **T-09** — Rewrite `src/hooks/useTranslation.ts` to subscribe to
  `useLanguageStore((s) => s.version)` so `t()` consumers re-render on language switch (OQ-1).
  Keep the `{ t }` return shape (no call-site changes). *Skill: `state-management`,
  `localization-i18n`.* **Output:** edited `useTranslation.ts`. **AC:** switching language
  re-renders the whole tree immediately.
- **T-10** — Create `src/modules/voice/store/template.store.ts` (`useTemplateStore`,
  FEATURE_PLAN §3b): cache by `${type}:${lang}`, `fetchTemplates`, `saveTemplate` (rethrow),
  `previewTemplate`, `clearTemplates`; default-fallback via `templateDefaults`. `vendorId` from
  auth store. *Skill: `state-management`, `error-handling`.* **Output:** `template.store.ts`.
- **T-11** — Create `src/modules/voice/store/voice.store.ts` (`useVoiceStore`, FEATURE_PLAN §3c):
  `recordingState`, last transcription/interpretation/result/logId, `candidates`, `transcribe`,
  `executeCommand` (rethrow), `reset`, `clearVoice`. No audio capture here (that's the hook).
  *Skill: `state-management`, `error-handling`.* **Output:** `voice.store.ts`.
- **T-12** — Wire `clearLanguage()` (preferences only — keep UI language), `clearTemplates()`,
  `clearVoice()` into `auth.store.logout()` via lazy-require (mirror `clearDashboard`/`clearCredit`).
  *Skill: `state-management`, `security-auth`.* **Output:** edited `auth.store.ts`.

## Step 4 — Voice recorder hook
- **T-13** — Create `src/modules/voice/hooks/useVoiceRecorder.ts` wrapping `expo-audio`
  (record WAV/LINEAR16 16 kHz mono — OQ-4): `{ start, stop, cancel, isRecording, durationMs }`;
  `stop` returns base64 (read via `expo-file-system`); request mic permission on first `start`
  (denied → throw a mapped i18n-key error). Cap base64 at ~5 MB; discard audio after returning.
  *Skill: `api-integration`, `security-auth`, `error-handling`.* **Output:** `useVoiceRecorder.ts`
  + `__tests__/useVoiceRecorder.test.ts`.

## Step 5 — Components (parallelizable; each with a `__tests__` sibling)
- **T-14** — Language settings components: `LanguageRadioList`, `PreferenceToggleCard`,
  `BillLanguageRadioGroup` (FEATURE_PLAN §5). Reuse radio/switch primitives.
  *Skill: `component-development`, `ui-visual-design`, `accessibility-ux`.*
  **Output:** files under `src/modules/voice/components/`.
- **T-15** — Voice components: `MicButton` (idle/recording/processing + pulse, ≥64pt, a11y),
  `VoiceExampleList`, `LastCommandCard`, `VoiceResultCard`, `DisambiguationSheet`.
  *Skill: `component-development`, `animation-haptics`, `accessibility-ux`.*
  **Output:** `src/modules/voice/components/`.
- **T-16** — Template components: `TemplateTypeSelector`, `TemplateLanguageTabs`, `TemplateEditor`
  (live placeholder validation against `templatePlaceholders`), `PlaceholderChips`,
  `TemplatePreviewCard`. *Skill: `component-development`, `form-validation`, `ui-visual-design`.*
  **Output:** `src/modules/voice/components/`. Add a barrel `index.ts`.

## Step 6 — Screens (each: 5 states, ScreenErrorBoundary split, useShallow, all strings via t())
- **T-17** — `LanguageSettingsScreen` [S1] (wireframe 2.46). `fetchPreferences` on mount;
  app-language radio + voice/transliteration toggles + bill-default radio + Save. On Save: apply
  `setAppLanguage` optimistically + PATCH (OQ-2); enforce English→transliteration-off (rule 4) and
  secondary≠app (rule 3). **No owner guard** (self-scope). *Skill: `screen-development`,
  `form-validation`, `error-handling`, `security-auth`.*
  **Output:** `src/modules/voice/screens/LanguageSettingsScreen.tsx`.
- **T-18** — `MessageTemplatesScreen` [S2] (2.50). **`useRequireOwner()`.** Type selector + language
  tabs + editor + placeholder chips + Preview (POST) + Save (PUT). Default-fallback when no saved
  template; client placeholder validation before save; surface `INVALID_PLACEHOLDER` token.
  *Skill: `screen-development`, `form-validation`, `error-handling`.*
  **Output:** `MessageTemplatesScreen.tsx`.
- **T-19** — `VoiceCommandScreen` [S3] (2.47–2.49). Idle/recording/processing/result/disambiguation
  states; `useVoiceRecorder` → `voiceService.transcribe`; honor server `autoExecute`
  (true→execute now; false→confirm/disambiguate) per FEATURE_PLAN §3c/§6; `mark_all` confirm;
  STT/network/unknown fallbacks → "mark manually"; `[Undo]` → `useDeliveryStore.markDelivery(…,
  'PENDING')`; `[Next Customer]` → reset; refresh delivery list after execute. Reads `listId` from
  params. Shows CTA to S1 if `voiceCommandsEnabled` is false. *Skill: `screen-development`,
  `animation-haptics`, `error-handling`, `offline-first`.* **Output:** `VoiceCommandScreen.tsx`.

## Step 7 — Navigation
- **T-20** — Convert `app/(app)/deliveries/[listId].tsx` → `deliveries/[listId]/index.tsx`
  (same content), add `deliveries/[listId]/_layout.tsx` (thin Stack) and
  `deliveries/[listId]/voice.tsx` → `VoiceCommandScreen` (OQ-5). *Skill: `navigation-routing`.*
  **Output:** moved + new route files.
- **T-21** — Add route wrappers `app/(app)/settings/language.tsx` → `LanguageSettingsScreen` and
  `app/(app)/settings/message-templates.tsx` → `MessageTemplatesScreen` (thin). *Skill:
  `navigation-routing`.* **Output:** 2 route files.
- **T-22** — Wire nav entries in `src/modules/navigation/nav.config.ts`: set the existing
  `nav.more.row.languageSettings` row `onPress` → `/(app)/settings/language` for **both** owner and
  staff sections; add an **owner-only** "Message Templates" row →
  `/(app)/settings/message-templates`. *Skill: `navigation-routing`.* **Output:** edited
  `nav.config.ts` (+ any new `labelKey`s added to locales in T-24).
- **T-23** — Add a mic entry point on `DeliveryListScreen` (header action or FAB) →
  `/(app)/deliveries/{listId}/voice`, shown only when `preferences.voiceCommandsEnabled` (read via
  `useLanguageStore`). *Skill: `navigation-routing`, `screen-development`, `accessibility-ux`.*
  **Output:** edited `DeliveryListScreen.tsx`.

## Step 8 — Localization
- **T-24** — Add all `language.*`, `templates.*`, `voice.*` keys (FEATURE_PLAN §8) — including the
  new nav row labels, the per-language **example voice commands**, and all state/error/validation
  strings — to **all 9 locale files** with real translations. Reuse `common.*`/`action.*`/
  `validation.*`/`errors.*` where shared. *Skill: `localization-i18n`.*
  **Output:** 9 edited locale files. **AC:** no key missing from any file; no English copied as
  placeholder.

## Step 9 — Cross-cutting passes
- **T-25** — Error-handling + accessibility + haptics pass across S1–S3 + the recorder
  (correlationId logging, no audio/PII in logs, ≥44pt targets incl. ≥64pt mic, long-script overflow
  on Tamil/Malayalam/Bengali, haptics on record/execute/save/undo). *Skills: `error-handling`,
  `accessibility-ux`, `animation-haptics`.*
- **T-26** — Performance pass: memoize components, reuse the delivery FlatList for pending,
  native-driver mic animation, debounce template validation, reject oversized audio.
  *Skill: `performance-optimization`.*

## Step 10 — Tests
- **T-27** — Component tests for all Step-5 components (render, props, action callbacks, a11y,
  mic visual states, placeholder validation). *Skill: `testing-strategy`.* **Output:** `__tests__/`.
- **T-28** — Store tests: language store (setAppLanguage bumps version + persists, fetch/update,
  English-forces-transliteration reconciliation, clear), template store (cache key, default
  fallback, save rethrow), voice store (transcribe→autoExecute branch, execute rethrow, reset).
  *Skill: `testing-strategy`.* **Output:** `store/__tests__/*.test.ts`.
- **T-29** — Service + hook tests: mock-mode returns, id coercion, envelope parsing; recorder hook
  permission-denied + base64 cap. *Skill: `testing-strategy`.* **Output:** `service/__tests__/*`,
  `hooks/__tests__/useVoiceRecorder.test.ts`.
- **T-30** — i18n reactivity test: switching language re-renders a `t()`-consuming component
  (asserts the `useTranslation` version subscription works). *Skill: `testing-strategy`,
  `localization-i18n`.* **Output:** `src/hooks/__tests__/useTranslation.test.tsx`.
- **T-31** — Screen tests: 5 states per screen; S1 self-scope + English-transliteration rule;
  S2 owner-guard + placeholder-invalid + default fallback; S3 autoExecute happy path, low-confidence
  disambiguation, unknown/STT-failure fallback, mark_all confirm, undo. *Skill: `testing-strategy`.*
  **Output:** `screens/__tests__/*.test.tsx`.

## Step 11 — Progress
- **T-32** — Update `project_documents/vendor_app/PROGRESS_TRACKER.md` US-013 frontend notes
  (branch, status, screens shipped, deferred items: transliteration input OQ-6, TTS OQ-8,
  accent picker OQ-9) when frontend implementation completes.
