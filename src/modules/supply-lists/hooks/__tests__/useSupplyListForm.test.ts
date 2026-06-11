/**
 * useSupplyListForm Tests (US-005)
 * Purpose: Validate every Task-6 rule (name 1–100, unit required, qty/rate ≥0 finite,
 * startTime HH:mm, frequency-conditional days WEEKLY 1..7 / MONTHLY 1..31 / DAILY none,
 * primaryStaffId ∈ staffIds) plus toCreateInput() and toUpdatePatch() (changed-only).
 */

import * as React from 'react'
import { act, render as rtlRender } from '@testing-library/react-native'
import { useSupplyListForm } from '../useSupplyListForm'
import type { SupplyListFormValues, UseSupplyListForm } from '../useSupplyListForm'

/**
 * Local hook harness — captures the hook value synchronously during render via a
 * mutable holder (this RTL version's effect-based `renderHook` does not flush its
 * ref reliably for a pure state hook).
 */
interface Result {
  current: UseSupplyListForm
}

async function render(initial?: Partial<SupplyListFormValues>): Promise<Result> {
  const holder: Result = { current: null as unknown as UseSupplyListForm }
  function Harness(): null {
    holder.current = useSupplyListForm(initial)
    return null
  }
  await rtlRender(React.createElement(Harness))
  return holder
}

async function fill(result: Result, values: Partial<SupplyListFormValues>): Promise<void> {
  await act(async () => {
    for (const [k, v] of Object.entries(values)) {
      result.current.setField(k as keyof SupplyListFormValues, v as never)
    }
  })
}

async function runValidate(result: Result): Promise<void> {
  await act(async () => {
    result.current.validate()
  })
}

describe('useSupplyListForm', () => {
  it('starts invalid (empty name + unit) and clean of errors', async () => {
    const r = await render()
    expect(r.current.isValid).toBe(false)
    expect(r.current.errors).toEqual({})
  })

  describe('name', () => {
    it('rejects empty name', async () => {
      const r = await render()
      await fill(r, { unit: 'ltr' })
      await runValidate(r)
      expect(r.current.errors.name).toBe('validation.required')
    })

    it('rejects > 100 chars', async () => {
      const r = await render()
      await fill(r, { name: 'a'.repeat(101), unit: 'ltr' })
      expect(r.current.errors.name).toBe('validation.too_long')
    })

    it('accepts a 100-char name', async () => {
      const r = await render()
      await fill(r, { name: 'a'.repeat(100), unit: 'ltr' })
      expect(r.current.errors.name).toBeNull()
    })
  })

  describe('unit', () => {
    it('requires a unit', async () => {
      const r = await render()
      await fill(r, { name: 'Milk' })
      await runValidate(r)
      expect(r.current.errors.unit).toBe('validation.required')
      expect(r.current.isValid).toBe(false)
    })
  })

  describe('quantity / rate', () => {
    it('accepts blank (optional) and 0', async () => {
      const r = await render()
      await fill(r, { defaultQuantity: '0', defaultRatePerUnit: '' })
      expect(r.current.errors.defaultQuantity).toBeNull()
      expect(r.current.errors.defaultRatePerUnit).toBeNull()
    })

    it('rejects negative qty and non-finite rate', async () => {
      const r = await render()
      await fill(r, { defaultQuantity: '-1', defaultRatePerUnit: 'abc' })
      expect(r.current.errors.defaultQuantity).toBe('validation.required')
      expect(r.current.errors.defaultRatePerUnit).toBe('validation.required')
    })
  })

  describe('startTime', () => {
    it('accepts blank and HH:mm', async () => {
      const r = await render()
      await fill(r, { startTime: '06:30' })
      expect(r.current.errors.startTime).toBeNull()
    })

    it('rejects a malformed time', async () => {
      const r = await render()
      await fill(r, { startTime: '25:99' })
      expect(r.current.errors.startTime).toBe('validation.required')
    })
  })

  describe('frequency-conditional days (discriminated union)', () => {
    it('DAILY requires no days', async () => {
      const r = await render()
      await fill(r, { name: 'Milk', unit: 'ltr', frequency: 'DAILY', frequencyDays: [] })
      await runValidate(r)
      expect(r.current.errors.frequencyDays).toBeNull()
      expect(r.current.isValid).toBe(true)
    })

    it('WEEKLY requires 1..7 days', async () => {
      const r = await render()
      await fill(r, { name: 'Milk', unit: 'ltr', frequency: 'WEEKLY', frequencyDays: [] })
      await runValidate(r)
      expect(r.current.errors.frequencyDays).toBe('validation.required')
    })

    it('WEEKLY rejects a day out of 1..7', async () => {
      const r = await render()
      await fill(r, { frequency: 'WEEKLY', frequencyDays: [8] })
      expect(r.current.errors.frequencyDays).toBe('validation.required')
    })

    it('MONTHLY accepts 1..31 and rejects 32', async () => {
      const r = await render()
      await fill(r, { frequency: 'MONTHLY', frequencyDays: [1, 15, 31] })
      expect(r.current.errors.frequencyDays).toBeNull()
      await fill(r, { frequencyDays: [32] })
      expect(r.current.errors.frequencyDays).toBe('validation.required')
    })

    it('re-validates days when frequency flips DAILY→WEEKLY', async () => {
      const r = await render()
      await fill(r, { frequency: 'DAILY', frequencyDays: [] })
      expect(r.current.errors.frequencyDays).toBeNull()
      await fill(r, { frequency: 'WEEKLY' })
      expect(r.current.errors.frequencyDays).toBe('validation.required')
    })
  })

  describe('primaryStaffId ∈ staffIds', () => {
    it('rejects a primary not in staffIds', async () => {
      const r = await render()
      await fill(r, { staffIds: ['s1', 's2'], primaryStaffId: 's3' })
      expect(r.current.errors.primaryStaffId).toBe('validation.required')
    })

    it('accepts a primary that is a member', async () => {
      const r = await render()
      await fill(r, { staffIds: ['s1', 's2'], primaryStaffId: 's2' })
      expect(r.current.errors.primaryStaffId).toBeNull()
    })
  })

  describe('toCreateInput', () => {
    it('omits optional empties and includes days only for non-DAILY', async () => {
      const r = await render()
      await fill(r, {
        name: '  Morning Milk  ',
        unit: 'ltr',
        frequency: 'WEEKLY',
        frequencyDays: [1, 3],
        defaultQuantity: '2',
        defaultRatePerUnit: '',
        staffIds: ['s1'],
        primaryStaffId: 's1',
      })
      const input = r.current.toCreateInput()
      expect(input.name).toBe('Morning Milk')
      expect(input.unit).toBe('ltr')
      expect(input.frequency).toBe('WEEKLY')
      expect(input.frequencyDays).toEqual([1, 3])
      expect(input.defaultQuantity).toBe(2)
      expect(input).not.toHaveProperty('defaultRatePerUnit')
      expect(input.staffIds).toEqual(['s1'])
      expect(input.primaryStaffId).toBe('s1')
    })

    it('omits frequencyDays for DAILY', async () => {
      const r = await render()
      await fill(r, { name: 'Milk', unit: 'ltr', frequency: 'DAILY' })
      expect(r.current.toCreateInput()).not.toHaveProperty('frequencyDays')
    })
  })

  describe('toUpdatePatch (changed fields only)', () => {
    it('returns an empty patch when nothing changed', async () => {
      const r = await render({ name: 'Milk', unit: 'ltr', frequency: 'DAILY' })
      expect(r.current.toUpdatePatch()).toEqual({})
    })

    it('includes only the fields that changed', async () => {
      const r = await render({
        name: 'Milk',
        unit: 'ltr',
        frequency: 'DAILY',
        defaultRatePerUnit: '60',
      })
      await fill(r, { name: 'Milk Premium', defaultRatePerUnit: '65' })
      const patch = r.current.toUpdatePatch()
      expect(patch).toEqual({ name: 'Milk Premium', defaultRatePerUnit: 65 })
    })

    it('sends frequencyDays [] when switching to DAILY', async () => {
      const r = await render({
        name: 'Milk',
        unit: 'ltr',
        frequency: 'WEEKLY',
        frequencyDays: [1, 2],
      })
      await fill(r, { frequency: 'DAILY' })
      const patch = r.current.toUpdatePatch()
      expect(patch.frequency).toBe('DAILY')
      expect(patch.frequencyDays).toEqual([])
    })

    it('emits null for a cleared supplyType', async () => {
      const r = await render({
        name: 'Milk',
        unit: 'ltr',
        frequency: 'DAILY',
        supplyType: 'milk',
      })
      await fill(r, { supplyType: '' })
      expect(r.current.toUpdatePatch().supplyType).toBeNull()
    })
  })
})
