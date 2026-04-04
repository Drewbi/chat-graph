/**
 * Fix Facebook's mojibake encoding.
 * Facebook exports store text as Latin-1 bytes interpreted as UTF-8 code points.
 * escape() converts the string to percent-encoded Latin-1, then
 * decodeURIComponent() reads those bytes as UTF-8.
 */
export function fixEncoding(str: string): string {
  try {
    return decodeURIComponent(escape(str))
  } catch {
    return str
  }
}
