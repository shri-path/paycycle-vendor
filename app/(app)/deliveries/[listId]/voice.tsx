/**
 * Voice Command route — /(app)/deliveries/[listId]/voice (US-013).
 * Thin wrapper rendering VoiceCommandScreen. listId is available
 * via useLocalSearchParams() inside the screen.
 */

import VoiceCommandScreen from '@modules/voice/screens/VoiceCommandScreen'

export default function VoiceCommandRoute() {
  return <VoiceCommandScreen />
}
