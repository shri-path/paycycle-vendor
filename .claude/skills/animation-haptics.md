# Skill 10 — Animation & Haptics (MANDATORY)

Every interaction gives immediate feedback (visual + tactile), WhatsApp-style. Animations run at 60fps and never block the JS thread.

## When to use
Every interactive element; any transition or motion.

## Haptics rules (`expo-haptics`)
1. **Light** — button taps, toggles: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.
2. **Medium** — confirmations, primary submits, selections: `ImpactFeedbackStyle.Medium` (see LoginScreen submit).
3. **Success** — completed action: `Haptics.notificationAsync(NotificationFeedbackType.Success)`.
4. **Error** — validation/API failure: `Haptics.notificationAsync(NotificationFeedbackType.Error)`.
5. **Fire-and-forget** — call with `void`, never `await` haptics in the critical path.
6. Every interactive element triggers an appropriate haptic; destructive confirmations use Medium/Heavy.

## Animation rules
1. **Reanimated 4 / native driver** — animations run on the UI thread; never animate via `setState` in a loop.
2. **60fps** — no JS-thread work during animation; keep `renderItem` cheap.
3. **Durations** from `animation.duration` tokens (fast 150 / base 200 / slow 300). Don't hardcode ms.
4. **Meaningful motion** — staggered list entrance, shared transitions; no gratuitous motion.
5. **Respect reduce-motion** — `AccessibilityInfo.isReduceMotionEnabled()`; skip/shorten non-essential animation.
6. **Stop when backgrounded** — no animation loops running in the background.

## Pattern (follow LoginScreen.handleLogin)
```tsx
void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) // on submit
try {
  await login(phone, password)
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
} catch {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}
```

## Definition of Done (Review checklist)
- [ ] Every interactive element fires an appropriate haptic (Light/Medium)
- [ ] Success and error paths fire Success/Error notification haptics
- [ ] Haptics are `void` fire-and-forget, not awaited in the hot path
- [ ] Animations use Reanimated/native driver, durations from tokens
- [ ] Reduce-motion respected; no background animation loops

## Common violations → findings
- Button with no haptic feedback → MAJOR
- `await Haptics...` blocking navigation → MAJOR
- Hardcoded `duration: 250` → MINOR (use tokens)
- JS-thread `setInterval` animation → MAJOR (perf/jank)
