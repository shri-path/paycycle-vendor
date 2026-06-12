/**
 * Invoice detail route — /(app)/subscription/invoices/[invoiceId] (US-009).
 * Owner-only; screen enforces `useRequireOwner` defence-in-depth.
 * The invoiceId param is read inside InvoiceDetailScreen via useLocalSearchParams.
 */

import InvoiceDetailScreen from '@modules/subscription/screens/InvoiceDetailScreen'

export default function InvoiceDetailRoute() {
  return <InvoiceDetailScreen />
}
