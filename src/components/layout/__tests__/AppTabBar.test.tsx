/**
 * AppTabBar component tests (Bottom Navigation Feature)
 * Covers: renders tabs from items, active state, offline/syncing strip,
 * tab press triggers navigation.
 *
 * Mocks reanimated (native driver), safe-area-context, expo-haptics, and
 * expo/vector-icons so the component renders without a native runtime.
 */

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => {
    const React = require('react')
    const { View } = require('react-native')
    return React.createElement(View, null, children)
  },
}))

jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: { children?: React.ReactNode; style?: unknown }) =>
        React.createElement(View, { style, ...props }, children),
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (v: number) => v,
    Easing: { out: (_fn: unknown) => _fn, cubic: 0 },
  }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AppTabBar } from '../AppTabBar'
import { t } from '@locales/index'
import { getTabsForRole } from '@modules/navigation/nav.config'

// Build a minimal navigation state cast to any to avoid fighting deeply-typed generics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockState(activeIndex: number, names: string[]): any {
  return {
    key: 'tabs-root',
    index: activeIndex,
    routes: names.map((name, i) => ({ key: `${name}-${i}`, name, params: undefined })),
    type: 'tab',
    stale: false,
    routeNames: names,
    history: [{ type: 'route', key: `${names[0] ?? 'home'}-0` }],
  }
}

const navigateMock = jest.fn()
const emitMock = jest.fn(() => ({ defaultPrevented: false }))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockNavigation: any = { navigate: navigateMock, emit: emitMock }

const ownerItems = getTabsForRole('owner')
const staffItems = getTabsForRole('staff')

describe('AppTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders 4 tabs for owner item set', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    expect(await screen.findByTestId('tab-home')).toBeTruthy()
    expect(await screen.findByTestId('tab-lists')).toBeTruthy()
    expect(await screen.findByTestId('tab-customers')).toBeTruthy()
    expect(await screen.findByTestId('tab-more')).toBeTruthy()
  })

  it('renders 3 tabs for staff item set', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['staff-home', 'my-lists', 'more'])}
        navigation={mockNavigation}
        items={staffItems}
        isOnline
        isSyncing={false}
      />,
    )
    expect(await screen.findByTestId('tab-staff-home')).toBeTruthy()
    expect(await screen.findByTestId('tab-my-lists')).toBeTruthy()
    expect(await screen.findByTestId('tab-more')).toBeTruthy()
  })

  it('shows offline strip when isOnline=false', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline={false}
        isSyncing={false}
      />,
    )
    expect(await screen.findByText(t('nav.offline'))).toBeTruthy()
  })

  it('shows syncing strip when isSyncing=true', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing
      />,
    )
    expect(await screen.findByText(t('nav.syncing'))).toBeTruthy()
  })

  it('does not show status strip when online and not syncing', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    expect(screen.queryByText(t('nav.offline'))).toBeNull()
    expect(screen.queryByText(t('nav.syncing'))).toBeNull()
  })

  it('calls navigation.navigate when a non-active tab is pressed', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    fireEvent.press(await screen.findByTestId('tab-lists'))
    expect(navigateMock).toHaveBeenCalledWith('lists')
  })

  it('does not navigate when the already-active tab is pressed', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    fireEvent.press(await screen.findByTestId('tab-home'))
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('active tab has accessibilityState.selected=true', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(1, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    const listsTab = await screen.findByTestId('tab-lists')
    expect(listsTab.props.accessibilityState?.selected).toBe(true)
    const homeTab = await screen.findByTestId('tab-home')
    expect(homeTab.props.accessibilityState?.selected).toBe(false)
  })

  it('each tab has accessibilityRole="tab"', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    const homeTab = await screen.findByTestId('tab-home')
    expect(homeTab.props.accessibilityRole).toBe('tab')
  })

  it('renders tab labels from i18n keys', async () => {
    const screen = await render(
      <AppTabBar
        state={mockState(0, ['home', 'lists', 'customers', 'more'])}
        navigation={mockNavigation}
        items={ownerItems}
        isOnline
        isSyncing={false}
      />,
    )
    expect(await screen.findByText(t('nav.tab.home'))).toBeTruthy()
    expect(await screen.findByText(t('nav.tab.lists'))).toBeTruthy()
    expect(await screen.findByText(t('nav.tab.customers'))).toBeTruthy()
    expect(await screen.findByText(t('nav.tab.more'))).toBeTruthy()
  })

  it('has displayName set for React DevTools', () => {
    expect(AppTabBar.displayName).toBe('AppTabBar')
  })

  // Regression: Expo Router keeps href:null screens in the navigator, so a custom
  // tab bar always receives the FULL route set (all 6 screens) regardless of role.
  // The bar must resolve each role item to its real route by name — not assume
  // state.index lines up with the items array. (Owner "no/!broken menu" bug.)
  describe('full navigator route set (all screens present)', () => {
    const ALL_ROUTES = ['home', 'lists', 'customers', 'staff-home', 'my-lists', 'more']

    it('owner: renders only the 4 owner tabs and none of the staff-only ones', async () => {
      const screen = await render(
        <AppTabBar
          state={mockState(0, ALL_ROUTES)}
          navigation={mockNavigation}
          items={ownerItems}
          isOnline
          isSyncing={false}
        />,
      )
      expect(await screen.findByTestId('tab-home')).toBeTruthy()
      expect(await screen.findByTestId('tab-lists')).toBeTruthy()
      expect(await screen.findByTestId('tab-customers')).toBeTruthy()
      expect(await screen.findByTestId('tab-more')).toBeTruthy()
      expect(screen.queryByTestId('tab-staff-home')).toBeNull()
      expect(screen.queryByTestId('tab-my-lists')).toBeNull()
    })

    it('owner: marks the More tab selected when its REAL route index is active', async () => {
      // 'more' is at index 5 in the full route set
      const screen = await render(
        <AppTabBar
          state={mockState(5, ALL_ROUTES)}
          navigation={mockNavigation}
          items={ownerItems}
          isOnline
          isSyncing={false}
        />,
      )
      expect((await screen.findByTestId('tab-more')).props.accessibilityState?.selected).toBe(true)
      expect((await screen.findByTestId('tab-home')).props.accessibilityState?.selected).toBe(false)
    })

    it('owner: pressing More navigates to more and emits with the real route key', async () => {
      const screen = await render(
        <AppTabBar
          state={mockState(0, ALL_ROUTES)}
          navigation={mockNavigation}
          items={ownerItems}
          isOnline
          isSyncing={false}
        />,
      )
      fireEvent.press(await screen.findByTestId('tab-more'))
      expect(navigateMock).toHaveBeenCalledWith('more')
      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tabPress', target: 'more-5' }),
      )
    })

    it('staff: marks staff-home selected when its real route index is active', async () => {
      // 'staff-home' is at index 3 in the full route set
      const screen = await render(
        <AppTabBar
          state={mockState(3, ALL_ROUTES)}
          navigation={mockNavigation}
          items={staffItems}
          isOnline
          isSyncing={false}
        />,
      )
      expect((await screen.findByTestId('tab-staff-home')).props.accessibilityState?.selected).toBe(true)
      expect(screen.queryByTestId('tab-home')).toBeNull()
    })

    it('staff: pressing My Lists navigates to my-lists with its real key', async () => {
      const screen = await render(
        <AppTabBar
          state={mockState(3, ALL_ROUTES)}
          navigation={mockNavigation}
          items={staffItems}
          isOnline
          isSyncing={false}
        />,
      )
      fireEvent.press(await screen.findByTestId('tab-my-lists'))
      expect(navigateMock).toHaveBeenCalledWith('my-lists')
      expect(emitMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tabPress', target: 'my-lists-4' }),
      )
    })
  })
})
