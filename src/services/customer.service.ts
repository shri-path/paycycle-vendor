/**
 * @deprecated Legacy placeholder — superseded by
 * `src/modules/customers/service/customers.service.ts` (US-008).
 * This file is kept for barrel-export compatibility only and will be removed
 * when the screens migration is complete.
 */

/**
 * Customer API Service (legacy stub — do not use in new screens)
 */
export const customerService = {
  /** @deprecated Use customersStore / customers.service.ts */
  getAll: async (): Promise<never[]> => {
    return []
  },

  /** @deprecated Use customersStore / customers.service.ts */
  getActive: async (): Promise<never[]> => {
    return []
  },

  /** @deprecated Use customersStore / customers.service.ts */
  getById: async (_id: string): Promise<null> => {
    return null
  },

  /** @deprecated Use customersStore / customers.service.ts */
  search: async (_query: string): Promise<never[]> => {
    return []
  },

  /** @deprecated Use customersStore / customers.service.ts */
  create: async (_customer: Record<string, unknown>): Promise<null> => {
    return null
  },

  /** @deprecated Use customersStore / customers.service.ts */
  update: async (_id: string, _updates: Record<string, unknown>): Promise<null> => {
    return null
  },

  /** @deprecated Use customersStore / customers.service.ts */
  delete: async (_id: string): Promise<boolean> => {
    return false
  },
}

export default customerService
