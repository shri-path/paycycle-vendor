/**
 * Language Settings route — /(app)/settings/language (US-013).
 * Thin wrapper. Available to both owner and staff (no role guard).
 */

import LanguageSettingsScreen from '@modules/voice/screens/LanguageSettingsScreen'

export default function LanguageSettingsRoute() {
  return <LanguageSettingsScreen />
}
