# Skill 16 — Modern Mobile UI / Visual Design (MANDATORY)

With the best UX we must also have top-notch UI. This skill governs **how it looks** — visual craft. It is the peer of `accessibility-ux.md` (how it feels to use); never duplicate that one, cross-reference it. Aim: modern, trustworthy, calm, uncluttered — never flashy.

## When to use
Every component and every screen — any visual decision (layout, type, color, depth, spacing, states).

## Rules

### Visual hierarchy
1. **One focal point per screen.** Rank information with size, weight, color, and spacing. The most important thing is the largest/boldest; everything else recedes.
2. **One dominant action.** The primary CTA is a filled `primary` `AppButton`; secondary actions are `outline`/`ghost`/`link`. Never two competing filled primaries on one screen.
3. **Variants, not invented sizes.** Express hierarchy through `AppText` variants (`h1`/`h2`/`h3`/`body`/`caption`/`label`) — never hand-roll a font size.

### Spacing & layout rhythm
4. **4/8pt grid.** All margins, padding, and gaps come from `spacing` (4-base). No arbitrary pixel values.
5. **Consistent screen padding.** One horizontal padding for the whole screen (`spacing[4]` = 16). Don't vary it section to section.
6. **Proximity.** Related items get small gaps (`spacing[1..2]`); separate groups get large gaps (`spacing[5..6]`). Grouping is done with whitespace, not boxes.
7. **Breathe.** Generous whitespace; don't fill every pixel. Align content to a single left edge. Do **not** nest cards inside cards.

### Typography
8. **Type scale only.** Use `fontSize`/`lineHeight`/`fontWeight` tokens via `AppText`. Limit to ~3 sizes per screen.
9. **Readable body.** Body text ≥ `fontSize.base` (16); keep token line-heights for readability.
10. **Weight for emphasis, not color.** Emphasize with `fontWeight` (semibold/bold), not many colors. Keep numerals and labels styled consistently. Never truncate critical text (see `localization-i18n.md` / text-expansion in `accessibility-ux.md`).

### Color & theming
11. **60/30/10.** Neutral surfaces (`background`/`surface`/grays) dominate ~60%; `primary` for key actions/branding ~30% but sparingly; `accent` (#25D366) rarest ~10%.
12. **Semantic = meaning only.** `success`/`error`/`warning`/`info` (and their `*Bg` tints) only for their state. Text on a tint stays ≥ 4.5:1 (use `textPrimary` on light tints).
13. **No pure black, no off-token hex.** Large fills use `textPrimary` (#111B21) / grays, never `#000`. Never introduce a hex outside `colors`.

### Depth & elevation
14. **Shadow tokens only.** Use `shadows` for elevation: cards `sm`/`base`, sheets/modals/dialogs `lg`/`xl`. Surfaces are flat (`shadows.none`) by default.
15. **One step between layers.** Exactly one elevation step between stacked surfaces. Use a `gray200` border **or** a shadow — not both heavy. Keep one `borderRadius` family (`md`/`lg` for cards).

### Components & consistency
16. **Compose, don't reinvent.** Build from base components (AppCard, AppText, AppButton, AppBadge, AppAvatar, AppDivider, AppListItem, AppSection, AppStatsCard, AppEmptyState, AppHeader) — see `component-development.md`. Identical problems get identical patterns.
17. **Consistent metrics.** One icon set/size (`componentSizes.icon`), consistent button heights (`componentSizes.button`) and card padding. Touch density comfortable, not cramped.

### Imagery, icons & states polish
18. **Crisp vector icons.** Ionicons at `componentSizes.icon` sizes. Avatars fall back to initials (AppAvatar).
19. **Five states, polished.** Skeletons match the final layout; empty states use a friendly icon + one CTA (AppEmptyState). Loading / disabled / pressed states are visibly distinct (see `screen-development.md`).

### Motion as polish
20. **Subtle and fast.** Transitions are purposeful and brief (`animation.duration`); respect reduce-motion. Details defer to `animation-haptics.md`.

### Dark-mode & scaling readiness
21. **Theme-safe.** Never hardcode colors — token-only so theming stays possible. Layouts must survive Dynamic Type and long strings without clipping (see `localization-i18n.md`).

## Pattern
```tsx
import { AppCard, AppText, AppButton, AppBadge } from '@components'
import { YStack, XStack } from 'tamagui'
import { spacing, colors } from '@constants/tokens'

// Hierarchy + spacing + shadow via tokens — one focal action
<AppCard elevation="base" padding={spacing[4]}>
  <YStack gap={spacing[2]}>
    <AppText variant="h3">{t('payout.title')}</AppText>
    <AppText variant="body" color={colors.textSecondary}>{t('payout.subtitle')}</AppText>
    <AppButton variant="primary" onPress={onPay}>{t('payout.cta')}</AppButton>
  </YStack>
</AppCard>

// Semantic color + badge (meaning, not decoration)
<XStack ai="center" jc="space-between">
  <AppText variant="body">{t('invoice.status')}</AppText>
  <AppBadge tone="success">{t('status.paid')}</AppBadge>
</XStack>
```

## Definition of Done (Review checklist)
- [ ] One clear focal point; single dominant filled-primary action, others subdued
- [ ] Hierarchy via `AppText` variants — no invented font sizes; ≤ ~3 sizes/screen; body ≥ 16
- [ ] All spacing/padding/gaps from `spacing` (4/8pt); one consistent screen padding; grouping by proximity, no card-in-card
- [ ] 60/30/10 respected; semantic colors only for meaning; text on tints ≥ 4.5:1; no `#000` fills; zero off-token hex
- [ ] Elevation from `shadows` tokens; one step between layers; border OR shadow, not both; consistent `borderRadius`
- [ ] Reused base components; consistent icon/button/card metrics
- [ ] Skeleton matches layout; empty/loading/disabled/pressed states polished and distinct
- [ ] Token-only colors (theme-safe); layout survives Dynamic Type + long strings

## Common violations → findings
- Hardcoded hex/px instead of tokens → **MAJOR**
- 5+ font sizes on one screen / invented sizes → **MAJOR** (hierarchy)
- Two competing primary buttons → **MAJOR**
- Off-token / `#000` large fill, or text on tint < 4.5:1 → **MAJOR**
- Inconsistent screen padding → **MINOR**
- Card-in-card / double elevation (border + heavy shadow) → **MINOR**
- Inconsistent icon/button sizes across similar elements → **MINOR**
- Skeleton that doesn't match final layout → **MINOR**
