/**
 * Customers module components — barrel export (US-008).
 * Module-internal reusable components shared across the customers screens. Screens
 * import from here rather than reaching into individual files.
 */

export { PaymentStatusBadge } from './PaymentStatusBadge'
export type { PaymentStatusBadgeProps } from './PaymentStatusBadge'

export { PaymentScoreStars } from './PaymentScoreStars'
export type { PaymentScoreStarsProps } from './PaymentScoreStars'

export { CustomerListCard } from './CustomerListCard'
export type { CustomerListCardProps } from './CustomerListCard'

export { CustomerProfileHeader } from './CustomerProfileHeader'
export type { CustomerProfileHeaderProps } from './CustomerProfileHeader'

export { CreditPaymentCard } from './CreditPaymentCard'
export type { CreditPaymentCardProps } from './CreditPaymentCard'

export { SubscriptionRow } from './SubscriptionRow'
export type { SubscriptionRowProps } from './SubscriptionRow'

export { MonthlyBillCard } from './MonthlyBillCard'
export type { MonthlyBillCardProps } from './MonthlyBillCard'

export { PaymentHistoryRow } from './PaymentHistoryRow'
export type { PaymentHistoryRowProps } from './PaymentHistoryRow'
