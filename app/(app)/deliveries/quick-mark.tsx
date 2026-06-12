/**
 * Quick Mark route — /(app)/deliveries/quick-mark (US-006).
 * Thin wrapper rendering QuickMarkScreen (staff fast-marking; owner allowed).
 */

import QuickMarkScreen from '@modules/delivery/screens/QuickMarkScreen'

export default function QuickMarkRoute() {
  return <QuickMarkScreen />
}
