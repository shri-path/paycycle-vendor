/**
 * Payment History route — /(app)/customers/[customerId]/payments (US-008).
 * Thin wrapper rendering PaymentHistoryScreen, which reads `customerId` from the
 * route params itself via useLocalSearchParams. Accessible to both owner and
 * staff; role gating lives in the screen.
 */

import PaymentHistoryScreen from '@modules/customers/screens/PaymentHistoryScreen'

export default function PaymentHistoryRoute() {
  return <PaymentHistoryScreen />
}
