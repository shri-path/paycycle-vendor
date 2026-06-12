/**
 * Customer Mock Data (legacy)
 *
 * @deprecated These fixtures use the old Customer shape and are superseded by
 * `src/modules/customers/service/customers.mock.ts` (US-008).
 * This file is kept for barrel-export compatibility only and will be removed
 * when the screens migration is complete.
 *
 * NOTE: The old `Customer` type (city/pincode/lastTransaction) no longer exists.
 * The canonical DTOs are in `src/types/customer.ts` (CustomerListItemDto,
 * CustomerDetailDto, etc.).
 */

/**
 * Empty legacy mock — canonical mock data lives in
 * `src/modules/customers/service/customers.mock.ts`.
 */
export const mockCustomers: never[] = []

export const getAllCustomers = (): never[] => []

export const getActiveCustomers = (): never[] => []

export const getCustomerById = (_id: string): undefined => undefined

export const searchCustomers = (_query: string): never[] => []

export default mockCustomers
