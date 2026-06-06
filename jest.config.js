/**
 * Jest configuration for PayCycle Vendor
 * Uses jest-expo preset which handles React Native + Expo transforms
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: [],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand|tamagui)',
  ],
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@locales/(.*)$': '<rootDir>/src/locales/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@db/(.*)$': '<rootDir>/src/db/$1',
  },
  testPathPattern: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/modules/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/mocks/**',
  ],
}
