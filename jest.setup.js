/**
 * Jest setup file
 * Purpose: Global mocks for native modules that require native binary registration
 */

// Mock expo-localization — requires native binary; always return English defaults in tests
jest.mock('expo-localization', () => ({
  getLocales: () => [
    {
      languageTag: 'en',
      languageCode: 'en',
      regionCode: 'US',
      textDirection: 'ltr',
      currencyCode: 'USD',
      decimalSeparator: '.',
      digitGroupingSeparator: ',',
      measurementSystem: 'metric',
    },
  ],
  getCalendars: () => [{ calendar: 'gregorian', timeZone: 'UTC', uses24hourClock: true }],
}))

// Mock tamagui layout primitives — the real components require a runtime
// createTamagui config + <TamaguiProvider>, which isn't set up in unit tests.
// Map the stacks to plain RN Views so screens render in isolation.
jest.mock('tamagui', () => {
  const React = require('react')
  const { View, ScrollView: RNScrollView } = require('react-native')
  const passthrough = (name) => {
    const Comp = ({ children, ...props }) => React.createElement(View, props, children)
    Comp.displayName = name
    return Comp
  }
  // styled(Component, config) returns a passthrough that renders the wrapped
  // component — the real implementation needs a createTamagui runtime config.
  const styled = (Component, _config) => {
    const Styled = ({ children, ...props }) => React.createElement(Component, props, children)
    Styled.displayName = 'Styled'
    return Styled
  }
  return {
    YStack: passthrough('YStack'),
    XStack: passthrough('XStack'),
    Stack: passthrough('Stack'),
    ScrollView: ({ children, contentContainerStyle: _ccs, ...props }) =>
      React.createElement(RNScrollView, props, children),
    styled,
  }
})

// Mock axios globally to prevent the fetch-adapter crash in Node.js test environment
// (expo's virtual streams polyfill + axios fetch adapter are incompatible in tests)
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  }
  const mockAxios = {
    create: jest.fn(() => mockAxiosInstance),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    isAxiosError: jest.fn((err) => err?.isAxiosError === true),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  }
  return { default: mockAxios, ...mockAxios }
})
