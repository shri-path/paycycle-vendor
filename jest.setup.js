/**
 * Jest setup file
 * Purpose: Global mocks for native modules that require native binary registration
 */

// Mock react-native-localize — requires native binary; always return English defaults in tests
jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageTag: 'en', languageCode: 'en', isRTL: false, countryCode: 'US', scriptCode: undefined }],
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
  getCalendar: () => 'gregorian',
  getCountry: () => 'US',
  getCurrencies: () => ['USD'],
  getTemperatureUnit: () => 'celsius',
  getTimeZone: () => 'UTC',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  findBestAvailableLanguage: jest.fn(() => ({ languageTag: 'en', isRTL: false })),
}))

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
