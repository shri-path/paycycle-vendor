/**
 * Audit Service Tests (US-007)
 * Purpose: verify the service returns the expected shapes in mock mode.
 * Covers:
 *   - listAuditLogs returns { auditLogs, pagination, filters } and applies filters
 *   - all ids are strings; pagination math is correct
 *   - listConflicts / getStaffSummary / getMyActivity return the right shapes
 *   - exportAuditLogs returns a CSV string with the documented header
 *
 * Runs against the mock branch (isMockMode true) — no real network is touched.
 */

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

import { auditService } from '../audit.service'

const VENDOR_ID = 'vendor-1'

describe('auditService (mock mode)', () => {
  describe('listAuditLogs', () => {
    it('returns auditLogs + pagination + filters', async () => {
      const result = await auditService.listAuditLogs(VENDOR_ID)
      expect(Array.isArray(result.auditLogs)).toBe(true)
      expect(result.auditLogs.length).toBeGreaterThan(0)
      expect(typeof result.pagination.total).toBe('number')
      expect(Array.isArray(result.filters.availableStaff)).toBe(true)
      expect(Array.isArray(result.filters.availableActionTypes)).toBe(true)
    })

    it('all log ids are strings and required fields present', async () => {
      const { auditLogs } = await auditService.listAuditLogs(VENDOR_ID)
      for (const log of auditLogs) {
        expect(typeof log.id).toBe('string')
        expect(typeof log.timestamp).toBe('string')
        expect(typeof log.actionType).toBe('string')
        expect(typeof log.actionLabel).toBe('string')
        expect(['owner', 'staff']).toContain(log.user.role)
      }
    })

    it('filters by staffId', async () => {
      const all = await auditService.listAuditLogs(VENDOR_ID)
      const target = all.auditLogs.find((l) => l.user.role === 'staff')
      expect(target).toBeDefined()
      const filtered = await auditService.listAuditLogs(VENDOR_ID, { staffId: target!.user.id })
      expect(filtered.auditLogs.every((l) => l.user.id === target!.user.id)).toBe(true)
    })

    it('filters by actionType', async () => {
      const filtered = await auditService.listAuditLogs(VENDOR_ID, {
        actionType: 'delivery_marked',
      })
      expect(filtered.auditLogs.every((l) => l.actionType === 'delivery_marked')).toBe(true)
    })

    it('computes totalPages from total/limit', async () => {
      const result = await auditService.listAuditLogs(VENDOR_ID, { limit: 2, page: 1 })
      expect(result.pagination.limit).toBe(2)
      expect(result.pagination.totalPages).toBe(Math.ceil(result.pagination.total / 2))
      expect(result.auditLogs.length).toBeLessThanOrEqual(2)
    })
  })

  describe('listConflicts', () => {
    it('returns an array of conflicts with staff + override actions', async () => {
      const conflicts = await auditService.listConflicts(VENDOR_ID)
      expect(Array.isArray(conflicts)).toBe(true)
      for (const c of conflicts) {
        expect(typeof c.id).toBe('string')
        expect(typeof c.staffAction.staff.name).toBe('string')
        expect(typeof c.overrideAction.timeDiffMinutes).toBe('number')
      }
    })
  })

  describe('getStaffSummary', () => {
    it('returns per-staff summaries with totals', async () => {
      const summary = await auditService.getStaffSummary(VENDOR_ID)
      expect(summary.length).toBeGreaterThan(0)
      for (const s of summary) {
        expect(typeof s.staffId).toBe('string')
        expect(typeof s.totalActions).toBe('number')
        expect(Array.isArray(s.byActionType)).toBe(true)
      }
    })

    it('filters by staffId', async () => {
      const summary = await auditService.getStaffSummary(VENDOR_ID, { staffId: 'staff-1' })
      expect(summary.every((s) => s.staffId === 'staff-1')).toBe(true)
    })
  })

  describe('getMyActivity', () => {
    it('returns activity + rolling summary counts', async () => {
      const result = await auditService.getMyActivity(VENDOR_ID)
      expect(Array.isArray(result.activity)).toBe(true)
      expect(typeof result.summary.todayActions).toBe('number')
      expect(typeof result.summary.thisWeekActions).toBe('number')
      expect(typeof result.summary.thisMonthActions).toBe('number')
    })
  })

  describe('exportAuditLogs', () => {
    it('returns a CSV string with the documented header columns', async () => {
      const csv = await auditService.exportAuditLogs(VENDOR_ID, { format: 'csv' })
      expect(typeof csv).toBe('string')
      const firstLine = csv.split('\n')[0]
      expect(firstLine).toBe('Timestamp,Action,User,Role,Customer,Supply List,Details')
      // Has at least one data row beyond the header.
      expect(csv.split('\n').length).toBeGreaterThan(1)
    })
  })
})
