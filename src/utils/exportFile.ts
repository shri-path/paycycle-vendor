/**
 * exportFile — write a text payload to a file and open the OS share sheet.
 * Purpose: deliver server-generated CSV (US-007 audit export) to the user on mobile.
 *
 * Behaviour:
 * - Writes the content to the app document directory under `Exports/<filename>`.
 * - Opens the native share sheet via `expo-sharing` (`shareAsync`).
 * - Fully guarded + lazily required (same pattern as `logger.ts`) so unit tests, the
 *   web build, and environments without the native modules never crash.
 * - On web / unsupported platforms it returns `{ shared: false }` and the caller shows
 *   an info message instead of sharing.
 *
 * Security: never logs the content; CSV may contain PII (customer/staff names), so the
 * file lives only in the app sandbox and is handed straight to the share sheet.
 */

export interface ExportFileResult {
  /** True if the share sheet was opened; false if sharing is unavailable (e.g. web). */
  shared: boolean
  /** The on-disk URI of the written file, when a file was created. */
  uri?: string
}

/** Resolves the expo-file-system module if present, with the new Paths/File API. */
function resolveFileSystem():
  | {
      documentRoot: unknown
      Directory: new (...args: unknown[]) => {
        exists: boolean
        create: (opts?: { intermediates?: boolean }) => void
      }
      File: new (...args: unknown[]) => {
        uri: string
        exists: boolean
        create: () => void
        write: (content: string) => void
      }
    }
  | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      Paths?: { document?: unknown }
      Directory?: new (...args: unknown[]) => {
        exists: boolean
        create: (opts?: { intermediates?: boolean }) => void
      }
      File?: new (...args: unknown[]) => {
        uri: string
        exists: boolean
        create: () => void
        write: (content: string) => void
      }
    }
    const documentRoot = FileSystem?.Paths?.document
    if (!FileSystem?.Directory || !FileSystem?.File || !documentRoot) return null
    return {
      documentRoot,
      Directory: FileSystem.Directory,
      File: FileSystem.File,
    }
  } catch {
    return null
  }
}

/** Resolves the expo-sharing module if present. */
function resolveSharing():
  | {
      isAvailableAsync: () => Promise<boolean>
      shareAsync: (uri: string, opts?: Record<string, unknown>) => Promise<void>
    }
  | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as {
      isAvailableAsync?: () => Promise<boolean>
      shareAsync?: (uri: string, opts?: Record<string, unknown>) => Promise<void>
    }
    if (!Sharing?.isAvailableAsync || !Sharing?.shareAsync) return null
    return {
      isAvailableAsync: Sharing.isAvailableAsync,
      shareAsync: Sharing.shareAsync,
    }
  } catch {
    return null
  }
}

/**
 * Writes `content` to a file named `filename` and opens the share sheet.
 * Returns `{ shared:false }` (without throwing) when file-system or sharing is
 * unavailable so the caller can fall back to an info message.
 *
 * @param filename  e.g. "audit-logs-1718200000000.csv"
 * @param content   the file body (CSV text)
 * @param mimeType  MIME type for the share intent (default text/csv)
 */
export async function exportTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
): Promise<ExportFileResult> {
  const fs = resolveFileSystem()
  if (!fs) return { shared: false }

  let uri: string
  try {
    const dir = new fs.Directory(fs.documentRoot, 'Exports')
    if (!dir.exists) dir.create({ intermediates: true })
    const file = new fs.File(dir, filename)
    if (!file.exists) file.create()
    file.write(content)
    uri = file.uri
  } catch {
    return { shared: false }
  }

  const sharing = resolveSharing()
  if (!sharing) return { shared: false, uri }

  try {
    const available = await sharing.isAvailableAsync()
    if (!available) return { shared: false, uri }
    await sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: filename,
      UTI: 'public.comma-separated-values-text',
    })
    return { shared: true, uri }
  } catch {
    return { shared: false, uri }
  }
}

export default exportTextFile
