/**
 * useCustomerForm Tests (US-008, WS-2B)
 * Purpose: Validate every WS-2B rule:
 *   - name: required, 1–100 chars, sanitized, injection rejected.
 *   - phone: required, exactly 10 digits.
 *   - email: optional; invalid format rejected.
 *   - creditLimit: optional; 0–9999999.99.
 *   - toCreateInput(): omits empties, strips phone non-digits, default country code.
 *   - toUpdateInput(): emits ONLY changed fields vs the initial snapshot.
 *
 * Pattern: mirrors useSupplyListForm.test.ts from US-005.
 */

import * as React from 'react'
import { act, render as rtlRender } from '@testing-library/react-native'
import { useCustomerForm } from '../useCustomerForm'
import type { CustomerFormValues, UseCustomerForm } from '../useCustomerForm'

// ---------------------------------------------------------------------------
// Hook harness (same pattern as useSupplyListForm tests)
// ---------------------------------------------------------------------------

interface Result {
  current: UseCustomerForm
}

async function render(initial?: Partial<CustomerFormValues>): Promise<Result> {
  const holder: Result = { current: null as unknown as UseCustomerForm }
  function Harness(): null {
    holder.current = useCustomerForm(initial)
    return null
  }
  await rtlRender(React.createElement(Harness))
  return holder
}

async function fill(result: Result, values: Partial<CustomerFormValues>): Promise<void> {
  await act(async () => {
    for (const [k, v] of Object.entries(values)) {
      result.current.setField(k as keyof CustomerFormValues, v as never)
    }
  })
}

async function runValidate(result: Result): Promise<void> {
  await act(async () => {
    result.current.validate()
  })
}

// ---------------------------------------------------------------------------
// Minimal valid base values to avoid unrelated failures
// ---------------------------------------------------------------------------

const VALID_BASE: Partial<CustomerFormValues> = {
  name: 'Ravi Kumar',
  phone: '9876543210',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCustomerForm', () => {
  it('starts invalid (empty name + phone) and clean of errors', async () => {
    const r = await render()
    expect(r.current.isValid).toBe(false)
    expect(r.current.errors).toEqual({})
  })

  it('is valid when name and phone are correctly filled', async () => {
    const r = await render()
    await fill(r, VALID_BASE)
    expect(r.current.isValid).toBe(true)
  })

  // -------------------------------------------------------------------------
  // name
  // -------------------------------------------------------------------------
  describe('name', () => {
    it('rejects empty name', async () => {
      const r = await render()
      await fill(r, { phone: '9876543210' })
      await runValidate(r)
      expect(r.current.errors.name).toBe('customer.form_name_required')
    })

    it('rejects name longer than 100 characters', async () => {
      const r = await render()
      await fill(r, { name: 'a'.repeat(101), phone: '9876543210' })
      expect(r.current.errors.name).toBe('validation.too_long')
    })

    it('accepts a 100-character name', async () => {
      const r = await render()
      await fill(r, { name: 'a'.repeat(100), phone: '9876543210' })
      expect(r.current.errors.name).toBeNull()
    })

    it('accepts a 1-character name', async () => {
      const r = await render()
      await fill(r, { name: 'A', phone: '9876543210' })
      expect(r.current.errors.name).toBeNull()
    })

    it('strips control characters from the stored value', async () => {
      const r = await render()
      await fill(r, { name: 'Ra\x01vi', phone: '9876543210' })
      expect(r.current.values.name).toBe('Ravi')
      expect(r.current.errors.name).toBeNull()
    })

    it('rejects injection / markup sequences', async () => {
      const r = await render()
      await fill(r, { name: '<script>alert(1)</script>', phone: '9876543210' })
      expect(r.current.errors.name).toBe('validation.invalid_input')
    })
  })

  // -------------------------------------------------------------------------
  // phone
  // -------------------------------------------------------------------------
  describe('phone', () => {
    it('rejects empty phone', async () => {
      const r = await render()
      await fill(r, { name: 'Ravi Kumar' })
      await runValidate(r)
      expect(r.current.errors.phone).toBe('customer.form_phone_required')
    })

    it('rejects fewer than 10 digits', async () => {
      const r = await render()
      await fill(r, { name: 'Ravi', phone: '98765' })
      expect(r.current.errors.phone).toBe('validation.invalid_phone')
    })

    it('rejects more than 10 digits', async () => {
      const r = await render()
      await fill(r, { name: 'Ravi', phone: '98765432101' })
      expect(r.current.errors.phone).toBe('validation.invalid_phone')
    })

    it('accepts exactly 10 digits', async () => {
      const r = await render()
      await fill(r, { name: 'Ravi', phone: '9876543210' })
      expect(r.current.errors.phone).toBeNull()
    })

    it('accepts exactly 10 digits when formatted with spaces/dashes', async () => {
      const r = await render()
      // The hook strips non-digits for validation; spaces/dashes are allowed in
      // the raw value if they produce exactly 10 digits.
      await fill(r, { name: 'Ravi', phone: '98765-43210' })
      expect(r.current.errors.phone).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // email (optional)
  // -------------------------------------------------------------------------
  describe('email', () => {
    it('accepts empty email (optional)', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, email: '' })
      expect(r.current.errors.email).toBeNull()
    })

    it('rejects an invalid email format', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, email: 'not-an-email' })
      expect(r.current.errors.email).toBe('validation.invalid_email')
    })

    it('rejects email missing TLD', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, email: 'user@domain' })
      expect(r.current.errors.email).toBe('validation.invalid_email')
    })

    it('accepts a valid email', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, email: 'ravi@example.com' })
      expect(r.current.errors.email).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // creditLimit (optional, 0–9999999.99)
  // -------------------------------------------------------------------------
  describe('creditLimit', () => {
    it('accepts empty (optional)', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, creditLimit: '' })
      expect(r.current.errors.creditLimit).toBeNull()
    })

    it('accepts 0', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, creditLimit: '0' })
      expect(r.current.errors.creditLimit).toBeNull()
    })

    it('accepts the maximum value 9999999.99', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, creditLimit: '9999999.99' })
      expect(r.current.errors.creditLimit).toBeNull()
    })

    it('rejects a negative value', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, creditLimit: '-1' })
      expect(r.current.errors.creditLimit).toBe('validation.invalid_number')
    })

    it('rejects a value exceeding the maximum', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, creditLimit: '10000000' })
      expect(r.current.errors.creditLimit).toBe('customer.error_invalid_credit_limit')
    })

    it('rejects a non-numeric value', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, creditLimit: 'abc' })
      expect(r.current.errors.creditLimit).toBe('validation.invalid_number')
    })
  })

  // -------------------------------------------------------------------------
  // toCreateInput
  // -------------------------------------------------------------------------
  describe('toCreateInput', () => {
    it('includes required fields and omits empty optionals', async () => {
      const r = await render()
      await fill(r, { name: '  Ravi Kumar  ', phone: '9876543210' })
      const input = r.current.toCreateInput()
      expect(input.name).toBe('Ravi Kumar')
      expect(input.phone).toBe('9876543210')
      expect(input).not.toHaveProperty('email')
      expect(input).not.toHaveProperty('address')
      expect(input).not.toHaveProperty('area')
      expect(input).not.toHaveProperty('language')
      expect(input).not.toHaveProperty('supplyListIds')
      expect(input).not.toHaveProperty('startDate')
      expect(input).not.toHaveProperty('creditLimit')
      expect(input).not.toHaveProperty('sendInvite')
    })

    it('strips non-digit characters from phone in the output', async () => {
      const r = await render()
      await fill(r, { name: 'Ravi', phone: '98765-43210' })
      const input = r.current.toCreateInput()
      expect(input.phone).toBe('9876543210')
    })

    it('includes optional fields when provided', async () => {
      const r = await render()
      await fill(r, {
        name: 'Ravi',
        phone: '9876543210',
        email: 'ravi@example.com',
        address: '12 Main St',
        area: 'Bandra',
        language: 'hi',
        supplyListIds: ['1', '2'],
        startDate: '2025-01-15',
        creditLimit: '500',
        sendInvite: true,
      })
      const input = r.current.toCreateInput()
      expect(input.email).toBe('ravi@example.com')
      expect(input.address).toBe('12 Main St')
      expect(input.area).toBe('Bandra')
      expect(input.language).toBe('hi')
      expect(input.supplyListIds).toEqual(['1', '2'])
      expect(input.startDate).toBe('2025-01-15')
      expect(input.creditLimit).toBe(500)
      expect(input.sendInvite).toBe(true)
    })

    it('omits phoneCountryCode when it is the default +91', async () => {
      const r = await render()
      await fill(r, VALID_BASE)
      const input = r.current.toCreateInput()
      expect(input).not.toHaveProperty('phoneCountryCode')
    })

    it('includes phoneCountryCode when different from +91', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, phoneCountryCode: '+44' })
      const input = r.current.toCreateInput()
      expect(input.phoneCountryCode).toBe('+44')
    })

    it('omits startDate when it does not match YYYY-MM-DD', async () => {
      const r = await render()
      await fill(r, { ...VALID_BASE, startDate: '15-01-2025' })
      const input = r.current.toCreateInput()
      expect(input).not.toHaveProperty('startDate')
    })
  })

  // -------------------------------------------------------------------------
  // toUpdateInput (changed fields only)
  // -------------------------------------------------------------------------
  describe('toUpdateInput', () => {
    it('returns an empty patch when nothing changed', async () => {
      const r = await render({ name: 'Ravi', phone: '9876543210' })
      expect(r.current.toUpdateInput()).toEqual({})
    })

    it('includes only the fields that changed', async () => {
      const r = await render({
        name: 'Ravi Kumar',
        phone: '9876543210',
        email: 'ravi@example.com',
        area: 'Bandra',
      })
      await fill(r, { name: 'Ravi K', area: 'Andheri' })
      const patch = r.current.toUpdateInput()
      expect(patch).toEqual({ name: 'Ravi K', area: 'Andheri' })
      expect(patch).not.toHaveProperty('phone')
      expect(patch).not.toHaveProperty('email')
    })

    it('strips digits from phone in the patch', async () => {
      const r = await render({ name: 'Ravi', phone: '9876543210' })
      await fill(r, { phone: '1234567890' })
      const patch = r.current.toUpdateInput()
      expect(patch.phone).toBe('1234567890')
    })

    it('sends updated status when status is changed', async () => {
      const r = await render({ name: 'Ravi', phone: '9876543210', status: 'ACTIVE' })
      await fill(r, { status: 'INACTIVE' })
      const patch = r.current.toUpdateInput()
      expect(patch.status).toBe('INACTIVE')
    })

    it('omits status from patch when status is empty (add screen)', async () => {
      const r = await render({ name: 'Ravi', phone: '9876543210' })
      const patch = r.current.toUpdateInput()
      expect(patch).not.toHaveProperty('status')
    })

    it('sets email to undefined (omitted from JSON) when cleared', async () => {
      const r = await render({ name: 'Ravi', phone: '9876543210', email: 'r@x.com' })
      await fill(r, { email: '' })
      const patch = r.current.toUpdateInput()
      // UpdateCustomerInput.email is optional — clearing it produces undefined
      // (omitted during JSON.stringify). The patch key is present but undefined.
      expect(patch.email).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // validate() — full-form run
  // -------------------------------------------------------------------------
  describe('validate()', () => {
    it('returns false and sets errors when required fields are empty', async () => {
      const r = await render()
      let valid = false
      await act(async () => {
        valid = r.current.validate()
      })
      expect(valid).toBe(false)
      expect(r.current.errors.name).toBeTruthy()
      expect(r.current.errors.phone).toBeTruthy()
    })

    it('returns true when all required fields are valid', async () => {
      const r = await render()
      await fill(r, VALID_BASE)
      let valid = false
      await act(async () => {
        valid = r.current.validate()
      })
      expect(valid).toBe(true)
    })
  })
})
