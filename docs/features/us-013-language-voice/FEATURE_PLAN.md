# Feature Plan — US-013 Multi-Language & Voice Interface (Frontend)

> Repo: `paycycle_vendor` (React Native · Expo Router · Tamagui · Zustand)
> Branch: `feat/us-013-language-voice`
> Backend contract: `paycycle_api/docs/features/us-013-language-voice/API_SPEC.md` (7 endpoints)
> Backend plan: `paycycle_api/docs/features/us-013-language-voice/FEATURE_PLAN.md`
> Wireframes: `project_documents/vendor_app/wireframes/15-vernacular-voice.md` §2.46–2.50
> User story: `project_documents/vendor_app/user_stories/US-013-language-voice.md`

---

## 0. Context & Relationship to Existing Code

This story has **two halves**:

1. **i18n hardening (infrastructure already half-built).** The repo *already* ships a
   custom, dependency-free i18n layer:
   - `src/locales/{en,hi,ta,te,mr,bn,kn,ml,gu}.json` — all 9 locale files exist and are
     actively used across every shipped feature.
   - `src/locales/index.ts` — exposes `t(key, params)`, `setLanguage(lang)`,
     `getCurrentLanguage()`, `SUPPORTED_LANGUAGES`, and `SupportedLanguage`.
   - `src/hooks/useTranslation.ts` — returns `{ t }`.
   - `nav.config.ts` already has a **placeholder** "Language Settings" row
     (`labelKey: 'nav.more.row.languageSettings'`, `testID: 'more-row-language-settings'`,
     `onPress: undefined`).

   **The skill (`localization-i18n`) is a binding contract and the locale files exist**, so
   US-013 does **not** introduce `react-i18next`. It **completes** the existing layer. Two
   gaps must be closed (see §6, OQ-1):
   - **(a) Reactivity** — `setLanguage` mutates a module-level variable; `useTranslation`
     returns a static `t`. Changing language does **not** re-render the tree. AC
     *"Full UI translates to selected language" / "updates all visible text immediately"*
     fails today. We add a tiny language store + version counter so `useTranslation`
     subscribes and the app re-renders on switch.
   - **(b) Persistence** — `setLanguage` has a `// TODO: Persist` and reads device locale on
     boot. AC *"Language preference persists across sessions"* fails today. We persist via the
     new store (AsyncStorage, mirroring `auth.store`) and hydrate the server value on login.

2. **New `voice` feature module** (`src/modules/voice`) — language settings screen, message
   template editor, and the voice command interface, following the exact module shape used by
   `src/modules/credit` (US-012): `service/` (+ `*.mock.ts`), `store/`, `components/`,
   `screens/`, each with `__tests__/` siblings.

The voice screen **marks deliveries** — it reuses the existing `useDeliveryStore`
(`markDelivery`, `markBulk`, `fetchListDeliveries`, `listProgress`) rather than re-implementing
delivery state. The voice store owns only the *record → transcribe → interpret → execute* round
trip and its log; the actual delivery mutation and the on-screen pending list come from the
delivery module.

---

## 1. Scope — Screens (3) + the i18n switcher wiring

| # | Screen | Route | Role | Wireframe | Primary endpoint(s) |
|---|--------|-------|------|-----------|---------------------|
| S1 | `LanguageSettingsScreen` | `/(app)/settings/language` | owner + staff | 2.46 | `GET`/`PATCH …/users/{userId}/language-preferences` |
| S2 | `MessageTemplatesScreen` | `/(app)/settings/message-templates` | owner only | 2.50 | `GET`/`PUT …/vendors/{vendorId}/message-templates`, `POST …/message-templates/preview` |
| S3 | `VoiceCommandScreen` | `/(app)/deliveries/[listId]/voice` | staff + owner (list marking access) | 2.47–2.49 | `POST /voice/transcribe`, `POST /voice/execute-command` + delivery store |

**Notes**
- **S1 is available to staff too.** Per the API_SPEC, language preferences are *self-scoped*
  (`:userId` must equal the authenticated user) — not owner-gated. Semi-literate staff are the
  primary audience for language + voice. So S1 is reachable from **both** the owner More menu and
  the **staff** More menu. (US-012 screens were owner-only; this one is not.)
- **S2 is owner-only** (`useRequireOwner()`; backend 403 for staff).
- **S3 marking access**: any vendor user (owner or staff) with marking access on the target list.
  The list-access gate already exists in the delivery module (`useRole` / `canAccessList`); reuse
  it. Do not add a new RBAC concept.
- The voice screen is reached **from** the existing `DeliveryListScreen` via a mic
  entry-point/FAB, and is only shown when `voiceCommandsEnabled` is true in the user's
  preferences (see §6 rule 2).

### Wireframe → screen mapping
- **2.46 Language Settings** → S1: app-language radio (9 langs from `SUPPORTED_LANGUAGES`),
  voice-commands toggle, transliteration toggle, bill-language-default radio, Save.
- **2.47 Voice Command Interface** → S3 idle state: progress bar (from delivery store),
  big mic button, example commands (localized), "Last command" card, pending list (from delivery
  store), "Mark all as delivered" button.
- **2.48 Voice Recording Active** → S3 recording state: pulsing mic, partial/"Listening…" label,
  Cancel.
- **2.49 Voice Command Confirmed** → S3 result state: success check, command summary
  (transcription, action, customer, list, confidence), `[Undo]` / `[Next Customer]`.
  The same surface, when confidence is low/ambiguous, becomes the **confirmation /
  disambiguation** state (candidate chips).
- **2.50 Language Templates** → S2: template-type selector, language tabs, editor textarea,
  available-placeholders chips, "Other languages" quick-add, Preview, Save.

---

## 2. Navigation Plan

```
(app)
├── settings/
│   ├── _layout.tsx                       (exists)
│   ├── language.tsx                      → LanguageSettingsScreen   [S1]  (new wrapper)
│   └── message-templates.tsx             → MessageTemplatesScreen   [S2]  (new wrapper)
└── deliveries/
    └── [listId]/
        ├── _layout.tsx                   Stack (new; headerShown:false — screens own AppHeader)
        ├── index.tsx                     → DeliveryListScreen   (move of current [listId].tsx)
        └── voice.tsx                     → VoiceCommandScreen   [S3]  (new wrapper)
```

> **Routing decision (OQ-5):** the deliveries route is currently the *file*
> `app/(app)/deliveries/[listId].tsx`. To add a child voice route under the same dynamic
> segment, convert it to a folder `deliveries/[listId]/` with `index.tsx` (the existing
> `DeliveryListScreen` wrapper, unchanged content) + `voice.tsx` + a thin `_layout.tsx`.
> This is a pure file move; `DeliveryListScreen` reads `listId` from `useLocalSearchParams`
> already, so no screen code changes. Alternative (flat `deliveries/[listId]-voice.tsx`) is
> uglier and breaks the param. **Recommend the folder conversion.**

Navigation edges (all `router.push`; `router.back()` returns; ≤2 taps to every primary action):

- **More menu → Language Settings [S1]:** wire the existing placeholder row in
  `nav.config.ts` (`onPress: () => handlers.navigate('/(app)/settings/language')`) for **both**
  the owner sections (`getMoreSections('owner', …)`) and the **staff** sections
  (`getMoreSections('staff', …)` — add the row to the staff "account" section if not present).
- **More menu → Message Templates [S2]:** add a new owner-only row in the "billing" or
  "business" section → `/(app)/settings/message-templates`. (Wireframe routes it under settings;
  story route is `/settings/message-templates`.)
- **DeliveryListScreen → Voice [S3]:** add a mic action (header action or FAB) on
  `DeliveryListScreen`, visible only when `voiceCommandsEnabled` →
  `router.push('/(app)/deliveries/{listId}/voice')`.
- **S3 `[Next Customer]`** → stays on S3, resets to idle for the next command.
- **S3 `[Undo]`** → calls `useDeliveryStore.markDelivery(listId, deliveryId, 'PENDING')`
  (revert) then resets to idle. (No dedicated "undo voice" endpoint; undo is a normal delivery
  state change — see OQ-7.)
- **S3 `Cancel`** (recording) → discards the recording, returns to idle, no network call.
- **S3 disambiguation candidate tap** → calls `executeCommand` with the chosen `customerId`.

Route files are thin wrappers (`export default Screen`) per `navigation-routing.md`. The `(app)`
guard enforces auth; S2 owner-gates per-screen via `useRequireOwner()`; S1 and S3 do **not**
owner-gate (self/list-access only).

---

## 3. State / Data Layer

### 3a. Language store (new, small, persisted) — `src/modules/voice/store/language.store.ts`

This is the **reactivity + persistence fix** plus the holder for the user's saved preferences.

```
interface LanguageState {
  // Active UI language (drives t()); mirrors locales/index currentLanguage.
  appLanguage: SupportedLanguage
  // Bump on every setAppLanguage so useTranslation re-renders subscribers.
  version: number

  // Full saved preferences from the server (null until fetched).
  preferences: LanguagePreferencesDto | null
  isPreferencesLoading: boolean
  preferencesError: string | null
  isMutating: boolean
  mutationError: string | null

  // Actions
  setAppLanguage(lang: SupportedLanguage): Promise<void>   // calls locales.setLanguage + bump version + persist
  hydrateFromDevice(): void                                // boot: keep current device-derived default
  fetchPreferences(): Promise<void>                        // GET; on success also applies appLanguage
  updatePreferences(patch: UpdateLanguagePreferencesDto): Promise<LanguagePreferencesDto>  // PATCH; rethrow
  clearLanguage(): void                                    // logout: reset preferences (NOT appLanguage — keep UI lang)
}
```

- **Persisted** (Zustand `persist`, AsyncStorage, same SSR-safe storage helper as `auth.store`):
  only `appLanguage`. `preferences` is *not* persisted (server is source of truth; refetched on
  login/focus). This fixes persistence-across-sessions.
- **Reactivity:** `useTranslation` is rewritten to subscribe to `version`
  (`useLanguageStore((s) => s.version)`) so any component using `t()` re-renders when language
  changes. `t` itself stays pointing at `locales/index.t`. (See OQ-1 for the exact mechanism and
  its trade-off.)
- **`userId` for the endpoints** comes from `useAuthStore.getState().user?.id` (JWT subject);
  the path `:userId` must equal it (self-scope). Never read userId from params/UI.
- **`setAppLanguage`** is the single writer that calls `locales.setLanguage(lang)`,
  increments `version`, and persists. The settings screen calls it on Save *and* immediately on
  selection-change for live preview is **not** required by the wireframe — apply on Save (and
  rollback the radio if the PATCH fails). (See OQ-2.)
- **Server sync:** `updatePreferences` also denormalizes server-side
  (`users.preferred_language`) per the backend plan, so on the next login `auth.store.user
  .preferredLanguage` is authoritative; `fetchPreferences` reconciles local `appLanguage` with
  the server value (server wins on login; local optimistic on switch).

### 3b. Template store — `src/modules/voice/store/template.store.ts`

```
interface TemplateState {
  templates: Record<string /* `${type}:${lang}` */, MessageTemplateDto>   // cache by composite key
  isLoading: boolean
  loadError: string | null
  isMutating: boolean
  mutationError: string | null
  preview: { text: string; unresolved: string[] } | null
  isPreviewing: boolean
  previewError: string | null

  fetchTemplates(filter?: { templateType?: TemplateType; languageCode?: SupportedLanguage }): Promise<void>
  saveTemplate(dto: SaveMessageTemplateDto): Promise<MessageTemplateDto>   // PUT upsert; rethrow
  previewTemplate(dto: PreviewTemplateDto): Promise<void>                   // POST preview
  clearTemplates(): void
}
```

- Owner-only data; no persistence. `vendorId` from `auth.store.vendorContext.vendorId`.
- If a `(type, lang)` template is **absent** from the server list, the editor falls back to a
  **built-in default** (shipped per language in `src/modules/voice/service/templateDefaults.ts`)
  so the owner always sees a starting point (API_SPEC §2.1 note). Saving creates it (PUT → 201).

### 3c. Voice store — `src/modules/voice/store/voice.store.ts`

```
interface VoiceState {
  recordingState: 'idle' | 'requesting_permission' | 'recording' | 'transcribing' | 'executing'
  lastTranscription: string | null
  lastInterpretation: VoiceInterpretationDto | null
  lastResult: ExecuteCommandResultDto | null
  lastLogId: string | null
  candidates: VoiceCandidateDto[]          // for disambiguation
  error: string | null                     // i18n key

  transcribe(input: { audioData: string; languageCode: SupportedLanguage; supplyListId: string; serviceDate?: string }): Promise<VoiceTranscribeResultDto>
  executeCommand(input: { interpretation: ExecutableInterpretation; supplyListId: string; serviceDate?: string; logId?: string }): Promise<ExecuteCommandResultDto>
  reset(): void                            // [Next Customer] / Cancel
  clearVoice(): void                       // logout
}
```

- **Audio recording itself is NOT in the store** — it lives in a hook
  `useVoiceRecorder()` (`src/modules/voice/hooks/useVoiceRecorder.ts`) wrapping `expo-audio`
  (OQ-3). The hook returns `{ start, stop, cancel, isRecording, durationMs }` and yields a
  base64 string on `stop`. The store only does the two network calls + holds the interpretation.
- **Client orchestration (per API_SPEC §Notes):** `transcribe` is side-effect-light. After it
  returns, the *screen* decides:
  - `interpretation.autoExecute === true` → call `executeCommand` immediately (pass `logId`).
  - else → render confirmation/disambiguation, then call `executeCommand` on confirm.
- **Delivery refresh:** after a successful `executeCommand`, the screen calls
  `useDeliveryStore.getState().fetchListDeliveries(listId)` (lazy-require to avoid cycles, same
  pattern US-012 used for the customers store) so the pending list + progress update.
- **`reset()`** clears transcription/interpretation/candidates/error back to idle.

### Cross-store / logout wiring
Add lazy-require calls to `auth.store.logout()`: `clearLanguage()` (preferences only — keep the
UI language so the login screen stays in the chosen language), `clearTemplates()`, `clearVoice()`,
mirroring the established `clearDashboard()`/`clearCredit()` pattern.

---

## 4. API Client Mapping (service layer)

New services under `src/modules/voice/service/`, each branching on `isMockMode` +
`simulateNetworkDelay()` (mirror `credit.service.ts`). All ids are **strings** (coerce numeric
ids from the API with `String(id)`). Object-shaped `data.data` envelope. Export each from the
`src/services/api.service.ts` barrel.

Add a `Voice` (and reuse a `Users` builder) group to `src/constants/apiPaths.ts`
(no `/v1` prefix; base URL ends `/api/v1`):

```
Users: {
  LanguagePreferences: (userId) => `/users/${userId}/language-preferences`,   // GET + PATCH
},
MessageTemplates: {
  List:    (v) => `/vendors/${v}/message-templates`,            // GET + PUT (upsert)
  Preview: (v) => `/vendors/${v}/message-templates/preview`,    // POST
},
Voice: {
  Transcribe: '/voice/transcribe',                              // POST
  Execute:    '/voice/execute-command',                         // POST
},
```

| Service method | HTTP | Endpoint | Body/Query | Returns |
|----------------|------|----------|-----------|---------|
| `languageService.getPreferences(userId)` | GET | `/users/{u}/language-preferences` | — | `LanguagePreferencesDto` |
| `languageService.updatePreferences(userId, patch)` | PATCH | `/users/{u}/language-preferences` | body | `LanguagePreferencesDto` |
| `templateService.list(vendorId, filter?)` | GET | `/vendors/{v}/message-templates` | `?templateType&languageCode` | `{ templates: MessageTemplateDto[] }` |
| `templateService.save(vendorId, dto)` | PUT | `/vendors/{v}/message-templates` | body | `MessageTemplateDto` (200 update / 201 create) |
| `templateService.preview(vendorId, dto)` | POST | `/vendors/{v}/message-templates/preview` | body | `{ preview: string; unresolved: string[] }` |
| `voiceService.transcribe(input)` | POST | `/voice/transcribe` | `{ audioData, languageCode, supplyListId, serviceDate? }` | `VoiceTranscribeResultDto` |
| `voiceService.executeCommand(input)` | POST | `/voice/execute-command` | `{ interpretation, supplyListId, serviceDate?, logId? }` | `ExecuteCommandResultDto` |

> **Audio is base64 JSON, not multipart** (API_SPEC §3.1 is explicit). The recorder hook reads
> the file with `expo-file-system` as base64 and the service sends `application/json`. Cap audio
> at ≤ ~5 MB base64 client-side before sending (backend rejects larger).

### DTO types — new file `src/types/voice.ts`
Mirror the API_SPEC exactly. No `any`. Numeric ids coerced to string in the service.

```ts
export type LanguageCode = 'en'|'hi'|'ta'|'te'|'mr'|'bn'|'kn'|'ml'|'gu'   // === SupportedLanguage
export type BillLanguageDefault = 'customer'|'my_language'|'english'
export type TemplateType = 'payment_reminder'|'monthly_bill'|'delivery_confirmation'|'leave_confirmation'
export type VoiceAction = 'mark_delivered'|'mark_leave'|'mark_all'|'adjust_quantity'|'unknown'

export interface LanguagePreferencesDto {
  appLanguage: LanguageCode
  secondaryLanguage: LanguageCode | null
  voiceCommandsEnabled: boolean
  voiceResponsesEnabled: boolean
  transliterationEnabled: boolean
  billLanguageDefault: BillLanguageDefault
  preferredVoiceAccent: string | null
}
export type UpdateLanguagePreferencesDto = Partial<LanguagePreferencesDto>

export interface MessageTemplateDto {
  id: string
  templateType: TemplateType
  languageCode: LanguageCode
  content: string
  placeholders: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}
export interface SaveMessageTemplateDto { templateType: TemplateType; languageCode: LanguageCode; content: string }
export interface PreviewTemplateDto {
  templateType: TemplateType; languageCode: LanguageCode
  content?: string; sampleData?: Record<string, string>
}

export interface VoiceCandidateDto { id: string; name: string }
export interface VoiceInterpretationDto {
  action: VoiceAction
  customerId: string | null
  customerName: string | null
  quantity: number | null
  confidence: number          // 0–100
  autoExecute: boolean
  candidates: VoiceCandidateDto[]
}
export interface VoiceTranscribeResultDto {
  logId: string
  transcription: string
  confidence: number
  interpretation: VoiceInterpretationDto
}
// Only the fields execute-command accepts:
export interface ExecutableInterpretation {
  action: Exclude<VoiceAction, 'unknown'>
  customerId?: string         // required for mark_delivered/mark_leave/adjust_quantity
  quantity?: number           // required (>0) for adjust_quantity
}
// Discriminated by action shape:
export type ExecuteCommandResultDto =
  | { executed: true; action: 'mark_all'; markedCount: number }
  | { executed: true; action: Exclude<VoiceAction,'unknown'|'mark_all'>; customerId: string; customerName: string; deliveryId: string; status: string }
```

### Known allowed placeholders per template type (client-side validation, mirrors API_SPEC §2.2)
Ship as a const map in `src/modules/voice/service/templatePlaceholders.ts`:
```
payment_reminder:      [customer_name, month, amount, upi_id, phone, vendor_name, due_date]
monthly_bill:          [customer_name, month, total_due, items, upi_id, phone, vendor_name]
delivery_confirmation: [customer_name, item, quantity, date, vendor_name]
leave_confirmation:    [customer_name, from_date, to_date, vendor_name]
```
The editor validates `{{token}}` tokens against this set *before* PUT (matches the server's
`INVALID_PLACEHOLDER` 400; surface the offending token inline).

---

## 5. Components

Presentational (no store/network). Under `src/modules/voice/components/`, each with a
`__tests__` sibling. Reuse existing base primitives (`AppText`, `AppButton`, `AppCard`,
`AppRadioGroup`/radio primitive, `AppSwitch`, `AppHeader`, `AppProgressBar` if present).

| Component | Purpose | Reuse note |
|-----------|---------|------------|
| `LanguageRadioList` | 9-language radio list (native labels from `SUPPORTED_LANGUAGES`) | Built on existing radio primitive; show `nativeLabel (label)` |
| `PreferenceToggleCard` | Labeled switch + helper text (voice / transliteration) | Wraps `AppSwitch` + `AppText` |
| `BillLanguageRadioGroup` | customer / my_language / english | Reuse radio primitive; "my language" interpolates current app language name |
| `MicButton` | Large circular mic; idle/recording/processing visual states + pulse | Animated (`animation-haptics`); ≥64pt target; a11y label |
| `VoiceExampleList` | Localized example commands (from locale keys per language) | Pure text list |
| `LastCommandCard` | transcription + ✓ result line | Pure card |
| `VoiceResultCard` | 2.49 summary (command, action, customer, list, confidence) | Pure card; confidence color dot |
| `DisambiguationSheet` | Candidate chips when `customerId` null + candidates>0 | Bottom-sheet or inline list; tap → execute |
| `TemplateTypeSelector` | 4-type selector (radio or segmented) | Reuse `AppSegmentedControl` if present |
| `TemplateLanguageTabs` | Horizontal language tabs (Hindi/English/Tamil/+Add) | Scrollable pill row |
| `TemplateEditor` | Multiline editor + live placeholder validation + insert-chip | Validates against `templatePlaceholders` before submit |
| `PlaceholderChips` | Tappable available-placeholder chips (insert at cursor) | Pure |
| `TemplatePreviewCard` | Rendered preview + `unresolved` list | Pure; shows unresolved tokens as a hint |

**No new charting/heavy deps.** Mic pulse uses `react-native-reanimated`/`Animated` already in
the project (per `animation-haptics`).

---

## 6. Business Rules (enforce in UI; server is source of truth)

1. **Self-scope for preferences** — S1 always uses `auth.store.user.id` as `:userId`; never a
   param. Staff and owners both manage their own preferences.
2. **Voice availability** — the mic entry point on `DeliveryListScreen` and S3 are only shown
   when `preferences.voiceCommandsEnabled === true`. If a user opens the voice route directly with
   it disabled, S3 shows an empty/CTA state pointing to S1.
3. **`secondaryLanguage` must differ from `appLanguage`** — validate before PATCH (server returns
   400 otherwise). Hide the current app language from the secondary picker.
4. **English disables transliteration** — when `appLanguage === 'en'`, force the transliteration
   toggle **off + disabled** (server forces it false; edge case #10). Mirror the rule client-side.
5. **Confidence threshold = 80.** `autoExecute` is decided **by the server**
   (`interpretation.autoExecute`), not recomputed on the client. The client honors it:
   `true` → execute immediately; `false` → confirm/disambiguate first. (Display `confidence` as %.)
6. **Ambiguous customer** (`customerId === null` && `candidates.length > 0`) → show
   `DisambiguationSheet`; execute with the chosen id. (Edge cases #2, #5.)
7. **Unknown command** (`action === 'unknown'`) → never call execute (server would 422); show a
   "didn't catch that, try again" retry state. (Edge case #7.)
8. **STT provider failure (502 `SPEECH_PROVIDER_ERROR`) / network failure** → fall back to manual
   entry: show an inline message + a "Mark manually" CTA that returns to `DeliveryListScreen`.
   (Edge cases #1, #9.) Do **not** auto-retry transcription.
9. **`mark_all`** → confirm with a dialog (it can mark many), then execute with no `customerId`;
   show `markedCount` in the result.
10. **Template placeholders** must be in the type whitelist; validate before PUT and surface the
    offending `{{token}}`. `content` 1–2000 chars.
11. **Bill language default** is a *policy* the owner sets (S1); the rendered bill text comes from
    existing billing/reminder endpoints. No bill-rendering UI in this story (API_SPEC §4).
12. **Rate limit (429)** on voice endpoints → "try again shortly"; no auto-retry.
13. **Multi-tenant / 404** — any `NOT_FOUND` (template/list/customer wrong tenant) → empty/error
    state, never leak existence.
14. **Microphone permission** — request on first record; if denied, show a settings-deeplink CTA
    and keep manual marking available. Never block the delivery list.

---

## 7. The 5 Screen States (per screen, `screen-development.md`)

| Screen | Loading | Empty | Error | Populated | Offline |
|--------|---------|-------|-------|-----------|---------|
| S1 Language | spinner while `fetchPreferences` | n/a (defaults always exist) | inline banner + retry | form (radio + toggles + radio) | form usable from cache; Save disabled offline (PATCH needs net); language *switch* still works locally + queued? **No** — apply locally, persist locally, sync on reconnect (OQ-2) |
| S2 Templates | skeleton editor | "no custom template — using default" hint | inline banner + retry | type/lang tabs + editor + preview | editor read-only from cache; Save/Preview disabled offline |
| S3 Voice | mic = processing spinner during transcribe/execute | "voice off — enable in settings" CTA when disabled | inline + "mark manually" CTA (STT/network fail) | idle → recording → result/disambiguation | mic disabled offline + banner; manual marking still available via the embedded list |

All screens: thin `XxxContent` split wrapped in `ScreenErrorBoundary`; `SafeAreaView`; Tamagui
primitives + `@constants/tokens`; `useShallow` selectors; **all strings via `t()`**; haptics on
every action; double-tap guard on every submit/record; `FlatList` for the pending list (reuse
delivery list rendering).

---

## 8. Localization

This story is *itself* about i18n, so it has the strictest bar:

- All new keys under a `voice.*` and `language.*` namespace (e.g. `language.title`,
  `language.app_language`, `language.voice_commands`, `language.transliteration`,
  `language.bill_default.customer`, `voice.tap_to_speak`, `voice.listening`, `voice.done`,
  `voice.examples.delivered`, `voice.confirm_mark_all`, `voice.error.provider`,
  `voice.error.unknown`, `voice.disambiguate_title`, `templates.title`,
  `templates.type.payment_reminder`, `templates.placeholder_invalid`, etc.).
- **Every new key in all 9 locale files** with a **real translation** (not English copied) —
  `localization-i18n` DoD; a key missing from any file is CRITICAL.
- The **example voice commands** (2.47) must be per-language strings (the Hindi examples shown in
  the wireframe are the `hi` values; provide equivalents per language).
- Built-in **template defaults** (`templateDefaults.ts`) are *not* UI strings but ship per
  language too (one default body per type × language), so the editor has a localized starting
  point.
- Currency/number/date formatting stays locale-aware (₹, Indian grouping) per the skill.
- **Reactivity is part of localization here:** verify switching language on S1 re-renders the
  whole app immediately (the version-counter fix, §3a / OQ-1).

---

## 9. Offline / Error / Performance

- **Offline:** language *switch* applies locally + persists locally and is **synced on
  reconnect** (the chosen language must work offline — it's a UI concern, not a server one).
  Preference PATCH, template GET/PUT/preview, and both voice endpoints are **network-only**;
  disabled offline with a banner. The delivery list embedded in S3 keeps its existing offline
  behavior (the delivery store already supports offline/optimistic marking).
- **Error handling (`error-handling.md`):** stores map via `mapApiError(err, '<ns>', action)`;
  every failure goes through shared `logError` with `{ screen, action, endpoint }` + backend
  `correlationId`, no PII (never log `audioData` or transcription content that could carry PII).
  Error strings are i18n keys.
- **Performance:** memoize cards (`React.memo`); the pending list reuses the delivery FlatList;
  cap/reject oversized audio before upload; mic animation uses the native driver; debounce the
  template editor's live placeholder validation. Target voice round-trip < 2 s (dominated by STT;
  show the processing state so the UI never appears frozen).

---

## 10. Security

- `userId` (preferences) strictly from `auth.store.user.id`; `vendorId` (templates) strictly from
  `auth.store.vendorContext.vendorId` — never from params/UI/body.
- `useRequireOwner()` on S2 only (defense in depth; server enforces 403). S1/S3 are self/list-
  access scoped.
- No tokens in any voice/language/template store. Only `appLanguage` is persisted (non-sensitive).
- Microphone permission requested explicitly; audio captured only during an active recording and
  discarded after upload (no local audio retention).
- Never log audio, transcription, or customer PII; `logError` context masks names/phones.

---

## 11. Libraries Proposed (additions)

| Library | Why | Trade-off / alternative |
|---------|-----|-------------------------|
| `expo-audio` | Record the voice clip (Expo SDK 54 successor to `expo-av` Audio, which is deprecated/removed). | The user story snippet shows `expo-av`; it's deprecated in current Expo. **Recommend `expo-audio`.** If the project pins an older Expo where `expo-audio` is unavailable, fall back to `expo-av`. (OQ-3) |
| `expo-file-system` | Read the recorded file as base64 for the JSON payload. | Likely already transitively present (Expo); add explicitly. |
| *(none for i18n)* | The existing `src/locales` layer is the contract; we extend it, not replace it. | Adding `react-i18next` would duplicate the layer, churn every existing screen, and violate `localization-i18n`. **Do not add.** (OQ-1) |
| *(none for transliteration)* | Transliteration UI (type Roman → see script) is an **acceptance criterion** but has no backend; it's a client-only input feature. | **Recommend deferring the live-transliteration text input to a follow-up** (store only the toggle now, which the backend supports). A real transliteration engine (e.g. Google Input Tools / `@indic-transliteration`) is a sizeable add for low-end devices. (OQ-6) |

`expo-haptics`, `expo-localization`, `react-native-reanimated`, `react-native-safe-area-context`,
Tamagui, Zustand, Expo Router, AsyncStorage are **already present** — reuse them.

---

## 12. Open Questions (recommendation + trade-off — defaults applied so dev is not blocked)

- **OQ-1 — i18n reactivity mechanism.** The existing `t()` is non-reactive; switching language
  doesn't re-render. **Recommend (APPLIED): add a `version` counter to the new
  `language.store`; rewrite `useTranslation` to read `version` (subscribe) and return the same
  `t`.** Every component already calls `useTranslation()`, so they all become reactive with zero
  per-screen changes. Trade-off: a global re-render on language switch (rare, acceptable) and a
  one-line change to `useTranslation`. Alternative (swap to `react-i18next`) is a far larger,
  riskier churn and violates the skill. *Confirm you're happy extending the in-house layer rather
  than adopting `react-i18next`.*

- **OQ-2 — Apply language on selection vs. on Save; offline behavior.** **Recommend (APPLIED):
  apply the UI language **immediately on Save** (optimistic local switch + persist), then fire the
  PATCH; if PATCH fails, keep the local language but show a "couldn't sync" inline error and retry
  on reconnect.** Rationale: the chosen UI language is a local concern that must work offline; the
  server copy is a convenience for cross-device. Trade-off: brief divergence between local and
  server until sync. *Confirm you don't require live preview on each radio tap.*

- **OQ-3 — Audio recording library.** **Recommend (APPLIED): `expo-audio`** (current Expo;
  `expo-av` Audio is deprecated). Encapsulate in `useVoiceRecorder()` so swapping the lib later is
  one-file. Trade-off: a new dependency + a config-plugin/permission entry (`RECORD_AUDIO`,
  `NSMicrophoneUsageDescription`) in `app.json`. *Confirm the Expo SDK version supports
  `expo-audio`; otherwise we use `expo-av`.*

- **OQ-4 — Audio encoding/sample rate for the backend STT.** The backend expects
  `LINEAR16/WAV` base64 (API_SPEC §3.1). **Recommend (APPLIED): record WAV/LINEAR16 16 kHz mono**
  via the recorder preset to match the STT config in the story (`sampleRateHertz: 16000`).
  Trade-off: if the device can't produce LINEAR16, we may need a transcode step or the backend
  stub (default) tolerates any blob. Since the backend defaults to the **stub** provider now,
  exact encoding is not yet load-bearing for the demo. *Confirm the production STT provider +
  required encoding before real audio goes live.*

- **OQ-5 — Deliveries route restructure for the child voice route.** **Recommend (APPLIED):
  convert `app/(app)/deliveries/[listId].tsx` → `deliveries/[listId]/index.tsx` + add
  `voice.tsx` + `_layout.tsx`.** Pure file move; the screen reads params, so no logic changes.
  Trade-off: a git move that touches the route tree. *Confirm this is acceptable vs. a flat route.*

- **OQ-6 — Transliteration (type Roman → regional script) input feature.** It's an AC but has no
  backend and needs a transliteration engine. **Recommend (APPLIED): ship the **toggle** (stored
  via preferences) now; defer the live transliterating text input to a follow-up story.**
  Trade-off: the toggle exists but does nothing visible yet (matches the backend, which only
  stores the flag). *Confirm transliteration input can be a fast-follow rather than blocking
  US-013.*

- **OQ-7 — Voice "Undo" (2.49) semantics.** There's no "undo voice command" endpoint.
  **Recommend (APPLIED): `[Undo]` reverts the just-marked delivery to its prior status via the
  existing `useDeliveryStore.markDelivery(listId, deliveryId, 'PENDING')`** (for single-customer
  actions; `mark_all` undo is out of scope — show no Undo for mark_all). Trade-off: undo is a
  normal delivery mutation, not a voice-log reversal, so the voice log row still records the
  original execution. *Confirm undo-of-mark_all is not required for MVP.*

- **OQ-8 — Voice responses (`voiceResponsesEnabled`) / TTS.** The preference exists in the API
  but the wireframes show only visual confirmation. **Recommend (APPLIED): persist the toggle;
  do not implement text-to-speech playback in this story.** Trade-off: the toggle is forward-
  compatible but inert until a TTS follow-up. *Confirm TTS is out of scope for US-013.*

- **OQ-9 — `preferredVoiceAccent`.** Present in the API, absent from the wireframes.
  **Recommend (APPLIED): do not expose an accent picker in the UI for MVP** (send `null`/omit).
  Trade-off: a supported field goes unused. *Confirm no accent selector is needed now.*
