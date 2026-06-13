/**
 * useBulkRateForm (US-011)
 * Purpose: Form state for BulkAdjustRateScreen (S4).
 *
 * Manages:
 * - Rate scope (single_list vs all_lists_same_supply)
 * - Supply list / supply type selection
 * - New rate (numeric)
 * - Effective from date (today or future)
 * - Notify customers checkbox
 * - Debounced impact preview fetch
 * - Submit handler (calls bulkAdjustRate via the store)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { settingsService } from '../service/settings.service'
import { useSettingsStore } from '../store/settings.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type {
  BulkRateInput,
  BulkRateImpactDto,
  BulkRateResultDto,
  RateScope,
} from '../../../types/settings'

const DEBOUNCE_MS = 600

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface BulkRateFormState {
  scope: RateScope
  supplyListId: string | undefined
  supplyType: string | undefined
  newRate: string          // string to allow numeric text input
  effectiveFrom: string    // "YYYY-MM-DD"
  notifyCustomers: boolean
}

export interface UseBulkRateFormReturn {
  form: BulkRateFormState
  impact: BulkRateImpactDto | null
  isImpactLoading: boolean
  isValid: boolean
  isZeroRate: boolean
  isMutating: boolean
  mutationError: string | null
  update: (patch: Partial<BulkRateFormState>) => void
  submit: () => Promise<BulkRateResultDto>
  reset: () => void
}

const initialForm: BulkRateFormState = {
  scope: 'single_list',
  supplyListId: undefined,
  supplyType: undefined,
  newRate: '',
  effectiveFrom: todayIso(),
  notifyCustomers: true,
}

export function useBulkRateForm(): UseBulkRateFormReturn {
  const [form, setForm] = useState<BulkRateFormState>(initialForm)
  const [impact, setImpact] = useState<BulkRateImpactDto | null>(null)
  const [isImpactLoading, setIsImpactLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const vendorId = useAuthStore(useShallow((s) => s.vendorContext?.vendorId ?? null))
  const { isMutating, mutationError, bulkAdjustRate } = useSettingsStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      bulkAdjustRate: s.bulkAdjustRate,
    })),
  )

  const parsedRate = parseFloat(form.newRate)
  const isRateValid = form.newRate !== '' && !isNaN(parsedRate) && parsedRate >= 0

  const isValid =
    isRateValid &&
    !!form.effectiveFrom &&
    (form.scope === 'all_lists_same_supply'
      ? !!form.supplyType
      : !!form.supplyListId)

  const isZeroRate = isRateValid && parsedRate === 0

  const buildInput = useCallback((): BulkRateInput => {
    return {
      scope: form.scope,
      supplyListId: form.supplyListId,
      supplyType: form.supplyType,
      newRate: parsedRate,
      effectiveFrom: form.effectiveFrom,
      notifyCustomers: form.notifyCustomers,
    }
  }, [form, parsedRate])

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
        .getRateImpact(vendorId, buildInput(), abortRef.current.signal)
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

  const update = useCallback((patch: Partial<BulkRateFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setImpact(null)
  }, [])

  const reset = useCallback(() => {
    setForm(initialForm)
    setImpact(null)
  }, [])

  const submit = useCallback(async (): Promise<BulkRateResultDto> => {
    return bulkAdjustRate(buildInput())
  }, [bulkAdjustRate, buildInput])

  return {
    form,
    impact,
    isImpactLoading,
    isValid,
    isZeroRate,
    isMutating,
    mutationError,
    update,
    submit,
    reset,
  }
}

export default useBulkRateForm
