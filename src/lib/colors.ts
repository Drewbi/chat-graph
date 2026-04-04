/**
 * Coral gradient utilities.
 * Base: hsl(18, 83%, 63%) — coral-glow
 */

/**
 * For stacked chart layers — bottom layer is lightest, top is darkest.
 * Creates a natural gradient as layers stack up.
 */
export function indexToCoralColor(index: number, total: number): string {
  const lightness = 78 - (index / Math.max(total - 1, 1)) * 40
  return `hsl(18, 83%, ${lightness}%)`
}

/**
 * For ranked lists — rank 0 (most messages) is deepest coral, fades down the list.
 */
export function rankToCoralColor(index: number, total: number): string {
  const lightness = 50 + (index / Math.max(total - 1, 1)) * 28
  return `hsl(18, 83%, ${lightness}%)`
}
