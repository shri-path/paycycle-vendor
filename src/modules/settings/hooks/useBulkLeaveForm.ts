/**
 * useBulkLeaveForm (US-011)
 * Purpose: Form state for BulkMarkLeaveScreen (S3).
 *
 * Manages:
 * - List scope (all lists vs single list)
 * - Customer scope (all customers vs specific customer IDs)
 * - Date range (startDate / endDate)
 * - Optional reason text
 * - Debounced impact preview fetch (fires when inputs become valid)
 * - Submit handler (calls bulkMarkLeave via the store)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { settingsService } from '../service/settings.service'
import { useSettingsStore } from '../store/settings.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type { BulkLeaveInput, BulkLeaveImpactDto, BulkLeaveResultDto } from '../../../types/settings'

const DEBOUNCE_MS = 600

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface BulkLeaveFormState {
  supplyListId: string | undefined
  allLists: boolean
  allCustomers: boolean
  customerIds: string[]
  startDate: string
  endDate: string
  reason: string
}

export interface UseBulkLeaveFormReturn {
  form: BulkLeaveFormState
  impact: BulkLeaveImpactDto | null
  isImpactLoading: boolean
  isValid: boolean
  isMutating: boolean
  mutationError: string | null
  update: (patch: Partial<BulkLeaveFormState>) => void
  submit: () => Promise<BulkLeaveResultDto>
  reset: () => void
}

const initialForm: BulkLeaveFormState = {
  supplyListId: undefined,
  allLists: true,
  allCustomers: true,
  customerIds: [],
  startDate: todayIso(),
  endDate: todayIso(),
  reason: '',
}

export function useBulkLeaveForm(): UseBulkLeaveFormReturn {
  const [form, setForm] = useState<BulkLeaveFormState>(initialForm)
  const [impact, setImpact] = useState<BulkLeaveImpactDto | null>(null)
  const [isImpactLoading, setIsImpactLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const vendorId = useAuthStore(useShallow((s) => s.vendorContext?.vendorId ?? null))
  const { isMutating, mutationError, bulkMarkLeave } = useSettingsStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      bulkMarkLeave: s.bulkMarkLeave,
    })),
  )

  /** True when the form has enough data to compute an impact and submit. */
  const isValid =
    (form.allLists || !!form.supplyListId) &&
    (form.allCustomers || form.customerIds.length > 0) &&
    !!form.startDate &&
    !!form.endDate &&
    form.startDate <= form.endDate

  const buildInput = useCallback((): BulkLeaveInput => {
    const base: BulkLeaveInput = {
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason || undefined,
    }
    if (!form.allLists && form.supplyListId) base.supplyListId = form.supplyListId
    if (!form.allCustomers && form.customerIds.length > 0) base.customerIds = form.customerIds
    return base
  }, [form])

  // Debounce impact fetch when inputs become valid.
  useEffect(() => {
    if (!isValid || !vendorId) {
      setImpact(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setIsImpactLoading(true)
      settingsService
        .getLeaveImpact(vendorId, buildInput(), abortRef.current.signal)
        .then((data) => {
          setImpact(data)
          setIsImpactLoading(false)
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name !== 'AbortError') {
            setIsImpactLoading(false)
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [isValid, vendorId, buildInput])

  const update = useCallback((patch: Partial<BulkLeaveFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setImpact(null)
  }, [])

  const reset = useCallback(() => {
    setForm(initialForm)
    setImpact(null)
  }, [])

  const submit = useCallback(async (): Promise<BulkLeaveResultDto> => {
    return bulkMarkLeave(buildInput())
  }, [bulkMarkLeave, buildInput])

  return {
    form,
    impact,
    isImpactLoading,
    isValid,
    isMutating,
    mutationError,
    update,
    submit,
    reset,
  }
}

export default useBulkLeaveForm
