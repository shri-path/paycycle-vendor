# Skill 11 — Performance Optimization (MANDATORY)

Target device: 2GB-RAM Android, Android 8+, 2G/3G. Design for the floor.

## When to use
Every list, every screen, every store subscription; a final pass before feature completion.

## Rules
1. **FlatList for any list > 10 items** — never `.map()` inside a `ScrollView` for dynamic data. Tune: `windowSize={5}`, `maxToRenderPerBatch={10}`, `initialNumToRender`, `removeClippedSubviews` (Android), and a stable `keyExtractor`.
2. **Stable callbacks/data** — `renderItem` and `onPress` via `useCallback`; don't pass new inline arrays/objects/functions to `FlatList` each render.
3. **Memoize** list items with `React.memo`; expensive derivations with `useMemo`.
4. **Zustand selectors** — subscribe to focused slices via `useShallow`; never subscribe to the whole store (causes re-render on any change).
5. **No inline style/object creation in render hot paths** — use module-scope `StyleSheet.create` (see `component-development.md`).
6. **Images** — `expo-image` with sized sources; release/cache appropriately; never load full-res into a list cell.
7. **Unmount off-screen** — don't keep all tabs mounted; lazy-load heavy screens (Expo Router does route-level splitting).
8. **Network** — delta sync, gzip, 10s read / 30s write timeouts, exponential backoff, `AbortController` on unmount (see `api-integration.md`).
9. **Bundle** — dynamic-import heavy libs (charts, date pickers); tree-shake.
10. **Measure** — verify smooth scroll at 100+ items and no OOM at 500+ (QA).

## Pattern
```tsx
const renderItem = useCallback(({ item }: { item: Customer }) => <CustomerCard customer={item} />, [])
const keyExtractor = useCallback((c: Customer) => c.id, [])

<FlatList
  data={customers}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  windowSize={5}
  maxToRenderPerBatch={10}
  initialNumToRender={10}
  removeClippedSubviews
/>

const CustomerCard = React.memo(({ customer }: { customer: Customer }) => { /* ... */ })
```

## Definition of Done (Review checklist)
- [ ] Lists > 10 items use a tuned `FlatList` (windowSize/batch/keyExtractor)
- [ ] `renderItem`/handlers memoized; no new inline props each render
- [ ] List items `React.memo`'d; heavy derivations `useMemo`'d
- [ ] Store reads use `useShallow` focused selectors
- [ ] No inline style object creation in hot paths
- [ ] Images sized/optimized; requests cancellable; timeouts/backoff set

## Common violations → findings
- `.map()` of dynamic data in a `ScrollView` → CRITICAL (perf on low-end)
- Whole-store subscription → MAJOR
- Inline `renderItem={({item}) => ...}` recreated each render → MAJOR
- Untuned FlatList → MAJOR
