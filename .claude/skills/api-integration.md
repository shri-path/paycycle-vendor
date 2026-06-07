# Skill 04 — API Integration (MANDATORY)

The service layer is the only place that talks to the backend. Every service supports **mock** and **real** modes via `src/services/config.ts`.

## When to use
Adding/modifying anything in `src/services/` (and `src/services/mocks/`) or a feature `service/`.

## Rules
1. **Service object per domain**: `xxxService` with async methods, in `<domain>.service.ts`. Export it from `src/services/api.service.ts` (barrel).
2. **Mock/real toggle**: branch on `isMockMode` from `./config`. In mock mode `await simulateNetworkDelay()` then return mock data from `src/services/mocks/`. In real mode call `axios` against `API_CONFIG.baseUrl`.
3. **Env vars use `EXPO_PUBLIC_` prefix only** (`EXPO_PUBLIC_API_MODE`, `EXPO_PUBLIC_API_URL`). `REACT_APP_*` is silently undefined in Expo.
4. **Typed DTOs.** Define request/response types in `src/types/`. Methods return domain types, not `any`/`unknown`. Map API response → domain type in the service, not the screen.
5. **Multi-tenancy.** Never send `vendorId` in body/params — the API derives it from the JWT. Never accept it from the UI.
6. **Auth header.** Real calls attach the access token from SecureStore via the shared axios instance/interceptor — services never read tokens from the store/state.
7. **Errors bubble up.** Let axios errors throw; the **store** calls `mapApiError`. Don't swallow errors or return fake success. Include the backend `correlationId` in logs (see `error-handling.md`).
8. **Timeouts/retry**: reads 10s, writes 30s; retry idempotent reads with backoff (`offline-first.md` / `real-time-sync.md`).
9. **No business logic** beyond request/response shaping. No store access, no UI.

## Pattern (follow src/services/customer.service.ts)
```ts
import { isMockMode, simulateNetworkDelay, API_CONFIG } from './config'
import { mockCustomers } from './mocks'
import type { Customer, CreateCustomerDto } from '../types'

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      return mockCustomers
    }
    const res = await apiClient.get<{ data: Customer[] }>('/v1/customers') // vendor scope from JWT, not params
    return res.data.data
  },
  create: async (dto: CreateCustomerDto): Promise<Customer> => {
    if (isMockMode) {
      await simulateNetworkDelay()
      const created: Customer = { ...dto, id: `cust-${Date.now()}`, createdAt: new Date() }
      mockCustomers.push(created)
      return created
    }
    const res = await apiClient.post<{ data: Customer }>('/v1/customers', dto)
    return res.data.data
  },
}
export default customerService
```

## Definition of Done (Review checklist)
- [ ] `xxxService` object, exported from `api.service.ts` barrel
- [ ] Every method branches on `isMockMode` with `simulateNetworkDelay()` in mock path
- [ ] Only `EXPO_PUBLIC_`-prefixed env vars used
- [ ] Request/response typed via `src/types/`; no `any`; returns domain types
- [ ] No `vendorId` sent from client; token attached via shared client, not from store
- [ ] Errors thrown (not swallowed); no fake success returns
- [ ] No store/UI access in the service

## Common violations → findings
- `REACT_APP_API_URL` → CRITICAL (undefined at runtime)
- Sending `vendorId` in params/body → BLOCKER (multi-tenancy)
- `catch` that returns `[]`/`null` hiding a real error → MAJOR
- Service importing a Zustand store → MAJOR (layering)
