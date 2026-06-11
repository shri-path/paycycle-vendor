/**
 * useSupplyListForm (US-005)
 * Purpose: Form state + validation for the Create / Edit supply-list screens.
 *
 * - Holds the editable field values, per-field error keys, and a setField updater.
 * - Validation rules (Task 6) live in `@utils/validation` (pure, shared): name
 *   1–100 + sanitized/injection-guarded; unit required; defaultQuantity /
 *   defaultRatePerUnit ≥ 0 and finite (optional); startTime "HH:mm" (optional);
 *   frequency-conditional days — WEEKLY → 1..7 required, MONTHLY → 1..31 required,
 *   DAILY → none; primaryStaffId ∈ staffIds. This hook only routes fields to them.
 * - The free-text `name` is sanitized (control chars stripped) in setField.
 * - Errors are stored as RAW i18n keys; the screen translates with t() at render.
 * - toCreateInput() builds the POST body; toUpdatePatch() emits ONLY changed fields
 *   (vs the `initial` snapshot) so Edit sends a minimal PATCH.
 *
 * Pure form logic only — no store/API calls (those live in the screens / store).
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  CreateSupplyListInput,
  SupplyFrequency,
  SupplyUnit,
  UpdateSupplyListInput,
} from '../../../types/supplyLists'
import {
  sanitizeText,
  validateFrequencyDays,
  validateOptionalNonNegativeNumber,
  validatePrimaryStaffId,
  validateStartTime,
  validateSupplyListName,
  validateSupplyUnit,
} from '@utils/validation'

/** Editable form values. Numeric fields are kept as strings (text inputs). */
export interface SupplyListFormValues {
  name: string
  supplyType: string
  unit: SupplyUnit | ''
  defaultQuantity: string
  defaultRatePerUnit: string
  startTime: string
  frequency: SupplyFrequency
  frequencyDays: number[]
  staffIds: string[]
  primaryStaffId: string
}

/** Per-field error keys (raw i18n keys or null). */
export type SupplyListFormErrors = Partial<Record<keyof SupplyListFormValues, string | null>>

export interface UseSupplyListForm {
  values: SupplyListFormValues
  errors: SupplyListFormErrors
  setField: <K extends keyof SupplyListFormValues>(
    field: K,
    value: SupplyListFormValues[K],
  ) => void
  validate: () => boolean
  isValid: boolean
  toCreateInput: () => CreateSupplyListInput
  toUpdatePatch: () => UpdateSupplyListInput
}

const EMPTY_VALUES: SupplyListFormValues = {
  name: '',
  supplyType: '',
  unit: '',
  defaultQuantity: '',
  defaultRatePerUnit: '',
  startTime: '',
  frequency: 'DAILY',
  frequencyDays: [],
  staffIds: [],
  primaryStaffId: '',
}

/** Parses a numeric text field; '' → null, otherwise a finite number or NaN. */
function parseNum(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return Number(trimmed)
}

/**
 * Validates a single field; returns a raw i18n error key or null.
 * Delegates to the shared, pure validators in `@utils/validation` (codebase
 * convention) — the form layer only routes each field to its validator.
 */
function validateField(
  field: keyof SupplyListFormValues,
  values: SupplyListFormValues,
): string | null {
  switch (field) {
    case 'name':
      return validateSupplyListName(values.name)
    case 'unit':
      return validateSupplyUnit(values.unit)
    case 'defaultQuantity':
      return validateOptionalNonNegativeNumber(values.defaultQuantity)
    case 'defaultRatePerUnit':
      return validateOptionalNonNegativeNumber(values.defaultRatePerUnit)
    case 'startTime':
      return validateStartTime(values.startTime)
    case 'frequencyDays':
      return validateFrequencyDays(values.frequency, values.frequencyDays)
    case 'primaryStaffId':
      return validatePrimaryStaffId(values.primaryStaffId, values.staffIds)
    default:
      return null
  }
}

/** Fields that participate in validation (others are always valid). */
const VALIDATED_FIELDS: (keyof SupplyListFormValues)[] = [
  'name',
  'unit',
  'defaultQuantity',
  'defaultRatePerUnit',
  'startTime',
  'frequencyDays',
  'primaryStaffId',
]

function computeErrors(values: SupplyListFormValues): SupplyListFormErrors {
  const errors: SupplyListFormErrors = {}
  for (const field of VALIDATED_FIELDS) {
    errors[field] = validateField(field, values)
  }
  return errors
}

export function useSupplyListForm(initial?: Partial<SupplyListFormValues>): UseSupplyListForm {
  const initialValues = useMemo<SupplyListFormValues>(
    () => ({ ...EMPTY_VALUES, ...initial }),
    // Snapshot once on mount — Edit pre-population is stable for the screen lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // The pristine snapshot toUpdatePatch() diffs against (changed fields only).
  const initialRef = useRef<SupplyListFormValues>(initialValues)

  const [values, setValues] = useState<SupplyListFormValues>(initialValues)
  const [errors, setErrors] = useState<SupplyListFormErrors>({})

  // Mirror the latest values so setField can compute the next state + its live
  // errors without nesting setState calls (which React may batch/drop).
  const valuesRef = useRef<SupplyListFormValues>(initialValues)
  valuesRef.current = values

  const setField = useCallback(
    <K extends keyof SupplyListFormValues>(field: K, value: SupplyListFormValues[K]) => {
      // Sanitize the free-text `name` field (strip control chars) before storing;
      // validateSupplyListName then guards injection/markup → validation.invalid_input.
      const nextValue =
        field === 'name' && typeof value === 'string'
          ? (sanitizeText(value) as SupplyListFormValues[K])
          : value
      const next: SupplyListFormValues = { ...valuesRef.current, [field]: nextValue }
      valuesRef.current = next
      setValues(next)
      // Re-validate the touched field (and dependents) for live feedback.
      setErrors((prevErrors) => {
        const updated: SupplyListFormErrors = {
          ...prevErrors,
          [field]: validateField(field, next),
        }
        if (field === 'frequency') {
          updated.frequencyDays = validateField('frequencyDays', next)
        }
        if (field === 'staffIds') {
          updated.primaryStaffId = validateField('primaryStaffId', next)
        }
        return updated
      })
    },
    [],
  )

  const validate = useCallback((): boolean => {
    const nextErrors = computeErrors(valuesRef.current)
    setErrors(nextErrors)
    return Object.values(nextErrors).every((e) => !e)
  }, [])

  const isValid = useMemo(
    () => Object.values(computeErrors(values)).every((e) => !e),
    [values],
  )

  const toCreateInput = useCallback((): CreateSupplyListInput => {
    const qty = parseNum(values.defaultQuantity)
    const rate = parseNum(values.defaultRatePerUnit)
    const supplyType = values.supplyType.trim()
    const startTime = values.startTime.trim()
    const input: CreateSupplyListInput = {
      name: values.name.trim(),
      unit: values.unit as SupplyUnit,
      frequency: values.frequency,
    }
    if (supplyType) input.supplyType = supplyType
    if (qty !== null) input.defaultQuantity = qty
    if (rate !== null) input.defaultRatePerUnit = rate
    if (startTime) input.startTime = startTime
    if (values.frequency !== 'DAILY') input.frequencyDays = values.frequencyDays
    if (values.staffIds.length > 0) input.staffIds = values.staffIds
    if (values.primaryStaffId) input.primaryStaffId = values.primaryStaffId
    return input
  }, [values])

  const toUpdatePatch = useCallback((): UpdateSupplyListInput => {
    const base = initialRef.current
    const patch: UpdateSupplyListInput = {}

    const name = values.name.trim()
    if (name !== base.name.trim()) patch.name = name

    const supplyType = values.supplyType.trim()
    if (supplyType !== base.supplyType.trim()) {
      patch.supplyType = supplyType === '' ? null : supplyType
    }

    if (values.unit !== base.unit && values.unit !== '') patch.unit = values.unit

    const qty = parseNum(values.defaultQuantity)
    const baseQty = parseNum(base.defaultQuantity)
    if (qty !== baseQty) patch.defaultQuantity = qty

    const rate = parseNum(values.defaultRatePerUnit)
    const baseRate = parseNum(base.defaultRatePerUnit)
    if (rate !== baseRate) patch.defaultRatePerUnit = rate

    const startTime = values.startTime.trim()
    if (startTime !== base.startTime.trim()) {
      patch.startTime = startTime === '' ? null : startTime
    }

    if (values.frequency !== base.frequency) patch.frequency = values.frequency

    const daysChanged =
      values.frequencyDays.length !== base.frequencyDays.length ||
      values.frequencyDays.some((d, i) => d !== base.frequencyDays[i])
    if (values.frequency !== base.frequency || daysChanged) {
      patch.frequencyDays = values.frequency === 'DAILY' ? [] : values.frequencyDays
    }

    return patch
  }, [values])

  return { values, errors, setField, validate, isValid, toCreateInput, toUpdatePatch }
}

export default useSupplyListForm
