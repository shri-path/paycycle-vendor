/**
 * Message Templates route — /(app)/settings/message-templates (US-013).
 * Thin wrapper. Owner-only — useRequireOwner() enforced inside the screen.
 */

import MessageTemplatesScreen from '@modules/voice/screens/MessageTemplatesScreen'

export default function MessageTemplatesRoute() {
  return <MessageTemplatesScreen />
}
