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
export { authService } from '../modules/auth/service/auth.service'
// NOTE (WS-0→WS-1): `rolesService` is exported here once WS-1 lands
// `src/modules/roles/service/roles.service.ts`. Deferred so the Foundation
// commit stays self-contained and typechecks without the Phase-2 service.
