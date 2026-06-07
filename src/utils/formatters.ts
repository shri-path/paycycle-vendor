/**
 * formatters — pure display/formatting helpers.
 * No side effects, no PII logging. Used by screens to format values for render.
 */

/**
 * Masks a phone number for display, keeping the country code and last 4 digits
 * visible (e.g. "+919876543210" -> "+91 ••••••3210"). Never logs or exposes the
 * full number — for safe on-screen display only.
 */
export function maskPhone(full: string): string {
  if (!full) return full
  const hasPlus = full.trim().startsWith('+')
  const digits = full.replace(/\D/g, '')
  if (digits.length < 4) return full
  const local = digits.slice(-10)
  const cc = digits.slice(0, digits.length - local.length)
  const masked = '•'.repeat(Math.max(local.length - 4, 0)) + local.slice(-4)
  const ccPart = cc ? `${hasPlus ? '+' : ''}${cc} ` : hasPlus ? '+' : ''
  return `${ccPart}${masked}`
}
