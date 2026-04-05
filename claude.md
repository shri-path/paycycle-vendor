# Mobile App Development for Vendor App (React Native + Tamagui)

## Context

You are building a production-grade Android + iOS mobile application using React Native (TypeScript).
The product is a **daily operating system for recurring local vendors**, designed for **non-tech users from tier 2–3 cities**.

The UX must feel familiar and intuitive, inspired by **WhatsApp**:

* Clean layout
* Chat-style interactions (ledger entries)
* Minimal typing
* High readability

---

## Inputs (Strictly Follow)

You MUST strictly implement based on:

1. `../project_documents/vendor_app/wireframes/` → UI layouts & screen structure
2. `../project_documents/vendor_app/user_stories/` → behavior & flows
3. `../project_documents/vendor_app/features/` → functional requirements

Do NOT invent new flows unless required for completeness.

### Domain & Product Knowledge

Always reference these sources for domain understanding:
- **Features**: `../project_documents/vendor_app/features/` - Feature specifications and requirements
- **Wireframes**: `../project_documents/vendor_app/wireframes/` - Screen designs and layout references
- **User Stories**: `../project_documents/vendor_app/user_stories/` - User flows and behavioral expectations

Ask for clarification if documentation is unclear or incomplete.

---

## Development Approach (Phased)

### Phase 1: App Base & Common Components (First)

Before implementing any feature, build the foundation:

1. **Project structure** - Folder hierarchy, TypeScript config, aliases
2. **Base Components** (from wireframes analysis):
   - **Form Inputs**: AppInput, AppSelect/Dropdown, AppDatePicker, AppToggle, AppCheckbox, AppRadio
   - **Buttons & Actions**: AppButton, AppNumberPad (numeric keyboard)
   - **Text & Display**: AppText, AppBadge, AppAvatar
   - **Containers**: AppCard, AppModal/BottomSheet, AppEmptyState
   - **Lists & Navigation**: AppListItem, AppHeader (with back/menu/notifications), AppBottomTabs
   - **Feedback**: AppAlert/Banner, AppConfirmDialog, AppLoader, AppProgressBar
   - **Layout**: AppDivider, AppSearchBar
3. **Design tokens** - Colors, typography, spacing from Tamagui
4. **Navigation setup** - React Navigation stack/drawer with bottom tab navigator
5. **Theme provider** - Light/dark mode support (if needed)
6. **Localization setup** - Translation system with en.json & hi.json
7. **Store setup** - Zustand configuration and shared stores
8. **Mocking infrastructure** - Mock service layer for API calls

**Deliverable**: A working app shell with all base components, navigation structure, and no features.

---

### Phase 2: Feature Development (One at a Time)

Once base is ready, develop features sequentially:

1. Identify feature from `../project_documents/vendor_app/features/`
2. Review wireframes in `../project_documents/vendor_app/wireframes/`
3. Check user stories in `../project_documents/vendor_app/user_stories/`
4. Implement:
   - Feature screens & components
   - Feature-specific store (Zustand)
   - Feature service layer (with mocks initially)
   - Feature translations
5. Test & verify against wireframes and user stories
6. Move to next feature

**Order**: Determined by dependency and priority (to be confirmed from features documentation).

---

## Service Architecture (Modular)

### API Service Organization

**Each module has its own service layer** following the DDD (Domain-Driven Design) pattern:

```
services/
 ├── ledger.service.ts         # Ledger operations
 ├── customer.service.ts        # Customer operations
 ├── vendor.service.ts          # Vendor/Business operations
 ├── api.service.ts             # Barrel export (index)
 ├── config.ts                  # Configuration
 └── mocks/
    ├── ledger.mock.ts
    ├── customer.mock.ts
    ├── vendor.mock.ts
    └── index.ts
```

### Service Pattern

Each service file follows a consistent pattern:

```typescript
// services/ledger.service.ts
import { isMockMode, simulateNetworkDelay } from './config'
import { mockLedgerEntries, LedgerEntry } from './mocks'

export const ledgerService = {
  getEntries: async (): Promise<LedgerEntry[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockLedgerEntries
    }
    // TODO: Replace with real API
    // return axios.get('/api/ledger').then(res => res.data)
    return []
  },
  // ... other methods
}

export default ledgerService
```

### Usage in Components/Screens

```typescript
// HomeScreen.tsx
import { ledgerService, customerService } from '@services/api.service'

const loadData = async () => {
  const entries = await ledgerService.getEntries()
  const customers = await customerService.getAll()
}
```

### Backward Compatibility

Services exported with both naming conventions:

```typescript
import { ledgerService } from '@services/api.service'
```

---

## Mocking Strategy (For Development)

### API Mocking Approach

Until backend is ready, use mock data:

```
services/
 ├── ledger.service.ts (ledger operations with mock)
 ├── customer.service.ts (customer operations with mock)
 ├── vendor.service.ts (vendor operations with mock)
 ├── api.service.ts (barrel export)
 ├── config.ts (mock/real mode switch)
 └── mocks/
    ├── ledger.mock.ts
    ├── customer.mock.ts
    ├── vendor.mock.ts
    └── index.ts
```

### Mock Implementation Pattern

```typescript
// services/mocks/ledger.mock.ts
export const mockLedgerEntries = [
  {
    id: '1',
    customerId: 'cust-1',
    amount: 500,
    type: 'credit',
    date: new Date('2024-04-01'),
    notes: 'रोज़मर्रा की दुकान'
  },
  // ... more entries
]

// services/ledger.service.ts (development mode)
import { mockLedgerEntries } from './mocks/ledger.mock'

export const ledgerService = {
  getEntries: async () => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockLedgerEntries
    }
    // TODO: Replace with real API
    return []
  }
}
```

### Switching Between Mock & Real API

Use environment-based configuration:

```typescript
// services/config.ts
const API_MODE = process.env.REACT_APP_API_MODE || 'mock' // 'mock' | 'real'

export const isMockMode = API_MODE === 'mock'
export const simulateNetworkDelay = async () => {
  if (isMockMode) {
    return new Promise(resolve => setTimeout(resolve, 500))
  }
}
```

- **Development**: Use mocks for rapid development
- **Integration testing**: Use mocks for consistency
- **Production**: Use real API endpoints

### Mock Data Characteristics

* Use realistic data from tier 2-3 vendor context
* Include Hindi text where applicable (for UI testing)
* Cover positive and edge cases
* Simulate network delays (500ms) for realistic UX testing
* Mock both success and error responses

---

## Core Tech Stack (Fixed)

* Framework: React Native (TypeScript)
* UI Library: Tamagui
* Styling: Tamagui design system (tokens only)
* Navigation: React Navigation
* State Management: Zustand
* Offline DB: WatermelonDB
* Backend: Node.js
* Database: MySQL or PostgreSQL
* Realtime: Socket.IO (WebSockets)
* Auth: Mobile Number + Password

---

## Design System (Strict Usage)

### Colors (Trust Green Theme)

* Primary: #075E54
* Secondary: #128C7E
* Accent: #25D366
* Background: #F0F2F5
* Surface: #FFFFFF
* Text Primary: #111B21
* Text Secondary: #667781

---

## Architecture Rules (Strict)

### 1. Separation of Concerns

* UI → `components/`
* Business logic → `modules/`
* State → `store/`
* API → `services/`
* DB → `db/`

---

### 2. DRY (Do Not Repeat Yourself)

* No duplicated UI or logic
* Use reusable components everywhere
* Shared hooks for common logic

---

### 3. Modular Feature Structure

Each feature must follow:

```
deli_vendor/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── AppText.tsx
│   │   ├── AppButton.tsx
│   │   ├── AppInput.tsx
│   │   ├── AppCard.tsx
│   │   ├── AppHeader.tsx
│   │   ├── AppListItem.tsx
│   │   ├── AppAlert.tsx
│   │   ├── AppLoader.tsx
│   │   ├── AppBadge.tsx
│   │   ├── AppAvatar.tsx
│   │   ├── AppDivider.tsx
│   │   └── index.ts         # Component exports
│   │
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   └── CustomersScreen.tsx
│   │
│   ├── modules/             # Feature modules (future)
│   │   ├── ledger/
│   │   ├── customers/
│   │   └── reports/
│   │
│   ├── store/               # Zustand stores
│   │   └── appStore.ts
│   │
│   ├── services/            # API services
│   │   ├── api.service.ts
│   │   ├── config.ts
│   │   └── mocks/
│   │       ├── ledger.mock.ts
│   │       ├── customer.mock.ts
│   │       ├── vendor.mock.ts
│   │       └── index.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── useTranslation.ts
│   │
│   ├── locales/             # Translations
│   │   ├── en.json
│   │   ├── hi.json
│   │   └── index.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── customer.ts
│   │   ├── vendor.ts
│   │   ├── ledger.ts
│   │   └── index.ts
│   │
│   ├── utils/               # Utility functions (future)
│   ├── db/                  # WatermelonDB setup (future)
│   ├── tamagui.config.ts    # Design tokens
│   └── App.tsx              # Root app component
│
├── app/
│   └── _layout.tsx          # Expo Router entry point
│
├── assets/                  # Images, icons
├── app.json                 # Expo configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

**Important**: Each module's `service.ts` should:
- Follow the same pattern as core services (ledger.service.ts, customer.service.ts)
- Handle mock and real API modes
- Be exported from `src/services/api.service.ts` for consistency
- Never duplicate logic from core services

---

## Reusable Components (Mandatory)

Based on comprehensive wireframe analysis from `../project_documents/vendor_app/wireframes/`

### 1. Form Inputs
* **AppInput** - Text input with label and placeholder
* **AppPhoneInput** - Phone input with country code selector
* **AppSelect/AppDropdown** - Dropdown selector (Category, Unit, Supply Type, Filter)
* **AppMultiSelect** - Multi-select checkboxes for lists
* **AppDatePicker** - Calendar date selector
* **AppDateRangeSelector** - Start & end date selection for leave/bulk operations
* **AppTimePicker** - Hour:Minute selector (HH:MM format with AM/PM)
* **AppToggle** - On/Off switch (Auto-mark, Auto-send)
* **AppCheckbox** - Individual checkbox
* **AppRadio/AppRadioGroup** - Single select radio buttons
* **AppTextArea** - Multi-line text input (Address, Notes, Templates)

### 2. Buttons & Actions
* **AppButton** - Primary action button (filled, large touch target)
* **AppSecondaryButton** - Secondary action buttons (outline style)
* **AppDangerButton** - Destructive actions (Remove, Block, Disable)
* **AppIconButton** - Small buttons with icons (Remind, Call, Block, Edit, Delete)
* **AppButtonGroup/AppSegmentedControl** - Side-by-side buttons (WhatsApp | SMS, Yes | No)
* **AppNumberPad** - Numeric keyboard interface for amounts
* **AppVoiceMicButton** - Large microphone button for voice commands

### 3. Text & Display
* **AppText** - Base text component with variants (H1, H2, H3, Body, Caption, Label)
* **AppBadge** - Status badges ([Pending], [Paid], [Active], [Delivered], [Leave])
* **AppAvatar** - User initials/profile pictures with letter
* **AppAgeingBucket** - Color-coded aging badges (🟢 0-30d, 🟡 30-60d, 🔴 60+d)
* **AppPaymentScoreRating** - Star rating display (⭐⭐⭐⭐⭐ 95%)
* **AppTag/AppChip** - Small label tags (for quick select like [Extra Milk] [Festival])
* **AppPriorityBadge** - Priority indicator (🔴 High, 🟡 Medium, 🟢 Low, 💰 Advance)

### 4. Containers & Layout
* **AppCard** - Container for list items and info boxes
* **AppListItem** - Reusable list row with nested content (customer/supply list/staff)
* **AppListItemWithActions** - List item with left/right swipe actions or action buttons
* **AppModal** - Modal dialogs with title, content, actions
* **AppBottomSheet** - Bottom sheet form (for forms and selections)
* **AppEmptyState** - Empty state screen with illustration, message, and CTA
* **AppDivider** - Horizontal section divider
* **AppSection/AppSectionHeader** - Grouped content sections with headers (April 2026, Today's Leaves)
* **AppStatsCard** - Card displaying statistics (Revenue, Deliveries, etc.)
* **AppInfoCard** - Card displaying information with multiple metrics (Outstanding Overview)
* **AppCollectionCard** - Specialized card for collection dashboard
* **AppConflictCard/AppWarningCard** - Card for displaying conflict information

### 5. Lists & Navigation
* **AppHeader** - Top bar with hamburger/back, title, notifications, more menu
* **AppBottomTabs** - Bottom navigation (Home, Lists, Customers, More for Owner; Home, My Lists, More for Staff)
* **AppSearchBar** - Search field with search icon
* **AppMenuSection** - Grouped menu items (Business, Billing, Reports, Account, Support)
* **AppMenuItem** - Individual menu item with navigation arrow

### 6. Progress & Status
* **AppProgressBar** - Linear progress bar (45/52 done, 89%)
* **AppProgressPercentage** - Percentage text with progress bar
* **AppUsageBar/AppQuotaBar** - Quota bar showing usage limits (Customers: 127/150)
* **AppCollectionProgress** - Collection progress with percentage and gap indicator
* **AppBarChart/AppSimpleChart** - Horizontal bar charts for payment mode breakdown
* **AppLineChart** - Trend line chart for collection metrics (6-month trend)
* **AppCalendar** - Calendar grid view with day status indicators (OK, --, .., !!)
* **AppCalendarLegend** - Legend for calendar status indicators
* **AppMonthSelector** - Previous/next month navigation

### 7. Timeline & Activity
* **AppTimeline** - Container for timeline items
* **AppTimelineItem** - Single timeline entry with timestamp and action
* **AppActivityLog** - Activity entry card (timestamp, action, customer, list)
* **AppReminderCard** - Reminder history card with status and response
* **AppRecentAdditionCard** - Card for recently joined customers/referrals

### 8. Feedback & Alerts
* **AppAlert/AppBanner** - Inline notifications (offline, conflicts, warnings)
* **AppErrorBanner** - Error message with red styling
* **AppSuccessMessage** - Success confirmation
* **AppConfirmDialog** - Confirmation dialog with message and actions
* **AppLoader** - Loading spinner
* **AppVoiceWaveform** - Voice recording animation with "Listening..."
* **AppCommandConfirmation** - Voice command feedback card with parsed text and confidence
* **AppOfflineBanner** - Special banner for offline mode notification
* **AppSyncIndicator** - Sync status indicator

### 9. Data & Analytics
* **AppEarningsCard** - Referral earnings display with breakdown
* **AppPlanCard** - Subscription plan information card
* **AppMonthlyBillSummary** - Itemized billing breakdown
* **AppPaymentModeSummary** - Payment mode breakdown (UPI, Cash, Bank)
* **AppTopPayersCard** - List of top payers with amounts
* **AppDefaultersCard** - List of defaulters with overdue details
* **AppTopReferrersCard** - Top referrers with referral count
* **AppRevenueBreakdown** - Revenue by supply list

### 10. Specialized Components
* **AppSwipeableCard** - Card with left/right swipe actions (Quick Mark Mode)
* **AppAddressDisplay** - Address with location details
* **AppCopyableField/AppReferralCodeField** - Field with Copy and Share buttons
* **AppImageUpload/AppImagePicker** - Logo/image upload with preview
* **AppImagePlaceholder** - Placeholder for upload (tap to add icon)
* **AppPreviewCard** - Message preview in box (invite messages, templates)
* **AppImpactSummary** - Summary of changes impact (revenue, days, leaves)
* **AppMessageTemplate/AppTemplateEditor** - Text editor with placeholders for templates
* **AppPlaceholderList** - Available placeholders reference
* **AppBenefitsList** - Bulleted benefits display (referral benefits)
* **AppQuickActionBar** - 2x2 grid or toolbar of quick action buttons
* **AppFilterChip** - Inline filter options
* **AppSuggestedValuesChip** - Quick-select value chips (Rs.2000, Rs.5000, Rs.10000)
* **AppLanguageSelector** - Multi-language radio selector (8+ languages)
* **AppVoiceToggle/AppTransliterationToggle** - Feature toggles
* **AppSettingsItem** - Settings row with toggle/input and description
* **AppSettingsDescription** - Gray descriptive text for settings
* **AppPermissionCheckbox** - Permission toggle in list
* **AppNotificationGroup** - Grouped notification preference checkboxes
* **AppChannelToggle** - Channel selection toggles (Push, WhatsApp, SMS)
* **AppBusinessCategory** - Category section grouping (🥛 Milk Vendors, 📰 Newspaper)
* **AppCategoryBadge** - Category/rank badge (#3 in area)
* **AppNoteCard** - Informational note box
* **AppLockedButton** - Disabled button with locked state
* **AppAddressField** - Flat/House entry field
* **AppQuotaTracker** - Shows used/available quota
* **AppNavigationLink** - Menu item with navigation arrow
* **AppMilestoneTracker** - Showing next milestone (e.g., "Next: 50 customers (+Rs.5000)")

---

## Features, Wireframes and user stories

* Use wireframes designed for the feature as mentioned within the folder the user_stories. Do not assume the functionality. Ask when confused.

---

## State Management (Zustand)

* Each module should have its own store
* Keep stores small and focused
* No business logic inside components

---

## Offline-First Strategy (Critical)

* All writes → local DB first (WatermelonDB)
* Mark records as `pending_sync`
* Background sync to server
* Resolve conflicts using last-write-wins (initially)

---

## Real-Time Sync

* Use Socket.IO
* Listen to:

  * `ledger:update`
  * `customer:update`
* Merge updates into local DB
* Update UI reactively

---

## Navigation

As mentioned on wireframes

---

## UX Rules (Strict)

* Tap-first UX (minimize typing)
* Use numeric keypad for amounts
* Large touch targets
* Clear confirmations
* Avoid clutter
* Support low literacy users

---

## 🌍 Internationalization (MANDATORY)

### Requirement

ALL user-facing text MUST be translatable.

---

### Rules

1. ❌ Hardcoded strings are NOT allowed
2. ✅ Use translation keys everywhere
3. ✅ Centralized translation system
4. ✅ Support multiple languages (initially: English, Hindi; extensible)

---

### Implementation Guidelines

#### Translation Structure

```
/locales/
 ├── en.json
 ├── hi.json
 └── index.ts
```

---

#### Example Translation File

```json
{
  "ledger.add_credit": "Add Credit",
  "ledger.add_payment": "Add Payment",
  "common.confirm": "Confirm"
}
```

---

#### Usage Example

```tsx
import { useTranslation } from 'hooks/useTranslation'

const { t } = useTranslation()

<AppButton label={t('ledger.add_credit')} />
```

---

### Additional Requirements

* Support runtime language switching
* Persist selected language locally
* Use fallback language if missing
* Ensure all validation/error messages are translatable
* Dates/numbers should be locale-aware

---

## Code Quality Rules

* TypeScript strict mode
* Strong typing for all APIs and models
* Each file must include clear comments:

  * Purpose
  * Inputs/Outputs
* No unused code
* No inline styles (use tokens only)

---

## Performance Rules

* Use FlatList for lists
* Memoize components where needed
* Avoid unnecessary re-renders
* Optimize large lists (ledger)

---

## Screen Development Rules

Each screen must:

1. Use only reusable components
2. Follow spacing & typography tokens
3. Not include business logic
4. Include comments explaining:

   * Purpose
   * Key interactions

---

## Expected Output from You (Claude)

### For App Base Setup:

1. Complete folder structure
2. Tamagui theme & tokens configuration
3. All base components (AppButton, AppText, etc.)
4. React Navigation stack setup
5. Translation system using i18n (en.json, hi.json, hook)
6. Zustand store setup
7. Mock service infrastructure
8. Sample mock data

### For Each Feature:

1. Folder structure within `modules/`
2. Feature screens & components
3. Reusable components (if feature-specific)
4. Zustand store (with types)
5. Service layer with mock implementations
6. Mock data files
7. Translation keys (added to locales)
8. Detailed comments explaining:
   - Screen purpose
   - Key interactions
   - Data flow
   - State management

---

## Goal

Deliver a:

* Clean
* Scalable
* Offline-first
* Multi-language
* WhatsApp-like intuitive mobile app

for local vendors with minimal technical knowledge.

---

## Important

* Prioritize simplicity over cleverness
* Prioritize usability over feature density
* Ensure consistency across all screens
* Ensure all UI text is translatable
