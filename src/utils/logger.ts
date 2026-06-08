/**
 * Shared Error Logger
 * Purpose: Single entry point for persisting runtime errors to a daily log file.
 *
 * Behaviour (see CLAUDE.md "Error Logging"):
 * - Writes to a `Logs/` directory inside the app document directory: Logs/YYYY-MM-DD.txt
 * - Each entry: ISO timestamp, message + stack, correlationId (from API error) + context.
 * - NEVER logs customer PII (phone, address, name). Only IDs / correlation data.
 * - Never throws — logging must not break the catch block that called it.
 */

import axios from 'axios'

/** Context attached to a log entry to aid debugging (no PII). */
export interface LogContext {
  screen?: string
  action?: string
  endpoint?: string
  correlationId?: string
}

/** Extracts a correlationId from an API error response when present. */
export function extractCorrelationId(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { correlationId?: string; error?: { correlationId?: string } }
      | undefined
    const fromBody = data?.error?.correlationId ?? data?.correlationId
    if (typeof fromBody === 'string') return fromBody
    const header = err.response?.headers?.['x-correlation-id']
    if (typeof header === 'string') return header
  }
  return undefined
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

function toStack(err: unknown): string {
  return err instanceof Error && err.stack ? err.stack : ''
}

function todayFileName(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}.txt`
}

/**
 * Appends a single line to today's log file via expo-file-system.
 * Lazily required and fully guarded so it is safe under tests / web / Node.
 */
function appendToDailyLog(line: string): void {
  try {
    // Lazy require keeps this module safe where expo-file-system is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      Paths?: { document?: unknown }
      Directory?: new (...args: unknown[]) => {
        exists: boolean
        create: (opts?: { intermediates?: boolean }) => void
      }
      File?: new (...args: unknown[]) => {
        exists: boolean
        create: () => void
        text: () => string
        write: (content: string) => void
      }
    }

    const documentRoot = FileSystem?.Paths?.document
    if (!FileSystem?.Directory || !FileSystem?.File || !documentRoot) return

    const dir = new FileSystem.Directory(documentRoot, 'Logs')
    if (!dir.exists) dir.create({ intermediates: true })

    const file = new FileSystem.File(dir, todayFileName(new Date()))
    let existing = ''
    if (file.exists) {
      try {
        existing = file.text()
      } catch {
        existing = ''
      }
    } else {
      file.create()
    }
    file.write(existing + line)
  } catch {
    // Swallow — logging must never crash the app.
  }
}

/**
 * Logs a caught error to the daily log file (and console in dev).
 * Always call alongside the user-facing error handling — never instead of it.
 */
export async function logError(err: unknown, ctx?: LogContext): Promise<void> {
  const correlationId = ctx?.correlationId ?? extractCorrelationId(err)
  const entry = {
    ts: new Date().toISOString(),
    message: toMessage(err),
    stack: toStack(err),
    correlationId: correlationId ?? null,
    screen: ctx?.screen ?? null,
    action: ctx?.action ?? null,
    endpoint: ctx?.endpoint ?? null,
  }

  const line = `${entry.ts} [${entry.screen ?? '-'}:${entry.action ?? '-'}] ` +
    `correlationId=${entry.correlationId ?? '-'} ` +
    `endpoint=${entry.endpoint ?? '-'} ` +
    `message=${entry.message}` +
    (entry.stack ? `\n${entry.stack}` : '') +
    '\n'

  if (__DEV__) {
    console.warn(`[logError] ${line}`)
  }

  appendToDailyLog(line)
}

export default logError
