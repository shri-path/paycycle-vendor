# Skill 07 — Localization / i18n (MANDATORY)

Every user-facing string is a translation key present in **all 9 languages**. No exceptions.

Languages: `en, hi, ta, te, mr, bn, kn, ml, gu` — files in `src/locales/`.

## When to use
Any time you add or change user-facing text, or render dates/numbers/currency.

## Rules
1. **No hardcoded user-facing strings.** Use `const { t } = useTranslation(); t('feature.key')`. This includes button labels, titles, placeholders, errors, empty states, a11y labels, alerts.
2. **Add the key to ALL 9 locale files** — `en, hi, ta, te, mr, bn, kn, ml, gu`. A key missing from any file is a defect. Provide a real translation, not the English string copied in.
3. **Key naming**: namespaced by feature — `customers.empty_title`, `auth.sign_in`, `validation.invalid_phone`. Reuse `common.*`, `action.*`, `validation.*`, `errors.*` for shared strings.
4. **Errors are keys.** Stores/`mapApiError` produce i18n keys; screens render `t(key)`. Never store/display a raw English message.
5. **Interpolation/plurals** go through the i18n layer, not string concatenation, so word order works across scripts.
6. **Locale-aware formatting**: amounts use Indian grouping (₹1,00,000), currency shows ₹, dates use locale format. Numerals stay Arabic unless specified.
7. **Layout for long scripts.** Tamil/Malayalam/Bengali run longer — components must not clip; test overflow (see `accessibility-ux.md` / QA).
8. **Runtime switching + fallback.** Changing language updates all visible text immediately; missing key falls back to `en` (and is still a bug to fix).

## Pattern
```tsx
const { t } = useTranslation()
<AppText variant="h1">{t('customers.title')}</AppText>
<AppButton label={t('action.save')} onPress={save} />
// error from store is already a key:
{error ? <AppText color={colors.error}>{t(error)}</AppText> : null}
```
```jsonc
// add to en.json AND the other 8
{ "customers": { "title": "Customers", "empty_title": "No customers yet" } }
```

## Definition of Done (Review checklist)
- [ ] Zero hardcoded user-facing strings; all via `t()`
- [ ] Every new key exists in all 9 locale files with a real translation
- [ ] Keys are feature-namespaced; shared strings reused from `common/action/validation/errors`
- [ ] Errors handled as i18n keys end to end
- [ ] Currency/number/date formatting is locale-aware (₹, Indian grouping)
- [ ] No layout clipping in long-script languages

## Common violations → findings
- `<AppText>Save</AppText>` literal → MAJOR
- Key added to `en.json` only → CRITICAL (8 languages broken)
- English text copied into `hi.json` as placeholder → MAJOR
- String concatenation for sentences (`t('a') + name`) → MAJOR (breaks word order)
