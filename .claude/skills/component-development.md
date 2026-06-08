# Skill 01 — Component Development (MANDATORY)

Build reusable, presentational UI components. Components are **dumb**: no API calls, no store access, no business logic. Data and callbacks come in via props.

## When to use
Creating or modifying anything in `src/components/` — `primitives/`, `layout/`, or `composite/`.

## Rules
1. **Reuse first.** Check `src/components/index.ts` before creating anything. There are 29+ existing components (AppText, AppButton, AppInput, AppCard, AppPhoneInput, AppEmptyState, AppBottomSheet, AppConfirmDialog, …). Extend props before forking a new component.
2. **Three layers**: `primitives/` (atomic — AppText, AppButton), `layout/` (structural — AppHeader, AppListItem), `composite/` (multi-part — AppBottomSheet, AppEmptyState). Put the file in the right folder and export it from `src/components/index.ts`.
3. **No business logic.** No `fetch`/`axios`, no `useStore`, no navigation. Accept `value`, `onPress`, `onChange`, etc. as props.
4. **Strong typing.** Export a `XxxProps` interface. No `any`. Document each prop with a JSDoc comment.
5. **Tokens only — never hardcode.** Import from `@constants/tokens` (`colors`, `spacing`, `borderRadius`, `fontSize`, `componentSizes`, `animation`, `interaction`). No raw hex or magic pixel numbers.
6. **Styles built once.** Use `StyleSheet.create` at module scope (like `AppButton`) with token values — never recreate style objects inline on every render.
7. **Touch targets ≥ 44×44.** Use `componentSizes.button.md`/`interaction.minTouchTarget`; add `hitSlop` for small tappables.
8. **Accessibility props.** Every interactive element gets `accessibilityRole` + `accessibilityLabel`; expose a `testID` prop.
9. **Purpose header.** Every file starts with a `/** ComponentName — purpose + usage */` comment (project convention).
10. **No user-facing literals.** Components receive already-translated strings via props (the screen calls `t()`), or render only what's passed in.

## Pattern (follow AppButton)
```tsx
/**
 * AppExample — primitive. Purpose: ...  Usage: <AppExample label="x" onPress={fn} />
 */
import React from 'react'
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, componentSizes, interaction } from '@constants/tokens'

export interface AppExampleProps {
  /** Visible label (already translated by caller) */
  label: string
  /** Press handler */
  onPress: () => void
  disabled?: boolean
  testID?: string
}

const styles = StyleSheet.create({
  base: {
    minHeight: componentSizes.button.md,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  } as ViewStyle,
})

export const AppExample: React.FC<AppExampleProps> = ({ label, onPress, disabled, testID }) => (
  <TouchableOpacity
    style={styles.base}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={interaction.activeOpacity}
    hitSlop={interaction.defaultHitSlop}
    accessibilityRole="button"
    accessibilityLabel={label}
    testID={testID}
  >
    <AppText variant="label" color={disabled ? colors.gray400 : colors.textPrimary}>{label}</AppText>
  </TouchableOpacity>
)

export default AppExample
```

## Definition of Done (Review checklist)
- [ ] No duplicate of an existing component; placed in correct layer folder
- [ ] Exported from `src/components/index.ts`
- [ ] No API/store/navigation/business logic inside the component
- [ ] `XxxProps` interface exported, fully typed, JSDoc'd; no `any`
- [ ] All colors/spacing/sizes come from `@constants/tokens` — zero hardcoded hex/px
- [ ] Styles created at module scope, not inline per render
- [ ] Interactive elements ≥ 44×44, `accessibilityRole` + `accessibilityLabel` + `testID` present
- [ ] Purpose header comment present

## Common violations → findings
- Hardcoded `#075E54` / `padding: 16` → MAJOR (use tokens)
- `useAuthStore()` or `axios` inside a component → CRITICAL (logic belongs in store/service)
- Missing `accessibilityLabel` on a touchable → MAJOR
- New `AppXButton` duplicating `AppButton` → MAJOR (reuse)
