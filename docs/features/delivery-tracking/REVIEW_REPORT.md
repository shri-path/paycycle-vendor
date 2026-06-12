# Code Review Report: US-006 Daily Delivery Tracking

## Summary
- **Date**: 2026-06-12
- **Reviewer**: Review Agent
- **Feature Plan**: `docs/features/delivery-tracking/FEATURE_PLAN.md`
- **Overall Assessment**: REJECTED — Changes Required

---

## Statistics

| Severity | Count |
|----------|-------|
| BLOCKER  | 0     |
| CRITICAL | 2     |
| MAJOR    | 11    |
| MINOR    | 4     |
| INFO     | 1     |

---

## Findings

### CRITICAL-1: `MarkLeaveScreen` and `AddExtraChargeScreen` have no Loading state — show misleading empty state during fetch

- **File**: `src/modules/delivery/screens/MarkLeaveScreen.tsx`, `src/modules/delivery/screens/AddExtraChargeScreen.tsx`
- **Skill Violated**: `screen-development.md` — "All 5 states implemented: Loading (skeleton), Empty, Error, Populated, Offline"; "Missing skeleton / shows spinner → CRITICAL"
- **Description**: Neither `MarkLeaveScreen` nor `AddExtraChargeScreen` reads `isListLoading` from the delivery store. On first mount — before `fetchListDeliveries` has resolved — `listDeliveries` is `{}` (or an empty array for the selected list). Both screens immediately fall through to the empty state (`t('delivery.empty_customers')` / `t('delivery.no_delivery_to_charge')`). A user sees "No customers found" or "Mark a delivery first" while the data is still loading. This is a correctness bug and a UX violation; the 5-state requirement mandates a skeleton loading state be shown until data is ready.
- **Expected**: Both screens must select `isListLoading` (or a per-list loading flag) from the store and render a skeleton while `isListLoading === true && listDeliveries[listId]` is not yet populated.
- **Suggestion**:
  ```tsx
  // In MarkLeaveScreen (and AddExtraChargeScreen equivalently)
  const { listDeliveries, isListLoading, ... } = useDeliveryStore(useShallow(s => ({
    listDeliveries: s.listDeliveries,
    isListLoading: s.isListLoading,
    // ...
  })))

  if (isListLoading && !listDeliveries[selectedListId]?.length) {
    return <CustomerListSkeleton />  // 3-4 row skeleton matching customer card shape
  }
  ```

---

### CRITICAL-2: `deliveryService` not exported from barrel export

- **File**: `src/services/api.service.ts`
- **Skill Violated**: `api-integration.md` — "Added to barrel export in `api.service.ts`"
- **Description**: `deliveryService` is instantiated and used within the delivery module but is never exported from `src/services/api.service.ts`. The barrel currently exports `ledgerService`, `customerService`, `vendorService`, `authService`, `rolesService`, and `supplyListsService`. Any cross-module consumer or integration test that imports from the barrel cannot access `deliveryService`, breaking the standard import contract.
- **Expected**: `api.service.ts` must export `deliveryService` alongside the other services.
- **Suggestion**:
  ```ts
  // src/services/api.service.ts
  export { deliveryService } from '@modules/delivery/service/delivery.service'
  // or add to the existing named exports object if the barrel uses a different pattern
  ```

---

### MAJOR-1: Loading state uses hourglass `AppEmptyState` instead of skeleton layout in four screens

- **File**: `src/modules/delivery/screens/QuickMarkScreen.tsx`, `src/modules/delivery/screens/TodayOverviewScreen.tsx`, `src/modules/delivery/screens/CalendarScreen.tsx`, `src/modules/delivery/screens/DayDetailScreen.tsx`
- **Skill Violated**: `screen-development.md` — "Skeleton loading used — NOT full-screen spinner"; "Skeleton matches populated layout shape"; `ui-visual-design.md` — "Skeleton matches final layout"
- **Description**: All four screens render `<AppEmptyState icon="hourglass-outline" message={t('common.loading')} />` as their loading state. This is a spinner/placeholder pattern, not a skeleton. The FEATURE_PLAN explicitly requires skeleton layouts for each screen (e.g. a card outline for QuickMark, summary box + list rows for TodayOverview, a month-grid outline for Calendar, a section-list outline for DayDetail). Note: `DeliveryListScreen` correctly implements a skeleton and should be used as the reference.
- **Expected**: Each screen's loading state must render placeholder boxes that match the populated layout's shape: same number of rows, same approximate heights, using `AppSkeletonBox` or equivalent animated shimmer components.
- **Suggestion**: Model after `DeliveryListScreen`'s `skeletonRow` pattern. For `TodayOverviewScreen`, render 2-3 summary-card skeletons. For `CalendarScreen`, render a 7×5 grid of 36×36 rounded skeleton boxes. For `DayDetailScreen`, render 2 section headers + 3-4 row skeletons.

---

### MAJOR-2: `TodayOverviewScreen` FlatList missing performance props; `keyExtractor` not memoized

- **File**: `src/modules/delivery/screens/TodayOverviewScreen.tsx`
- **Skill Violated**: `performance-optimization.md` — "FlatList uses `windowSize={5}`, `maxToRenderPerBatch`, `removeClippedSubviews`"; "List items wrapped in `React.memo`"; "`useCallback` on event handlers passed to memoized children"
- **Description**: The FlatList rendering `byList` rows lacks `windowSize`, `maxToRenderPerBatch`, and `removeClippedSubviews`. The `keyExtractor` prop is an inline arrow function, not wrapped in `useCallback`. On a low-end device rendering 10+ lists this causes unnecessary re-renders on every parent state change.
- **Expected**: All FlatLists must include the full performance tuning set.
- **Suggestion**:
  ```tsx
  const keyExtractor = useCallback((item: TodayListDto) => item.listId, [])

  <FlatList
    data={today.byList}
    keyExtractor={keyExtractor}
    renderItem={renderItem}
    windowSize={5}
    maxToRenderPerBatch={10}
    removeClippedSubviews
    ...
  />
  ```

---

### MAJOR-3: String concatenation pattern used for translated count/revenue strings — breaks non-Latin scripts

- **File**: `src/modules/delivery/screens/TodayOverviewScreen.tsx` (renderItem counts row), `src/modules/delivery/components/DeliveryProgressHeader.tsx` (3 chips), `src/modules/delivery/screens/DayDetailScreen.tsx` (by-list row + revenue badge template literal)
- **Skill Violated**: `localization-i18n.md` — "Dynamic values use `{{interpolation}}` syntax"; `accessibility-ux.md` — "No fragment concatenation"
- **Description**: Multiple places use the pattern `{t('delivery.delivered_count')}: {count}` or template literal `` `${t('delivery.revenue_label')}: ${formatCurrency(...)}` ``. In Hindi, Tamil, Telugu and other non-Latin locales, the colon placement and word order are different; string fragment concatenation produces grammatically incorrect sentences and can cause text rendering artifacts. The i18n-js library supports ICU interpolation specifically to handle this.
- **Expected**: Every string that contains a dynamic value must use a single translation key with `{{interpolation}}` placeholders.
- **Suggestion**:
  ```json
  // en.json (and all 9 locale files)
  "delivery.delivered_count_label": "{{count}} delivered"
  "delivery.revenue_badge": "Revenue: {{amount}}"
  ```
  ```tsx
  // Usage
  t('delivery.delivered_count_label', { count: delivered })
  t('delivery.revenue_badge', { amount: formatCurrency(revenue) })
  ```

---

### MAJOR-4: `CalendarScreen` next-month button has wrong `accessibilityLabel`

- **File**: `src/modules/delivery/screens/CalendarScreen.tsx`
- **Skill Violated**: `accessibility-ux.md` — "icon-only buttons must have `accessibilityLabel`"; `accessibility-ux.md` — "focus managed on screen change and after errors"
- **Description**: The "next month" navigation icon button uses `accessibilityLabel={t('common.menu')}`. Screen readers will announce "menu" when the user focuses this button. This is actively misleading — a VoiceOver/TalkBack user will think they are opening a menu, not navigating to the next month.
- **Expected**: Icon-only buttons must use an `accessibilityLabel` that accurately describes the action.
- **Suggestion**:
  ```tsx
  // Add key to all 9 locale files:
  // "delivery.next_month": "Next month"
  // "delivery.prev_month": "Previous month"

  <IconButton
    accessibilityLabel={t('delivery.next_month')}
    accessibilityRole="button"
    onPress={goNextMonth}
    icon="chevron-forward-outline"
  />
  ```

---

### MAJOR-5: `MarkLeaveScreen` and `AddExtraChargeScreen` missing `KeyboardAvoidingView`

- **File**: `src/modules/delivery/screens/MarkLeaveScreen.tsx`, `src/modules/delivery/screens/AddExtraChargeScreen.tsx`
- **Skill Violated**: `screen-development.md` — "`KeyboardAvoidingView` on form screens"
- **Description**: Both screens contain text/numeric inputs. On Android and iOS, without `KeyboardAvoidingView`, the software keyboard will overlap the input fields and the submit button, making them unreachable on devices with smaller viewports (4.5–5 inch screens common in the target market).
- **Expected**: All form screens must wrap content in `KeyboardAvoidingView`.
- **Suggestion**:
  ```tsx
  import { KeyboardAvoidingView, Platform } from 'react-native'

  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {/* form content */}
  </KeyboardAvoidingView>
  ```

---

### MAJOR-6: `AddExtraChargeScreen` hardcodes `prefix="₹"` — i18n violation

- **File**: `src/modules/delivery/screens/AddExtraChargeScreen.tsx` (line 220)
- **Skill Violated**: `localization-i18n.md` — "Currency formatted with Indian grouping (₹1,00,000)"; `accessibility-ux.md` — "Hard-coded ₹ → MAJOR"; `localization-i18n.md` — "Every user-facing string uses `t('key')` — zero hardcoded strings"
- **Description**: The amount input renders `prefix="₹"` as a hardcoded Unicode character. Currency symbols must come from the locale/formatting layer. In a future locale switch or for RTL layouts the symbol position may differ, and a hardcoded character cannot be overridden by translation.
- **Expected**: Use a translation key for the currency prefix or derive it from `formatCurrency` / `Intl.NumberFormat`.
- **Suggestion**:
  ```tsx
  // Option A: translation key
  // "common.currency_symbol": "₹"
  prefix={t('common.currency_symbol')}

  // Option B: derive from Intl (preferred — locale-aware)
  const currencySymbol = new Intl.NumberFormat(getCurrentLanguage(), {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).formatToParts(0).find(p => p.type === 'currency')?.value ?? '₹'
  ```

---

### MAJOR-7: `TodayOverviewScreen` `onSelectConflict` always navigates to the first list, ignoring `deliveryId`

- **File**: `src/modules/delivery/screens/TodayOverviewScreen.tsx`
- **Skill Violated**: `screen-development.md` — correctness; `navigation-routing.md` — correct deep-link from conflict to delivery
- **Description**: The `onSelectConflict` callback uses `today?.byList.find(() => true)` which unconditionally returns `byList[0]`, ignoring the `deliveryId` argument passed in from `ConflictBanner`. When a vendor has multiple lists (the normal case in production), tapping any conflict always navigates to the first list, not the list that contains the conflicting delivery.
- **Expected**: Resolve the list that contains the delivery by looking up the delivery across `listDeliveries` or by matching `conflicts[n].listName` / `conflicts[n].deliveryId` against the `byList` entries.
- **Suggestion**:
  ```tsx
  const onSelectConflict = useCallback((deliveryId: string) => {
    const conflict = today?.conflicts.find(c => c.deliveryId === deliveryId)
    const list = today?.byList.find(l => l.listName === conflict?.listName)
    if (list) router.push(`/(app)/deliveries/${list.listId}`)
  }, [today, router])
  ```

---

### MAJOR-8: `DeliveryListScreen` "Completed" filter sends only `status: 'DELIVERED'` — excludes LEAVE, AUTO_MARKED, CANCELLED

- **File**: `src/modules/delivery/screens/DeliveryListScreen.tsx`
- **Skill Violated**: `api-integration.md` — API response typed; `screen-development.md` — populated state correctness
- **Description**: When the user selects the "Completed" filter tab, the screen calls `fetchListDeliveries` with `{ status: 'DELIVERED' }`. However, per the type definitions in `delivery.ts`, completed deliveries span all non-PENDING statuses: `DELIVERED | LEAVE | AUTO_MARKED | CANCELLED`. The server will return only `DELIVERED` rows, so leaves and cancelled entries are silently hidden from the completed view, causing data loss from the user's perspective.
- **Expected**: The "Completed" tab should either send no status filter (showing all non-PENDING) or send a multi-value filter if the API supports it. Alternatively, filter locally from the full result set.
- **Suggestion**: Fetch with no `status` filter for the "All / Completed" tab and apply a local filter: `deliveries.filter(d => d.status !== 'PENDING')`.

---

### MAJOR-9: `StaffHomeScreen.test.tsx` does not test new Quick Mark CTA behavior

- **File**: `src/modules/roles/screens/__tests__/StaffHomeScreen.test.tsx`
- **Skill Violated**: `testing-strategy.md` — "User interactions tested (tap, type, swipe)"; "All 5 screen states tested"
- **Description**: `StaffHomeScreen` was extended in this feature to add a Quick Mark CTA that (a) is disabled while offline and (b) navigates to the `/(app)/quick-mark` route. Neither behavior is covered by the existing tests. The test file mocks `useDeliveryToday` but has no assertions on the CTA's disabled state, its label, or its press handler navigation.
- **Expected**: Add at minimum: (1) a test asserting the Quick Mark CTA is disabled / shows offline copy when `isConnected: false`; (2) a test asserting it calls `router.push('/(app)/quick-mark')` on press when online.
- **Suggestion**:
  ```tsx
  it('disables Quick Mark CTA when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<StaffHomeScreen />)
    expect(screen.getByTestId('quick-mark-cta')).toBeDisabled()
  })

  it('navigates to quick-mark on Quick Mark CTA press', async () => {
    const screen = await render(<StaffHomeScreen />)
    fireEvent.press(screen.getByTestId('quick-mark-cta'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/quick-mark')
  })
  ```

---

### MAJOR-10: `CalendarMonthGrid` weekday headers are hardcoded English abbreviations

- **File**: `src/modules/delivery/components/CalendarMonthGrid.tsx`
- **Skill Violated**: `localization-i18n.md` — "Every user-facing string uses `t('key')` — zero hardcoded strings"; `accessibility-ux.md` — "locale-aware numbers/currency/dates"
- **Description**: `WEEKDAY_KEYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']` are hardcoded English single-letter abbreviations. Users reading in Hindi (`रवि`), Tamil (`ஞா`), or Telugu (`ఆది`) will see "S M T W T F S" headers regardless of their chosen app language.
- **Expected**: Weekday abbreviations must either be translation keys in all 9 locale files or derived from the locale using `Intl.DateTimeFormat`.
- **Suggestion**:
  ```ts
  // Derive locale-aware 2-letter abbreviations at runtime
  const getWeekdayAbbreviations = (locale: string): string[] => {
    const base = new Date(2024, 0, 7) // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(7 + i)
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
    })
  }
  ```

---

### MAJOR-11: `delivery.service.ts` does not support request cancellation via `AbortSignal`

- **File**: `src/modules/delivery/service/delivery.service.ts`
- **Skill Violated**: `api-integration.md` — "Request cancellation via `AbortSignal` supported"
- **Description**: None of the 9 service methods accept or pass an `AbortSignal` to the Axios request config. On screens where the user navigates away mid-fetch (e.g. tapping back while the calendar loads), the in-flight request continues consuming bandwidth and — when it resolves — may attempt to update store state on an unmounted component.
- **Expected**: Each service method should accept an optional `signal?: AbortSignal` parameter and pass it to Axios: `axiosInstance.get(url, { signal })`.
- **Suggestion**:
  ```ts
  async getListDeliveries(
    listId: string,
    options: ListDeliveriesOptions = {},
    signal?: AbortSignal,
  ): Promise<ListDeliveriesResultDto> {
    const { data } = await apiClient.get(APIPath.Delivery.list(listId), { params: options, signal })
    return data
  }
  ```
  Screens that call fetch on mount should create an `AbortController` and cancel in the `useEffect` cleanup.

---

### MINOR-1: `CompletedDeliveryRow` uses `alignItems: 'flex-end'` — minor RTL note

- **File**: `src/modules/delivery/components/CompletedDeliveryRow.tsx`
- **Skill Violated**: `accessibility-ux.md` — "`start`/`end` used instead of `left`/`right` (RTL readiness)"
- **Description**: The trailing column style uses `alignItems: 'flex-end'` to right-align the revenue/time chip. For RTL layouts this is semantically correct (cross-axis alignment, not inline direction), so this will not break; however, the intent is to align to the trailing edge. Using `alignSelf: 'flex-end'` on the child instead is more explicit.
- **Expected**: Low priority. No change strictly required, but `alignSelf: 'flex-end'` on the child or confirming the RTL mirror intention in a comment is preferred.

---

### MINOR-2: `CalendarScreen` missing pull-to-refresh on ScrollView

- **File**: `src/modules/delivery/screens/CalendarScreen.tsx`
- **Skill Violated**: `screen-development.md` — "Pull-to-refresh on list screens"
- **Description**: The CalendarScreen renders month data in a ScrollView without a `RefreshControl`. Users have no way to manually trigger a fresh calendar fetch without navigating away and back. All data screens should support pull-to-refresh.
- **Expected**: Add `refreshControl` to the ScrollView.
- **Suggestion**:
  ```tsx
  <ScrollView
    refreshControl={
      <RefreshControl
        refreshing={isCalendarLoading}
        onRefresh={() => fetchCalendar(currentMonth)}
      />
    }
  >
  ```

---

### MINOR-3: `QuickMarkScreen.test.tsx` covers only 3 of 5 required screen states

- **File**: `src/modules/delivery/screens/__tests__/QuickMarkScreen.test.tsx`
- **Skill Violated**: `testing-strategy.md` — "All 5 screen states tested"
- **Description**: The test suite covers: offline-blocked, content (card visible), and all-done empty state. It does not test the loading state (`isQuickLoading: true`) or the error state (`quickError` set with no queue). Although these are lower-risk paths, the testing skill mandates all 5 states are covered.
- **Expected**: Add a loading state test and an error state test.

---

### MINOR-4: `CalendarAndDay.test.tsx` and `QuickMarkScreen.test.tsx` missing loading state tests

- **File**: `src/modules/delivery/screens/__tests__/CalendarAndDay.test.tsx`, `src/modules/delivery/screens/__tests__/QuickMarkScreen.test.tsx`
- **Skill Violated**: `testing-strategy.md` — "All 5 screen states tested"
- **Description**: `CalendarScreen` has tests for content, empty, and error but no loading-state test (`isCalendarLoading: true, calendar: {}`). `DayDetailScreen` has content and empty but no loading or error tests. These gaps mean regressions in loading/error paths will not be caught automatically.
- **Expected**: Add loading-state tests for both `CalendarScreen` and `DayDetailScreen`. Add error-state test for `DayDetailScreen`.

---

### INFO-1: `TodayOverviewScreen` test for loading state queries by `t('common.loading')` text, not by skeleton testId

- **File**: `src/modules/delivery/screens/__tests__/TodayOverviewScreen.test.tsx` (line 68)
- **Skill Violated**: `testing-strategy.md` (informational) — once MAJOR-1 is fixed (hourglass replaced with skeleton), the loading-state test will need to query by skeleton `testID` rather than the "Loading..." text string, since skeletons do not display text.
- **Description**: The test `expect(screen.getByText(t('common.loading'))).toBeTruthy()` will break after the skeleton is introduced. This is not a current bug but a pre-emptive note so Dev updates the test when fixing MAJOR-1.
- **Expected**: After MAJOR-1 is resolved, update the loading test to use `getByTestId('today-skeleton')` or equivalent.

---

## Skill Compliance Summary

| Skill                      | Status | Notes |
|---------------------------|--------|-------|
| component-development.md  | PASS   | All components use Tamagui styled(), React.memo, displayName, proper accessibility props |
| screen-development.md     | FAIL   | CRITICAL-1: missing loading state in MarkLeave+AddExtraCharge; MAJOR-1: hourglass instead of skeleton in 4 screens; MAJOR-5: no KeyboardAvoidingView; MAJOR-7: onSelectConflict bug |
| state-management.md       | PASS   | useShallow throughout; partialize limits persistence; no PII in store; clearDelivery wired |
| api-integration.md        | FAIL   | CRITICAL-2: deliveryService not in barrel; MAJOR-11: no AbortSignal support |
| offline-first.md          | PASS   | Offline guards on all write CTAs; cached data shown when offline; online-only writes per OQ-3 decision |
| navigation-routing.md     | PASS   | Routes in correct app/ directory; typed useLocalSearchParams; auth guard present; useRequireOwner on owner screens |
| performance-optimization.md | FAIL | MAJOR-2: TodayOverviewScreen FlatList missing windowSize/maxToRenderPerBatch/removeClippedSubviews and unmemoized keyExtractor |
| localization-i18n.md      | FAIL   | MAJOR-3: string concatenation in 3 files; MAJOR-6: hardcoded ₹; MAJOR-10: hardcoded weekday abbreviations; all 81 keys present in all 9 locales (PASS) |
| animation-haptics.md      | PASS   | Reanimated UI-thread animations; runOnJS correct; reduceMotion respected; haptics fire-and-forget; correct severity mapping |
| testing-strategy.md       | FAIL   | MAJOR-9: StaffHomeScreen missing CTA tests; MINOR-3: QuickMarkScreen missing 2 states; MINOR-4: Calendar+DayDetail missing loading/error tests |
| form-validation.md        | PASS   | Amount validated positive non-zero; comment required; inline errors shown; isMutating double-tap guard |
| accessibility-ux.md       | FAIL   | MAJOR-4: wrong accessibilityLabel on next-month button; MAJOR-3: string concatenation breaks word order; MAJOR-6: hardcoded ₹ |
| ui-visual-design.md       | FAIL   | MAJOR-1: loading states are hourglass placeholder, not skeleton matching layout shape |
| error-handling.md         | PASS   | ScreenErrorBoundary on all screens; errors mapped to i18n keys; logError with context; no stack traces; no PII in logs; rollback on failed optimistic mark |
| security-auth.md          | PASS   | JWT in SecureStore; vendorId from JWT only; clearDelivery on logout; no sensitive data logged |
| real-time-sync.md         | N/A    | Feature uses polling + manual refresh; no Socket.IO integration in this feature |
