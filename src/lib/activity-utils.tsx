// Shared utilities for activity grid components

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

export function cellColor(count: number, max: number): string {
  if (count <= 0) return "hsl(220, 14%, 91%)"
  const t = Math.sqrt(count / max)
  return `hsl(18, ${Math.round(40 + t * 60)}%, ${Math.round(72 - t * 30)}%)`
}

// ---------------------------------------------------------------------------
// Streak computation
// ---------------------------------------------------------------------------

export type StreakPos = "start" | "mid" | "end" | "solo"

export function isConsecutiveDay(a: string, b: string): boolean {
  return (
    new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime() === 86400000
  )
}

export function computeStreaks(
  sortedDateStrs: string[],
  minLen = 5,
): Map<string, { pos: StreakPos; len: number }> {
  const out = new Map<string, { pos: StreakPos; len: number }>()
  let i = 0
  while (i < sortedDateStrs.length) {
    let j = i
    while (j + 1 < sortedDateStrs.length && isConsecutiveDay(sortedDateStrs[j], sortedDateStrs[j + 1])) j++
    const len = j - i + 1
    if (len >= minLen) {
      for (let k = i; k <= j; k++) {
        const pos: StreakPos = len === 1 ? "solo" : k === i ? "start" : k === j ? "end" : "mid"
        out.set(sortedDateStrs[k], { pos, len })
      }
    }
    i = j + 1
  }
  return out
}

export function longestRunLength(sortedDateStrs: string[]): number {
  if (!sortedDateStrs.length) return 0
  let max = 1, cur = 1
  for (let i = 1; i < sortedDateStrs.length; i++) {
    cur = isConsecutiveDay(sortedDateStrs[i - 1], sortedDateStrs[i]) ? cur + 1 : 1
    if (cur > max) max = cur
  }
  return max
}

// ---------------------------------------------------------------------------
// Floating tooltip
// ---------------------------------------------------------------------------

export interface TooltipInfo {
  x: number
  y: number
  title: string
  lines: { label: string; value: string | number }[]
}

export function FloatingTooltip({ info }: { info: TooltipInfo }) {
  return (
    <div
      className="fixed z-50 pointer-events-none rounded-md border bg-popover px-3 py-2 text-xs shadow-lg"
      style={{ left: info.x + 14, top: info.y - 8, maxWidth: 220 }}
    >
      <p className="font-semibold mb-1">{info.title}</p>
      {info.lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-4 text-muted-foreground">
          <span className="truncate">{l.label}</span>
          <span className="tabular-nums font-medium text-foreground">{l.value}</span>
        </div>
      ))}
    </div>
  )
}
