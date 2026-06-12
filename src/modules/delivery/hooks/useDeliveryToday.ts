/**
 * useDeliveryToday (US-006)
 * Purpose: derived, selector-based access to today's delivery summary for the
 * StaffHome dashboard and the owner today overview. Reads from `useDeliveryStore`
 * (no direct API). Returns a small frozen contract so the roles module can consume
 * it without depending on the delivery screens.
 *
 * `delivered`/`total` come from the today summary; `refetch` triggers a fresh
 * fetchToday (today's date is the server's, per OQ-3).
 */

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDeliveryStore } from '../store/delivery.store'

export interface UseDeliveryTodayResult {
  delivered: number
  total: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDeliveryToday(): UseDeliveryTodayResult {
  const { summary, isLoading, error, fetchToday } = useDeliveryStore(
    useShallow((s) => ({
      summary: s.today?.summary ?? null,
      isLoading: s.isTodayLoading,
      error: s.todayError,
      fetchToday: s.fetchToday,
    })),
  )

  const refetch = useCallback(() => {
    void fetchToday()
  }, [fetchToday])

  return {
    delivered: summary?.delivered ?? 0,
    total: summary?.totalDeliveries ?? 0,
    isLoading,
    error,
    refetch,
  }
}

export default useDeliveryToday
