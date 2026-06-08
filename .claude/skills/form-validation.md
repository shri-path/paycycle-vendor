# Skill 15 — Form Validation (MANDATORY)

Strict-yet-sensible client-side validation with instant visual feedback. Client validation is **defense-in-depth and UX** — the backend (`paycycle_api`) is the authority and uses parameterized queries; never assume the client is the security boundary. The client's job: stop obviously bad/dangerous input early, give clear feedback, and reduce round-trips.

## When to use
Any form, any text/number input, before any create/update API call.

## The required UX (non-negotiable)
1. **Message below the input.** The validation message renders directly beneath the invalid field — pass it to `AppInput`'s `error` prop, which already renders a caption in `colors.error` below the field.
2. **Red border on invalid.** `AppInput` shows a `colors.error` border whenever `error` is truthy — do not reinvent this; just feed it the `error`.
3. **Border + message clear the moment the field becomes valid.** Once a field has shown an error, re-validate it on **every** `onChangeText`; the instant it passes, set its error to `null` so the red border disappears immediately (don't wait for submit/blur).
4. **`error` is an i18n key** rendered via `t()` (see `localization-i18n.md`) — never a raw English string.

### Touched-field pattern (validate on blur + re-validate on change once touched)
```tsx
const [name, setName] = useState('')
const [nameError, setNameError] = useState<string | null>(null)
const [nameTouched, setNameTouched] = useState(false)

const onChangeName = (raw: string) => {
  const v = sanitizeText(raw)                      // strip control chars as typed
  setName(v)
  if (nameTouched) setNameError(validateName(v))   // re-validate live -> border clears when valid
}

<AppInput
  label={t('customers.name')}
  value={name}
  onChangeText={onChangeName}
  onBlur={() => { setNameTouched(true); setNameError(validateName(name)) }}
  error={nameError ? t(nameError) : undefined}     // red border + message below, auto-clears
  maxLength={LIMITS.name}                           // hard cap at the input level too
/>
```

## Validation rules (apply ALWAYS, in this order)
1. **Trim whitespace** before validating/submitting (`value.trim()`); collapse internal runs where it makes sense (names: collapse multiple spaces). Reject all-whitespace as empty.
2. **Required check** → `validation.required`.
3. **Max length, always.** Every field has a hard cap (also set `maxLength` on the input as a backstop). Over the cap → `validation.too_long`.
4. **Min length where meaningful** (password ≥ 8, phone ≥ 10).
5. **Allowlist regex per field type** — prefer allowing known-good characters over blocklisting bad ones (blocklists are bypassable). E.g. names allow letters (incl. Indic scripts), spaces, `. - '`; phone digits only; amounts `^\d+(\.\d{1,2})?$`.
6. **Reject injection/control payloads** as defense-in-depth: strip ASCII control chars and reject free-text inputs containing `<script`, `</`, `<`, `>`, or SQL meta-sequences (`--`, `/* */`, `' OR 1=1`, `xp_`). This is a guard, not the primary defense — the allowlist regex above is what actually constrains the field.
7. **Format regex where required** — phone, amount, OTP (`^\d{6}$`), etc.
8. **Return an i18n key or `null`** — pure functions in `src/utils/validation.ts`, no side effects, no `t()` inside (callers translate).

### Shared helpers (extend `src/utils/validation.ts`)
```ts
export const LIMITS = { name: 60, phone: 15, amount: 12, note: 280, password: 64 } as const

// Allowlist regexes (single source of truth)
const NAME_RE = /^[\p{L}\p{M} .'-]+$/u            // letters (any script) + space . ' -
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
const OTP_RE = /^\d{6}$/

// Defense-in-depth guard for free text (NOT the primary control).
// Control chars = code points < 0x20 (C0) or 0x7F (DEL). Checked by code point,
// not a literal regex class, to keep the source free of raw control bytes.
const INJECTION_RE = /<\/?\s*\w|[<>]|--|\/\*|\*\/|\bOR\b\s+\d+\s*=\s*\d+|xp_/i

const isControlChar = (ch: string): boolean => {
  const n = ch.charCodeAt(0)
  return n < 0x20 || n === 0x7f
}
const hasControlChar = (s: string): boolean => Array.from(s).some(isControlChar)

export function sanitizeText(s: string): string {
  return Array.from(s).filter((c) => !isControlChar(c)).join('')   // strip control chars
}

export function validateName(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  if (!v) return 'validation.required'
  if (v.length > LIMITS.name) return 'validation.too_long'
  if (hasControlChar(v) || INJECTION_RE.test(v)) return 'validation.invalid_characters'
  if (!NAME_RE.test(v)) return 'validation.invalid_characters'
  return null
}

export function validateAmount(raw: string): string | null {
  const v = raw.trim()
  if (!v) return 'validation.required'
  if (!AMOUNT_RE.test(v)) return 'validation.invalid_amount'
  if (Number(v) <= 0) return 'validation.amount_positive'
  if (v.replace('.', '').length > LIMITS.amount) return 'validation.too_long'
  return null
}
```
(`validatePassword` and `validatePhone` already exist in `validation.ts` — reuse them, don't duplicate.)

## Rules summary
1. Use `AppInput`'s `error` prop for the red border + message-below; never build a parallel error UI.
2. Re-validate a touched field on every change so the error/border clears instantly when valid.
3. All validators live in `src/utils/validation.ts`, return i18n keys, are pure and unit-tested (`testing-strategy.md`).
4. Always trim, always cap length, allowlist-regex per field, guard free-text against injection/control chars.
5. Validate the whole form again on submit; block the API call if anything is invalid; fire error haptic (`animation-haptics.md`).
6. Add every new `validation.*` key to all 9 locale files (`localization-i18n.md`).
7. Client validation never replaces server validation — handle the server's 422/validation errors via `mapApiError` too (`error-handling.md`).

## Definition of Done (Review checklist)
- [ ] Invalid field shows message **below** the input via `AppInput` `error` (red border) — no custom error UI
- [ ] Error + red border clear immediately when the field becomes valid (live re-validation once touched)
- [ ] `error` values are i18n keys rendered with `t()`; keys exist in all 9 locales
- [ ] Validators are pure functions in `src/utils/validation.ts` returning key|null; reused, not duplicated
- [ ] Every field: trimmed, max-length capped (and `maxLength` on input), allowlist regex applied
- [ ] Free-text fields guarded against control chars + injection sequences (defense-in-depth)
- [ ] Submit re-validates whole form, blocks API call on failure, fires error haptic
- [ ] Server validation errors still handled via `mapApiError`
- [ ] Validators unit-tested (valid, empty, whitespace, too-long, injection, boundary)

## Common violations → findings
- Error message not below the field / no red border → MAJOR (use `AppInput.error`)
- Red border persists after input becomes valid (only clears on submit) → MAJOR (live re-validate)
- No max length / no trim → MAJOR
- Blocklist-only validation with no allowlist regex → MAJOR (bypassable)
- Raw English validation string instead of i18n key → MAJOR
- Relying solely on client validation, ignoring server 422 → MAJOR
- Unsanitized free text sent to API (control chars / `<script>`) → CRITICAL
