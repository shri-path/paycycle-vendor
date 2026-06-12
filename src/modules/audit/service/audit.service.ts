/**
 * Audit Service (US-007)
 * Purpose: audit & accountability API calls — mock in dev, real API via httpClient.
 *
 * Multi-tenancy: vendorId appears only in the URL path for routing; it is derived
 * from the JWT on the server and never sent as user-controlled tenant data.
 *
 * Envelope: all GET endpoints use the standard `{ success, data }` shape — the
 * service returns `data.data`. The export endpoint is special: it returns a raw CSV
 * body (`text/csv`), so we request `responseType: 'text'` and return the string.
 *
 * All ids are STRINGS. This is a READ-ONLY domain (only the CSV export is a POST,
 * and it does not mutate state). Errors bubble up; the store maps them via
 * `mapApiError(_, 'audit')`.
 */

import { APIPath } from '@constants/apiPaths'
import { isMockMode, simulateNetworkDelay } from '@services/config'
import { httpClient } from '@services/http'
import type {
  AuditLogsResult,
  ConflictDto,
  StaffSummaryDto,
  MyActivityResult,
  ListAuditLogsOptions,
  StaffSummaryOptions,
  ExportAuditLogsInput,
} from '../../../types/audit'
import {
  buildMockAuditLogsResult,
  mockConflicts,
  mockStaffSummary,
  mockMyActivity,
  buildMockExportCsv,
} from './audit.mock'

export const auditService = {
  /**
   * GET /vendors/:vendorId/audit-logs
   * Owner: all entries; staff: own-only (server-forced). Standard envelope.
   */
  async listAuditLogs(
    vendorId: string,
    opts: ListAuditLogsOptions = {},
    signal?: AbortSignal,
  ): Promise<AuditLogsResult> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockAuditLogsResult({
        staffId: opts.staffId,
        actionType: opts.actionType,
        page: opts.page,
        limit: opts.limit,
      })
    }
    const { data } = await httpClient.get(APIPath.Audit.Logs(vendorId), {
      params: {
        staffId: opts.staffId,
        customerId: opts.customerId,
        actionType: opts.actionType,
        entityType: opts.entityType,
        startDate: opts.startDate,
        endDate: opts.endDate,
        page: opts.page,
        limit: opts.limit,
      },
      signal,
    })
    return data.data as AuditLogsResult
  },

  /**
   * GET /vendors/:vendorId/audit-logs/conflicts
   * Owner-only. Standard envelope → `data.conflicts`.
   */
  async listConflicts(vendorId: string, signal?: AbortSignal): Promise<ConflictDto[]> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return [...mockConflicts]
    }
    const { data } = await httpClient.get(APIPath.Audit.Conflicts(vendorId), { signal })
    return data.data.conflicts as ConflictDto[]
  },

  /**
   * GET /vendors/:vendorId/audit-logs/staff-summary
   * Owner-only. Standard envelope → `data.summary`.
   */
  async getStaffSummary(
    vendorId: string,
    opts: StaffSummaryOptions = {},
    signal?: AbortSignal,
  ): Promise<StaffSummaryDto[]> {
    if (isMockMode) {
      await simulateNetworkDelay()
      const rows = opts.staffId
        ? mockStaffSummary.filter((s) => s.staffId === opts.staffId)
        : mockStaffSummary
      return [...rows]
    }
    const { data } = await httpClient.get(APIPath.Audit.StaffSummary(vendorId), {
      params: {
        staffId: opts.staffId,
        startDate: opts.startDate,
        endDate: opts.endDate,
      },
      signal,
    })
    return data.data.summary as StaffSummaryDto[]
  },

  /**
   * GET /vendors/:vendorId/audit-logs/my-activity
   * Owner + staff (self-scoped). Standard envelope.
   */
  async getMyActivity(vendorId: string, signal?: AbortSignal): Promise<MyActivityResult> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return { activity: [...mockMyActivity.activity], summary: { ...mockMyActivity.summary } }
    }
    const { data } = await httpClient.get(APIPath.Audit.MyActivity(vendorId), { signal })
    return data.data as MyActivityResult
  },

  /**
   * POST /vendors/:vendorId/audit-logs/export
   * Owner-only. Returns a raw CSV string (`text/csv`). `format` is always 'csv'.
   */
  async exportAuditLogs(
    vendorId: string,
    input: ExportAuditLogsInput,
    signal?: AbortSignal,
  ): Promise<string> {
    if (isMockMode) {
      await simulateNetworkDelay()
      return buildMockExportCsv()
    }
    const { data } = await httpClient.post(APIPath.Audit.Export(vendorId), input, {
      responseType: 'text',
      signal,
    })
    return data as string
  },
}

export default auditService
