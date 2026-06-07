/**
 * Global Web Focus Border
 *
 * Purpose: Apply a single, consistent lighter-green focus border to EVERY
 * clickable / actionable element on web (buttons, icon buttons, links,
 * selects, date pickers, country-code button, list/menu items, etc.) and
 * remove the default browser outline. No glow — it matches the clean border
 * the inputs show via `useFocusRing`, so the focus treatment is identical
 * across inputs and clickables on every platform.
 *
 * Why global CSS instead of per-component props:
 * - react-native-web renders Touchables/Pressables as focusable elements with
 *   `tabindex` (which is why the default UA outline appears). One stylesheet
 *   keyed off `[tabindex]` + interactive ARIA roles covers all of them, plus
 *   any future clickable component, with zero per-component wiring (DRY).
 * - Native text inputs (<input>/<textarea>) do NOT receive a `tabindex` from
 *   RNW, so they are intentionally excluded here — their focus border is handled
 *   on the wrapper by `useFocusRing` (avoids a doubled ring).
 *
 * Buttons have no real border to recolour, so the lighter-green border is drawn
 * as a crisp (blur-free) box-shadow ring that hugs the element's own radius.
 *
 * We key off `:focus` (not `:focus-visible`) so it shows on any focus — mouse
 * click or keyboard — matching the inputs. The border animates in via the
 * box-shadow transition.
 *
 * This module is a no-op off the web (guarded by `document` existence).
 */

import { colors, animation, borderWidth } from '@constants/tokens'

const STYLE_ELEMENT_ID = 'paycycle-web-focus-ring'

// Crisp, blur-free ring that reads as a border, drawn from the shared focus
// token so it matches the input focus border exactly.
const ring = (color: string) => `0 0 0 ${borderWidth.medium}px ${color}`

const css = `
[tabindex]:focus,
[role="button"]:focus,
[role="link"]:focus,
[role="menuitem"]:focus,
[role="tab"]:focus,
[role="switch"]:focus,
[role="checkbox"]:focus,
[role="radio"]:focus,
a:focus,
button:focus {
  outline: none !important;
  box-shadow: ${ring(colors.focusBorder)} !important;
  transition: box-shadow ${animation.duration.base}ms ease-out;
}

/* Clickable elements inside an error field show the error-tinted border. */
[aria-invalid="true"] [tabindex]:focus,
[aria-invalid="true"][tabindex]:focus {
  box-shadow: ${ring(colors.focusBorderError)} !important;
}
`

/**
 * Injects the global focus-ring stylesheet once. Safe to call on every
 * platform/import — it does nothing when there is no DOM (native / SSR).
 */
export function installWebFocusRing(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ELEMENT_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ELEMENT_ID
  style.textContent = css
  document.head.appendChild(style)
}

export default installWebFocusRing
