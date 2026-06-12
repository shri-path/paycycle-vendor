/**
 * Customer Detail route — /(app)/customers/[customerId] (US-008).
 * Thin wrapper rendering CustomerDetailScreen, which reads `customerId` from the
 * route params itself via useLocalSearchParams. Accessible to both owner and
 * staff; role gating lives in the screen (RoleGate / useRole).
 */

import CustomerDetailScreen from '@modules/customers/screens/CustomerDetailScreen'

export default function CustomerDetailRoute() {
  return <CustomerDetailScreen />
}
