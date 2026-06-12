/**
 * Mark Leave route — /(app)/deliveries/mark-leave (US-006).
 * Thin wrapper rendering MarkLeaveScreen (owner + staff with mark_leaves).
 */

import MarkLeaveScreen from '@modules/delivery/screens/MarkLeaveScreen'

export default function MarkLeaveRoute() {
  return <MarkLeaveScreen />
}
