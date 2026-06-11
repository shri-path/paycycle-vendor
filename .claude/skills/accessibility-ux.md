# Skill 09 — Accessibility & UX (MANDATORY)

A WhatsApp-clean experience for non-tech, low-literacy users on budget Androids with poor connectivity — now scaling worldwide. Lowest cognitive load wins; design for the floor.

## When to use
Every component and screen.

## Rules

### Cognitive load (the heart of this skill)
1. **One primary action per screen.** Exactly one dominant CTA; everything else is secondary/`link`. Don't make 5+ primary actions compete.
2. **Progressive disclosure.** Show only what's needed now. Hide advanced/rare options behind "more", `AppBottomSheet`, or a secondary screen — never dump every option at once.
3. **Recognition over recall.** Show choices, don't make users remember them — `AppSelect`/`AppRadioGroup`/`AppSegmentedControl` over free text; never ask for something the app already knows.
4. **Smart defaults & pre-fill.** Pre-select the most common value; carry forward last-used input. Most users should be able to confirm without editing.
5. **Chunk long forms into steps.** Break >5–7 fields into short steps with clear progress; never one wall of inputs.
6. **≤ 5–7 choices at once.** More than that → group, paginate, or disclose progressively.
7. **Plain, short language.** Short words, one idea per line, no jargon. Use `AppText` variants (`body`/`caption`/`label`) for hierarchy.
8. **Reversible over confirmational.** Prefer an undo (`AppAlert`/snackbar) for safe actions; reserve `AppConfirmDialog` for truly destructive ones.
9. **Consistent placement.** Same actions live in the same spot every screen so muscle memory forms (see `screen-development.md`, `ui-visual-design.md`).

### Minimal-effort input
10. **Tap over type.** Selection lists / segmented controls / `AppSelect` over free text everywhere it's possible.
11. **Right keyboard.** `keyboardType="number-pad"` for amounts/quantities; `AppPhoneInput` for phone. Autofocus the first field; offer autosuggest where it helps.
12. **Forgiving parsing.** Trim whitespace, accept spaces/dashes in phone numbers, normalize before validate (see `form-validation.md`). Never reject a value you could clean.

### Internationalization for a wide range of users
13. **Every user-facing string via `t()`.** No literals in JSX. 9 locales today (en, hi, ta, te, mr, bn, kn, ml, gu) and growing — see `localization-i18n.md`.
14. **RTL readiness.** Use `start`/`end` (never `left`/`right`) for padding/margin/position; logical flex direction; honor `I18nManager.isRTL`; mirror directional icons (chevrons, arrows, back).
15. **Text expansion (+~35%).** Design for longer translations: no fixed-width labels, no clipping/truncation of critical text, allow 2 lines, let containers grow.
16. **Locale-aware formatting.** Format numbers, currency, dates, times via the locale — never hardcode `₹` or `DD/MM`.
17. **Script & font fallback.** Tamil/Malayalam/Bengali/Arabic/CJK must render uncut — use generous `lineHeight` so tall scripts don't clip.
18. **Culturally neutral signals.** Don't rely on red/green alone or culture-specific icons; pair with icon + text. Avoid idioms, slang, humor. Never concatenate translated fragments — use ICU placeholders.

### Core accessibility
19. **Touch targets ≥ 44×44.** Use `componentSizes`/`interaction.minTouchTarget`; add `hitSlop` (`interaction.defaultHitSlop`) to small icons/links.
20. **Screen reader labels.** Every control has `accessibilityRole` + translated `accessibilityLabel`. Decorative icons → `importantForAccessibility="no"`.
21. **Logical focus order & grouping** — start-to-end, top-to-bottom; group related content.
22. **Announce dynamic changes** with `AccessibilityInfo.announceForAccessibility` / `accessibilityLiveRegion`. Manage focus on screen change and after errors.
23. **Color never the only signal.** Pair with icon/text (success ✓, error ✕) for color-blind + low-literacy users.
24. **Contrast** ≥ 4.5:1 text, ≥ 3:1 large text & icons. Use `colors.textPrimary`/`textSecondary` on surfaces; no light text on light tints.
25. **Dynamic Type** scales to ~1.5× without breaking layout. Don't lock font sizes that clip.
26. **Respect reduce-motion** for non-essential animation (`AccessibilityInfo.isReduceMotionEnabled()`, see `animation-haptics.md`).
27. **Confirm destructive actions** via `AppConfirmDialog`.

### Thumb reach
28. **Primary action in thumb reach.** The main CTA lives at the **bottom**, reachable one-handed — not mid-screen or pinned top. Patterns: a fixed footer (`<View style={styles.footer}>` outside the `ScrollView`), a flex spacer pushing the CTA down on short screens (`<YStack flex={1} />` before the button), or a bottom-anchored FAB. **Exceptions** (acceptable): long scrollable forms where the CTA follows the last field (Login/Signup), and detail/settings screens with multiple section-scoped actions. Secondary/`link` actions may sit beside or below the primary CTA.

### Error & recovery UX
29. **Inline, specific, blame-free errors** tied to the field — reuse `AppInput`'s `error` prop. Say how to fix it. Never lose entered data on error (see `form-validation.md`).

## Pattern
```tsx
// Icon button: role + translated label + hitSlop
<TouchableOpacity
  onPress={onEdit}
  hitSlop={interaction.defaultHitSlop}
  accessibilityRole="button"
  accessibilityLabel={t('action.edit')}
>
  <Ionicons name="pencil" size={componentSizes.icon.md} color={colors.primary} />
</TouchableOpacity>

// Status: color + icon + text (never color alone), RTL-safe row
<XStack ai="center" gap={spacing[1]}>
  <Ionicons name="checkmark-circle" color={colors.success} />
  <AppText color={colors.success}>{t('status.paid')}</AppText>
</XStack>
```
```tsx
// i18n + RTL: logical props, no hardcoded ₹/date, progressive disclosure
<YStack paddingStart={spacing[4]} paddingEnd={spacing[4]} gap={spacing[2]}>
  <AppText variant="body" numberOfLines={2}>           {/* allow text expansion */}
    {t('invoice.total', { amount: formatCurrency(total, locale) })}
  </AppText>
  <AppButton variant="secondary" onPress={() => sheetRef.current?.open()}>
    {t('common.more')}                                  {/* rare options behind a sheet */}
  </AppButton>
</YStack>
```

## Definition of Done (Review checklist)
- [ ] **Cognitive load:** one primary action; rare options progressively disclosed; smart defaults/pre-fill; ≤ 5–7 choices; long forms chunked; plain short copy; consistent placement
- [ ] **Minimal input:** tap over type; correct keyboard (`number-pad`/`AppPhoneInput`); forgiving parsing; reversible/undo over needless confirmation
- [ ] **i18n/RTL/text-expansion:** all strings via `t()`; `start`/`end` not `left`/`right`; mirrored directional icons; +35% expansion fits (2 lines OK); locale-aware numbers/currency/dates; tall scripts don't clip; no fragment concatenation
- [ ] **A11y:** ≥ 44×44 (or `hitSlop`); `accessibilityRole` + translated label; decorative icons hidden; color never sole signal; contrast met; dynamic changes announced; focus managed; reduce-motion respected; destructive confirmed
- [ ] **Error recovery:** inline, specific, blame-free, says how to fix; entered data preserved
- [ ] **Thumb reach:** primary CTA bottom-anchored (footer / flex-spacer / FAB) unless a documented exception applies

## Common violations → findings
- 5+ primary actions competing on one screen → MAJOR (cognitive load)
- All options dumped at once instead of progressive disclosure / step chunking → MAJOR (cognitive load)
- Free-text field where a selection/segmented control fits → MAJOR (minimal input)
- Hard-coded `₹` or `DD/MM` date / number not locale-formatted → MAJOR (i18n)
- `left`/`right` padding/margin instead of `start`/`end` → MAJOR (RTL)
- Fixed-width label clips a long translation / truncates critical text → MAJOR (text expansion)
- Translated fragments concatenated instead of ICU placeholders → MAJOR (i18n)
- Icon-only button with no `accessibilityLabel` → MAJOR (a11y)
- 30×30 tappable with no `hitSlop` → MAJOR (touch target)
- Status shown by color only → MAJOR (a11y)
- Hard-coded user-facing string (no `t()`) → MAJOR (i18n)
- Error message that loses entered data or doesn't say how to fix → MINOR (error recovery)
- Primary CTA floating mid-screen / pinned top on a short screen → MINOR (thumb reach)
- Directional icon (chevron/back) not mirrored in RTL → MINOR (RTL)
