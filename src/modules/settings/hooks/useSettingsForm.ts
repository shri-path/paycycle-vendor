/**
 * useSettingsForm (US-011)
 * Purpose: Dirty-tracking form state for VendorSettingsScreen (S1).
 *
 * Mirrors the useCustomerForm pattern: tracks an in-flight form copy of the
 * persisted settings, computes dirty fields, and exposes a save handler that
 * calls updateSettings() with ONLY the changed keys.
 *
 * Usage:
 *   const { form, isDirty, update, save, isSaving } = useSettingsForm(settings)
 */

import { useState, useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { VendorSettingsDto } from '../../../types/settings'
import { useSettingsStore } from '../store/settings.store'

export interface UseSettingsFormReturn {
  /** Current in-flight form values (starts as a copy of the persisted settings). */
  form: VendorSettingsDto | null
  /** True when any form field differs from the persisted settings. */
  isDirty: boolean
  /** Update a single field (or nested path via a setter callback). */
  update: (patch: Partial<VendorSettingsDto>) => void
  /** Save dirty fields to the API. Throws on error so the screen can react. */
  save: () => Promise<void>
  /** True while the PATCH is in flight. */
  isSaving: boolean
  /** i18n key for the last mutation error; null if no error. */
  saveError: string | null
  /** Reset the form back to the last persisted settings. */
  reset: () => void
}

/** Deep equality check for plain objects (shallow compare nested leaves). */
function hasChanged<T>(a: T, b: T): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

export function useSettingsForm(settings: VendorSettingsDto | null): UseSettingsFormReturn {
  const [form, setForm] = useState<VendorSettingsDto | null>(settings ? { ...settings } : null)

  const { isMutating, mutationError, updateSettings } = useSettingsStore(
    useShallow((s) => ({
      isMutating: s.isMutating,
      mutationError: s.mutationError,
      updateSettings: s.updateSettings,
    })),
  )

  // Sync form when external settings change (e.g. after a refetch / initial load).
  useEffect(() => {
    if (settings && !form) {
      setForm({ ...settings })
    }
  }, [settings, form])

  const update = useCallback((patch: Partial<VendorSettingsDto>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : null))
  }, [])

  const reset = useCallback(() => {
    setForm(settings ? { ...settings } : null)
  }, [settings])

  const isDirty = settings !== null && form !== null && hasChanged(settings, form)

  const save = useCallback(async () => {
    if (!form || !settings) return
    // Compute dirty fields only.
    const patch: Partial<VendorSettingsDto> = {}
    const keys = Object.keys(form) as (keyof VendorSettingsDto)[]
    for (const key of keys) {
      if (hasChanged(settings[key], form[key])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(patch as any)[key] = form[key]
      }
    }
    if (Object.keys(patch).length === 0) return
    await updateSettings(patch)
  }, [form, settings, updateSettings])

  return {
    form,
    isDirty,
    update,
    save,
    isSaving: isMutating,
    saveError: mutationError,
    reset,
  }
}

export default useSettingsForm
