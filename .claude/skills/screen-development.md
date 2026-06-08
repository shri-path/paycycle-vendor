# Skill 02 — Screen Development (MANDATORY)

Screens compose components, read state from stores via hooks, and orchestrate user flows. Every screen handles **all 5 states**.

## When to use
Building anything under `src/modules/<feature>/screens/`.

## The 5 states (ALL required, every screen)
1. **Loading** — skeleton matching the populated layout (not a full-screen spinner).
2. **Empty** — `AppEmptyState` with icon + message + single CTA.
3. **Error** — inline near field, or full-screen `AppEmptyState` with retry; message via `t(mapApiError(err))`.
4. **Populated** — normal content; `FlatList` for any list > 10 items.
5. **Offline** — cached data + offline banner (`useNetworkStatus().isConnected`).

## Rules
1. **Wrap in `ScreenErrorBoundary`.** Default-export a thin wrapper; put the screen body in a `XxxContent` component (see LoginScreen).
2. **Layout via Tamagui primitives** (`YStack`, `XStack`, `ScrollView`) with values from `@constants/tokens`. Use `SafeAreaView` (from `react-native-safe-area-context`) and `KeyboardAvoidingView` for forms.
3. **State via `useShallow` selectors.** Select only the fields you use — never subscribe to the whole store.
4. **All text through `t('key')`.** No hardcoded user-facing strings (see `localization-i18n.md`).
5. **Haptics on every action** (see `animation-haptics.md`).
6. **Double-tap protection** on submit — guard with a `useRef` flag + the store's `isLoading` (see LoginScreen `submitting.current`).
7. **Disable actions when offline** if they require the network; show the offline banner.
8. **No business logic in the screen.** Validation helpers are fine; data mutations go through the store/service.
9. **Errors:** clear local + store error at the start of an action; show `validationError ?? storeError`.

## Pattern (follow LoginScreen / src/modules/auth/screens)
```tsx
function CustomersScreenContent() {
  const { t } = useTranslation()
  const { customers, isLoading, error, fetchCustomers } = useCustomerStore(
    useShallow((s) => ({ customers: s.customers, isLoading: s.isLoading, error: s.error, fetchCustomers: s.fetchCustomers })),
  )
  const { isConnected } = useNetworkStatus()

  if (isLoading) return <CustomersSkeleton />
  if (error) return <AppEmptyState icon="alert-circle" title={t('error.title')} subtitle={t(error)} action={{ label: t('action.retry'), onPress: fetchCustomers }} />
  if (customers.length === 0) return <AppEmptyState icon="people" title={t('customers.empty_title')} action={{ label: t('customers.add_first'), onPress: goToAdd }} />

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {!isConnected ? <AppAlert type="warning" title={t('status.offline')} /> : null}
      <FlatList data={customers} keyExtractor={(c) => c.id} renderItem={renderCustomer} /* tuning: see performance-optimization.md */ />
    </SafeAreaView>
  )
}

export default function CustomersScreen() {
  return <ScreenErrorBoundary><CustomersScreenContent /></ScreenErrorBoundary>
}
```

## Definition of Done (Review checklist)
- [ ] All 5 states implemented (Loading skeleton, Empty, Error, Populated, Offline)
- [ ] Wrapped in `ScreenErrorBoundary` via `XxxContent` split
- [ ] Layout uses Tamagui primitives + tokens; `SafeAreaView` present
- [ ] Store accessed via `useShallow` selector (no whole-store subscription)
- [ ] Every user-facing string uses `t()`
- [ ] Haptics on each interactive action
- [ ] Submit guarded against double-tap
- [ ] Network-dependent actions disabled offline; offline banner shown
- [ ] No API/axios calls directly in the screen

## Common violations → findings
- Missing skeleton / shows spinner → CRITICAL (missing Loading state)
- No offline banner / not disabling network actions → CRITICAL (missing Offline state)
- Whole-store subscription `useCustomerStore()` → MAJOR (perf)
- Hardcoded string → MAJOR (i18n)
- No `ScreenErrorBoundary` → CRITICAL
