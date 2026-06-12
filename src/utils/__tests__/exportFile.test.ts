/**
 * exportFile tests (US-007).
 * The expo-file-system / expo-sharing modules are unavailable under Jest, so the util
 * must degrade gracefully to `{ shared: false }` without throwing. These tests assert
 * that guarantee (the happy path is covered indirectly via the audit store tests, which
 * mock exportTextFile).
 */

import { exportTextFile } from '../exportFile'

describe('exportTextFile', () => {
  it('returns { shared: false } without throwing when native modules are unavailable', async () => {
    const result = await exportTextFile('audit-logs-1.csv', 'a,b\n1,2', 'text/csv')
    expect(result.shared).toBe(false)
  })

  it('never throws for empty content', async () => {
    await expect(exportTextFile('empty.csv', '')).resolves.toBeDefined()
  })
})
