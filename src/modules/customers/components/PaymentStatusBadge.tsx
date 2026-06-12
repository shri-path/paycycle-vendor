/**
 * PaymentStatusBadge — customer module primitive (US-008).
 * Purpose: Coloured pill indicating payment status: paid (success), pending (warning),
 * overdue (error). Presentational — receives `status` via props; no store/API access.
 * Staff-safe: this component should only be rendered when `paymentStatus` is non-null
 * (the caller is responsible for the null guard).
 */

import React from 'react'
import { AppBadge } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import type { BadgeVariant } from '@components/primitives/AppBadge'
import type { PaymentStatus } from '../../../types/customer'

export interface PaymentStatusBadgeProps {
  /** Payment status to display. */
  status: PaymentStatus
}

const STATUS_CONFIG: Record<PaymentStatus, { variant: BadgeVariant; key: string }> = {
  paid: { variant: 'success', key: 'customer.status_paid' },
  pending: { variant: 'warning', key: 'customer.status_pending' },
  overdue: { variant: 'error', key: 'customer.status_overdue' },
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]

  return (
    <AppBadge
      label={t(config.key)}
      variant={config.variant}
      size="sm"
    />
  )
}

PaymentStatusBadge.displayName = 'PaymentStatusBadge'

export default PaymentStatusBadge
