/**
 * App Root Route
 * Entry point for Expo Router - delegates to React Navigation in src/App.tsx
 * This file is required by Expo Router even though we're using React Navigation
 */

import { redirect } from 'expo-router'

export default function Index() {
  // Expo Router requires an index file, but our app uses React Navigation
  // which is already set up in app/_layout.tsx -> src/App.tsx
  // This component never renders because the layout handles all rendering
  return null
}
