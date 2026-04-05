/**
 * API Service Index
 * Purpose: Barrel export for all service modules
 * Architecture: Each service handles its own domain (ledger, customer, vendor)
 *
 * Usage:
 *   import { ledgerService, customerService, vendorService } from '@services/api.service'
 *   const entries = await ledgerService.getEntries()
 */

export { ledgerService } from './ledger.service'
export { customerService } from './customer.service'
export { vendorService } from './vendor.service'
