/**
 * Audit Store Tests (US-007)
 * Purpose: unit tests for the audit store using a mocked service. Covers:
 *   - vendorId pulled from auth state (JWT-derived, never from user input)
 *   - fetch* populate slices; error → i18n KEY (never raw message)
 *   - offline (common.offline_message) preserves cached rows; API error clears them
 *   - pagination appends on page > 1, replaces on page 1
 *   - exportLogs returns 'shared' / 'unavailable' / 'failed' outcomes
 *   - partialize persists NO PII (only filter state); clearAudit wipes all slices
 *
 * Pattern: mirrors customers.store.test.ts from US-008.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../service/audit.service', () => ({
  auditService: {
    listAuditLogs: jest.fn(),
    listConflicts: jest.fn(),
    getStaffSummary: jest.fn(),
    getMyActivity: jest.fn(),
    exportAuditLogs: jest.fn(),
  },
}))

jest.mock('@utils/exportFile', () => ({
  exportTextFile: jest.fn(),
}))

import axios from 'axios'
import { auditService } from '../../service/audit.service'
import { exportTextFile } from '@utils/exportFile'
import { useAuditStore } from '../audit.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type {
  AuditLogDto,
  AuditLogsResult,
  ConflictDto,
  MyActivityResult,
} from '../../../../types/audit'

const svc = auditService as jest.Mocked<typeof auditService>
const exportFileMock = exportTextFile as jest.MockedFunction<typeof exportTextFile>
const VENDOR_ID = 'vendor-42'

function setActiveVendor(vendorId: string | null): void {
  useAuthStore.setState({
    vendorContext: vendorId
      ? { vendorId, vendorName: 'Test Vendor', role: 'vendor_owner' }
      : null,
  })
}

function buildLog(id: string, overrides: Partial<AuditLogDto> = {}): AuditLogDto {
  return {
    id,
    timestamp: '2026-06-12T06:15:00Z',
    actionType: 'delivery_marked',
    actionLabel: 'Delivery Marked',
    entityType: 'daily_supply',
    entityId: `ds-${id}`,
    user: { id: 'staff-1', name: 'Raju', role: 'staff' },
    customer: { id: 'c1', name: 'Anil' },
    supplyList: { id: 'l1', name: 'Morning Milk' },
    details: { status: 'DELIVERED' },
    ipAddress: '1.2.3.4',
    ...overrides,
  }
}

function buildResult(logs: AuditLogDto[], page = 1, total = logs.length): AuditLogsResult {
  return {
    auditLogs: logs,
    pagination: { page, limit: 50, total, totalPages: Math.max(1, Math.ceil(total / 50)) },
    filters: { availableStaff: [{ id: 'staff-1', name: 'Raju' }], availableActionTypes: ['delivery_marked'] },
  }
}

/** Builds an axios-shaped error with a given status (or none = network/offline). */
function axiosError(status?: number): unknown {
  return {
    isAxiosError: true,
    response: status ? { status, data: { error: { code: 'X', correlationId: 'cid' } } } : undefined,
    config: { url: '/x' },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(axios, 'isAxiosError').mockImplementation(
    (e: unknown): e is import('axios').AxiosError =>
      !!e && typeof e === 'object' && (e as { isAxiosError?: boolean }).isAxiosError === true,
  )
  setActiveVendor(VENDOR_ID)
  useAuditStore.getState().clearAudit()
})

describe('useAuditStore', () => {
  // -------------------------------------------------------------------------
  // Guard: no vendor → no fetch
  // -------------------------------------------------------------------------
  it('does not call the service when there is no active vendor', async () => {
    setActiveVendor(null)
    await useAuditStore.getState().fetchAuditLogs()
    expect(svc.listAuditLogs).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // fetchAuditLogs
  // -------------------------------------------------------------------------
  it('fetchAuditLogs populates logs, pagination, filters', async () => {
    svc.listAuditLogs.mockResolvedValue(buildResult([buildLog('1'), buildLog('2')]))
    await useAuditStore.getState().fetchAuditLogs()
    const s = useAuditStore.getState()
    expect(s.logs).toHaveLength(2)
    expect(s.pagination?.total).toBe(2)
    expect(s.filters.availableStaff).toHaveLength(1)
    expect(s.logsError).toBeNull()
  })

  it('passes the JWT-derived vendorId to the service', async () => {
    svc.listAuditLogs.mockResolvedValue(buildResult([]))
    await useAuditStore.getState().fetchAuditLogs()
    expect(svc.listAuditLogs).toHaveBeenCalledWith(VENDOR_ID, expect.any(Object))
  })

  it('appends logs when page > 1, replaces on page 1', async () => {
    svc.listAuditLogs.mockResolvedValueOnce(buildResult([buildLog('1')], 1, 2))
    await useAuditStore.getState().fetchAuditLogs({ page: 1 })
    svc.listAuditLogs.mockResolvedValueOnce(buildResult([buildLog('2')], 2, 2))
    await useAuditStore.getState().fetchAuditLogs({ page: 2 })
    expect(useAuditStore.getState().logs.map((l) => l.id)).toEqual(['1', '2'])
  })

  it('maps a 403 to roles.error_forbidden and clears rows', async () => {
    svc.listAuditLogs.mockRejectedValue(axiosError(403))
    await useAuditStore.getState().fetchAuditLogs()
    const s = useAuditStore.getState()
    expect(s.logsError).toBe('roles.error_forbidden')
    expect(s.logs).toEqual([])
  })

  it('offline preserves cached logs (does not clear)', async () => {
    svc.listAuditLogs.mockResolvedValueOnce(buildResult([buildLog('1')]))
    await useAuditStore.getState().fetchAuditLogs({ page: 1 })
    svc.listAuditLogs.mockRejectedValueOnce(axiosError(undefined)) // network error
    await useAuditStore.getState().fetchAuditLogs({ page: 1 })
    const s = useAuditStore.getState()
    expect(s.logsError).toBe('common.offline_message')
    expect(s.logs).toHaveLength(1) // preserved
  })

  // -------------------------------------------------------------------------
  // fetchConflicts / fetchStaffSummary / fetchMyActivity
  // -------------------------------------------------------------------------
  it('fetchConflicts populates conflicts', async () => {
    const conflicts: ConflictDto[] = [
      {
        id: 'd1',
        deliveryDate: '2026-06-11',
        customer: { id: 'c1', name: 'Anil' },
        supplyList: { id: 'l1', name: 'Milk' },
        staffAction: { timestamp: 't', staff: { id: 's1', name: 'Raju' }, status: 'DELIVERED' },
        overrideAction: { timestamp: 't2', by: 'owner', status: 'LEAVE', timeDiffMinutes: 15 },
      },
    ]
    svc.listConflicts.mockResolvedValue(conflicts)
    await useAuditStore.getState().fetchConflicts()
    expect(useAuditStore.getState().conflicts).toHaveLength(1)
  })

  it('fetchStaffSummary error maps to an i18n key', async () => {
    svc.getStaffSummary.mockRejectedValue(axiosError(404))
    await useAuditStore.getState().fetchStaffSummary()
    expect(useAuditStore.getState().summaryError).toBe('audit.error_no_membership')
  })

  it('fetchMyActivity populates activity + summary', async () => {
    const result: MyActivityResult = {
      activity: [
        {
          id: 'a1',
          timestamp: 't',
          actionType: 'delivery_marked',
          actionLabel: 'Delivery Marked',
          customer: null,
          supplyList: null,
          details: null,
        },
      ],
      summary: { todayActions: 3, thisWeekActions: 9, thisMonthActions: 30 },
    }
    svc.getMyActivity.mockResolvedValue(result)
    await useAuditStore.getState().fetchMyActivity()
    const s = useAuditStore.getState()
    expect(s.myActivity).toHaveLength(1)
    expect(s.myActivitySummary?.todayActions).toBe(3)
  })

  // -------------------------------------------------------------------------
  // exportLogs
  // -------------------------------------------------------------------------
  it('exportLogs returns "shared" when the share sheet opens', async () => {
    svc.exportAuditLogs.mockResolvedValue('Timestamp,Action\n"t","x"')
    exportFileMock.mockResolvedValue({ shared: true, uri: 'file://x.csv' })
    const outcome = await useAuditStore.getState().exportLogs()
    expect(outcome).toBe('shared')
    expect(svc.exportAuditLogs).toHaveBeenCalledWith(VENDOR_ID, expect.objectContaining({ format: 'csv' }))
  })

  it('exportLogs returns "unavailable" when sharing is not available', async () => {
    svc.exportAuditLogs.mockResolvedValue('csv')
    exportFileMock.mockResolvedValue({ shared: false })
    expect(await useAuditStore.getState().exportLogs()).toBe('unavailable')
  })

  it('exportLogs returns "failed" when the request throws', async () => {
    svc.exportAuditLogs.mockRejectedValue(axiosError(500))
    expect(await useAuditStore.getState().exportLogs()).toBe('failed')
  })

  // -------------------------------------------------------------------------
  // Filters + lifecycle
  // -------------------------------------------------------------------------
  it('filter setters update persisted filter state', () => {
    useAuditStore.getState().setStaffFilter('staff-9')
    useAuditStore.getState().setActionFilter('payment_marked')
    useAuditStore.getState().setDateRange('2026-06-01', '2026-06-12')
    const s = useAuditStore.getState()
    expect(s.filterStaffId).toBe('staff-9')
    expect(s.filterActionType).toBe('payment_marked')
    expect(s.filterStartDate).toBe('2026-06-01')
    expect(s.filterEndDate).toBe('2026-06-12')
  })

  it('partialize persists ONLY non-PII filter state', () => {
    const persisted = useAuditStore.persist.getOptions().partialize?.({
      ...useAuditStore.getState(),
      filterStaffId: 'staff-1',
      logs: [buildLog('1')],
    } as never) as Record<string, unknown>
    expect(Object.keys(persisted).sort()).toEqual(
      ['filterActionType', 'filterEndDate', 'filterStaffId', 'filterStartDate'].sort(),
    )
    expect(persisted.logs).toBeUndefined()
  })

  it('clearAudit wipes all slices and filters', async () => {
    svc.listAuditLogs.mockResolvedValue(buildResult([buildLog('1')]))
    await useAuditStore.getState().fetchAuditLogs()
    useAuditStore.getState().setStaffFilter('staff-1')
    useAuditStore.getState().clearAudit()
    const s = useAuditStore.getState()
    expect(s.logs).toEqual([])
    expect(s.conflicts).toEqual([])
    expect(s.staffSummary).toEqual([])
    expect(s.myActivity).toEqual([])
    expect(s.filterStaffId).toBeNull()
  })
})
