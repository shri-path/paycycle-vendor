# Skill 09 — Accessibility & UX (MANDATORY)

Users may have low literacy, rough hands, budget devices, and use TalkBack. Design for the floor.

## When to use
Every component and screen.

## Rules
1. **Touch targets ≥ 44×44.** Use `componentSizes`/`interaction.minTouchTarget`; add `hitSlop` (`interaction.defaultHitSlop`) to small icons/links.
2. **Screen reader labels.** Every interactive element has `accessibilityRole` + a translated `accessibilityLabel`. Icons that convey meaning have labels; decorative icons are `accessibilityElementsHidden`/`importantForAccessibility="no"`.
3. **Logical focus order** — top-to-bottom, left-to-right. Group related content.
4. **Color is never the only signal.** Pair color with icon/text (success ✓, error ✕) — important for low-literacy + color-blind users.
5. **Contrast** ≥ 4.5:1 for text. Use `colors.textPrimary`/`textSecondary` on surfaces; don't put light text on light tints.
6. **Dynamic type** — text scales with system font size (up to ~1.5×) without clipping. Don't lock font sizes that break layout.
7. **Tap-first, minimal typing.** Prefer selection over free text; numeric keypad (`keyboardType="number-pad"`) for amounts/phones; large primary actions within thumb reach.
8. **Confirm destructive actions** with `AppConfirmDialog`.
9. **Reduce motion** — respect `AccessibilityInfo.isReduceMotionEnabled()` for non-essential animation (see `animation-haptics.md`).
10. **Long-script safety** — layouts must not clip Tamil/Malayalam/Bengali (see `localization-i18n.md`).

## Pattern
```tsx
<TouchableOpacity
  onPress={onEdit}
  hitSlop={interaction.defaultHitSlop}
  accessibilityRole="button"
  accessibilityLabel={t('action.edit')}
>
  <Ionicons name="pencil" size={componentSizes.icon.md} color={colors.primary} />
</TouchableOpacity>

// status: color + icon + text, not color alone
<XStack ai="center" gap={spacing[1]}>
  <Ionicons name="checkmark-circle" color={colors.success} />
  <AppText color={colors.success}>{t('status.paid')}</AppText>
</XStack>
```

## Definition of Done (Review checklist)
- [ ] All interactive elements ≥ 44×44 (or `hitSlop` to compensate)
- [ ] `accessibilityRole` + translated `accessibilityLabel` on every control; decorative icons hidden
- [ ] State conveyed by icon/text, not color alone; contrast ≥ 4.5:1
- [ ] Numeric keypad for amounts/phone; minimal free-text
- [ ] Destructive actions confirmed via `AppConfirmDialog`
- [ ] Reduce-motion respected; no clipping under large font / long scripts

## Common violations → findings
- Icon-only button with no `accessibilityLabel` → MAJOR
- 30×30 tappable with no `hitSlop` → MAJOR (touch target)
- Status shown by color only → MAJOR (a11y)
- Free-text field for an amount → MAJOR (UX)
