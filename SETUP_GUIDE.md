# Deli Vendor App - Setup Guide

## Project Overview

**Deli Vendor** is a production-grade React Native mobile application designed for daily vendors in tier 2-3 cities. Built with TypeScript, Tamagui, React Navigation, and Zustand, it provides an intuitive WhatsApp-like interface for managing customers, ledgers, and collections.

---

## Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript (Strict Mode)
- **UI Library**: Tamagui
- **Navigation**: React Navigation
- **State Management**: Zustand
- **Offline DB**: WatermelonDB (ready to integrate)
- **Realtime**: Socket.IO (ready to integrate)
- **Localization**: i18n-js (English, Hindi)
- **HTTP Client**: axios

---

## Project Structure

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
│   ├── utils/               # Utility functions (future)
│   ├── types/               # TypeScript type definitions
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

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run on Development Server

```bash
# Expo Go (mobile emulator)
npm run android
npm run ios

# Web browser
npm run web
```

### 3. Build for Production

```bash
# Android
npx eas build --platform android

# iOS (requires Mac)
npx eas build --platform ios
```

---

## Development Guide

### Architecture Rules

1. **Separation of Concerns**
   - UI Components: `src/components/`
   - Business Logic: `src/modules/`
   - State: `src/store/`
   - API: `src/services/`
   - Database: `src/db/`

2. **DRY Principle**
   - Use reusable components everywhere
   - No duplicated UI or logic
   - Shared hooks for common logic

3. **Modular Features**
   - Each feature follows:
     ```
     module/
      ├── screens/
      ├── components/
      ├── hooks/
      ├── service.ts
      ├── store.ts
      └── types.ts
     ```

### Base Components

All screens should use these reusable components:

- **Text**: `AppText` (variants: h1, h2, h3, body, caption, label)
- **Buttons**: `AppButton`, `AppSecondaryButton`, `AppDangerButton`
- **Input**: `AppInput`, `AppSelect`, `AppToggle`, `AppDatePicker`
- **Display**: `AppBadge`, `AppAvatar`, `AppBadge`
- **Containers**: `AppCard`, `AppModal`, `AppBottomSheet`
- **Navigation**: `AppHeader`, `AppBottomTabs`, `AppListItem`
- **Feedback**: `AppAlert`, `AppLoader`, `AppProgressBar`

### Translation Usage

```typescript
import { useTranslation } from '@hooks/useTranslation'

const { t } = useTranslation()

<AppButton label={t('ledger.add_credit')} />
```

### State Management

```typescript
import { useAppStore } from '@store/appStore'

const { language, setLanguage, isOnline } = useAppStore()
```

### API Calls

```typescript
import { customerService, ledgerService } from '@services/api.service'

// In mock mode (development)
const customers = await customerService.getAll()

// In real mode (production) - replace with actual implementation
```

---

## Design System

### Colors (Trust Green Theme)

- **Primary**: #075E54
- **Secondary**: #128C7E
- **Accent**: #25D366
- **Success**: #10B981
- **Error**: #DC2626
- **Warning**: #F59E0B
- **Background**: #F0F2F5
- **Surface**: #FFFFFF
- **Text Primary**: #111B21
- **Text Secondary**: #667781

### Typography

- **H1**: 30px, 700 weight, 42px line-height
- **H2**: 24px, 700 weight, 36px line-height
- **H3**: 20px, 600 weight, 30px line-height
- **Body**: 16px, 400 weight, 24px line-height
- **Label**: 14px, 500 weight, 20px line-height
- **Caption**: 12px, 400 weight, 16px line-height

### Spacing Scale

0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64, 80, 96 (in pixels)

---

## Code Quality

### TypeScript Strict Mode

All files use strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Naming Conventions

- Components: `PascalCase` (e.g., `AppButton`, `HomeScreen`)
- Functions/Variables: `camelCase` (e.g., `handlePress`, `isLoading`)
- Files: Match component name (e.g., `AppButton.tsx`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS = 50`)

### Code Comments

Every file should include:

```typescript
/**
 * File Purpose
 * Brief description of what this file does
 *
 * Usage: How to use it
 */
```

---

## Development Workflow

### Phase 1: App Base (CURRENT)

✅ Completed:
- Project structure
- TypeScript configuration
- Tamagui theme & design tokens
- Base components (11 components)
- Navigation setup
- Zustand store
- i18n localization
- Mock API service
- Sample screens

### Phase 2: Feature Development (NEXT)

To implement a feature:

1. Create feature folder: `src/modules/{featureName}`
2. Create screens, components, and service
3. Add translations
4. Create Zustand store for feature
5. Implement with mock API
6. Test thoroughly

---

## Mock Mode

By default, the app runs in **mock mode** (`REACT_APP_API_MODE=mock`).

### Mock Data Characteristics

- Realistic tier 2-3 vendor data
- Hindi text for testing
- Simulated network delay (500ms)
- Sample customers, ledger entries, and vendor profile

### Switching to Real API

1. Update `src/services/config.ts`:
   ```typescript
   export const API_MODE = 'real'
   ```

2. Replace mock implementations in `src/services/api.service.ts` with actual API calls

---

## Offline-First Strategy

Ready for implementation:

1. **WatermelonDB**: Local-first database
   - Write → Local DB first
   - Mark records as `pending_sync`
   - Background sync to server

2. **Socket.IO**: Real-time updates
   - Listen for `ledger:update`, `customer:update`
   - Merge updates into local DB

---

## Common Tasks

### Add a New Translation

1. Edit `src/locales/en.json` and `src/locales/hi.json`
2. Use in component:
   ```typescript
   const { t } = useTranslation()
   <AppText>{t('namespace.key')}</AppText>
   ```

### Add a New Component

1. Create file: `src/components/AppNewComponent.tsx`
2. Export in `src/components/index.ts`
3. Use in screens: `import { AppNewComponent } from '@components/index'`

### Add a New Screen

1. Create file: `src/screens/NewScreen.tsx`
2. Add to navigation: `src/App.tsx`
3. Add translations for screen labels

### Add Global State

1. Create store: `src/store/featureStore.ts`
2. Export hook
3. Use in components: `const { state } = useFeatureStore()`

---

## Performance Optimization

- ✅ FlatList for large lists
- ✅ Component memoization (todo: implement where needed)
- ✅ Avoid unnecessary re-renders
- ✅ Optimize network requests

---

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run android
```

### TypeScript Errors

- Check strict mode is enabled
- Hover over error for quick fix
- Run `tsc --noEmit` to see all errors

### App Crashes

- Check console logs: `expo logs`
- Enable debug mode in store
- Check mock data structure

---

## Next Steps

1. **Phase 2 Features**:
   - Ledger Management
   - Customer Management
   - Collection Tracking
   - Reports & Analytics

2. **Integration**:
   - Connect to real backend API
   - Implement WatermelonDB
   - Setup Socket.IO real-time sync
   - Add authentication

3. **Polish**:
   - Add more UI components
   - Implement animations
   - Add comprehensive error handling
   - Optimize performance

---

## Resources

- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Tamagui](https://tamagui.dev)
- [Zustand](https://github.com/pmndrs/zustand)
- [Expo Docs](https://docs.expo.dev)

---

## Support

For issues or questions:
- Check the [claude.md](../vendor/claude.md) guidelines
- Review component examples in `src/components/`
- Check mock data in `src/services/mocks/`

---

**Created**: April 2024
**Version**: 1.0.0
**Status**: Phase 1 Complete ✅
