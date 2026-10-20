/**
 * Whether a user agent belongs to Apple Safari (macOS or iOS). Chrome,
 * Edge, Firefox and Opera all include "Safari" in their user agents, so
 * they are excluded explicitly.
 */
export function isSafariUserAgent(userAgent: string): boolean {
  return (
    /safari/i.test(userAgent) &&
    !/chrome|chromium|crios|fxios|edg|opr|android/i.test(userAgent)
  )
}
