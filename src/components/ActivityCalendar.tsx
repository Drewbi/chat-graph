import { useState, useMemo } from "react"
import type { DailyPoint } from "@/lib/types"
import { cellColor, computeStreaks, FloatingTooltip, type StreakPos, type TooltipInfo } from "@/lib/activity-utils"

// ---------------------------------------------------------------------------
// Day cell
// ---------------------------------------------------------------------------

interface DayCellProps {
  count: number
  maxCount: number
  dateStr: string
  dayData: DailyPoint | undefined
  streak: { pos: StreakPos; len: number } | undefined
  silenceEnd: number | undefined
  isGroup: boolean
  onHover: (info: TooltipInfo | null) => void
}

function DayCell({ count, maxCount, dateStr, dayData, streak, silenceEnd, isGroup, onHover }: DayCellProps) {
  const bg = cellColor(count, maxCount)
  const s = streak

  function buildTooltip(e: React.MouseEvent): TooltipInfo {
    const title = new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    const lines: { label: string; value: string | number }[] = [
      { label: "Total", value: count },
    ]
    if (dayData) {
      if (isGroup) {
        Object.entries(dayData.senderCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([name, n]) => lines.push({ label: name, value: n }))
      } else {
        lines.push({ label: "Sent", value: dayData.sent })
        lines.push({ label: "Received", value: dayData.received })
      }
    }
    return { x: e.clientX, y: e.clientY, title, lines }
  }

  const showActivityBadge = s && (s.pos === "end" || s.pos === "solo")

  return (
    <div className="relative aspect-square">
      <div
        className={`absolute inset-1 rounded-sm ${count > 0 ? "cursor-pointer hover:opacity-70 transition-opacity" : "cursor-default"}`}
        style={{ backgroundColor: bg }}
        onMouseEnter={(e) => count > 0 && onHover(buildTooltip(e))}
        onMouseMove={(e) => count > 0 && onHover(buildTooltip(e))}
        onMouseLeave={() => onHover(null)}
      />
      {showActivityBadge && (
        <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
          <span className="rounded-md bg-black/40 p-1 text-[10px] font-bold text-white leading-none">
            {s.len}d
          </span>
        </div>
      )}
      {silenceEnd !== undefined && (
        <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
          <span className="rounded-sm bg-black/25 p-1 text-[10px] font-semibold text-white/80 leading-none">
            {silenceEnd}d
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

interface MonthGridProps {
  year: number
  month: number
  dayMap: Map<string, DailyPoint>
  maxCount: number
  streakMap: Map<string, { pos: StreakPos; len: number }>
  silenceEnds: Map<string, number>
  isGroup: boolean
  onHover: (info: TooltipInfo | null) => void
}

function MonthGrid({ year, month, dayMap, maxCount, streakMap, silenceEnds, isGroup, onHover }: MonthGridProps) {
  const label = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-7 gap-y-2">
        {Array.from({ length: daysInMonth }, (_, idx) => {
          const day = idx + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dayData = dayMap.get(dateStr)
          return (
            <DayCell
              key={dateStr}
              count={dayData?.total ?? 0}
              maxCount={maxCount}
              dateStr={dateStr}
              dayData={dayData}
              streak={streakMap.get(dateStr)}
              silenceEnd={silenceEnds.get(dateStr)}
              isGroup={isGroup}
              onHover={onHover}
            />
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gap entry
// ---------------------------------------------------------------------------

function fmtMonth(year: number, month: number, includeYear: boolean): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-AU", {
    month: "short",
    year: includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  })
}

interface GapEntryProps {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
  count: number
}

function GapEntry({ startYear, startMonth, endYear, endMonth, count }: GapEntryProps) {
  const sameYear = startYear === endYear
  const label =
    count === 1
      ? fmtMonth(startYear, startMonth, true)
      : `${fmtMonth(startYear, startMonth, !sameYear)} – ${fmtMonth(endYear, endMonth, true)}`

  return (
    <div className="col-span-full flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-xs text-muted-foreground/60">
        {label} · {count} month{count !== 1 ? "s" : ""} silent
      </span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActivityCalendar
// ---------------------------------------------------------------------------

type CalendarItem =
  | { type: "month"; year: number; month: number }
  | { type: "gap"; startYear: number; startMonth: number; endYear: number; endMonth: number; count: number }

interface ActivityCalendarProps {
  dailyActivity: DailyPoint[]
  isGroup: boolean
}

export function ActivityCalendar({ dailyActivity, isGroup }: ActivityCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  const { dayMap, maxCount, byYear, streakMap, silenceEnds } = useMemo(() => {
    const map = new Map<string, DailyPoint>()
    for (const d of dailyActivity) map.set(d.dateStr, d)

    const max = Math.max(...dailyActivity.map((d) => d.total), 1)

    const activeSorted = dailyActivity
      .filter((d) => d.total > 0)
      .map((d) => d.dateStr)
      .sort()

    const streaks = computeStreaks(activeSorted)
    const empty = { dayMap: map, maxCount: max, byYear: [], streakMap: streaks, silenceEnds: new Map<string, number>() }
    if (!activeSorted.length) return empty

    const activeMonths = new Set(activeSorted.map((d) => d.slice(0, 7)))

    // Last grey day before activity resumes, for gaps ≥ 5 days within an active month
    const silenceEndMap = new Map<string, number>()
    for (let i = 1; i < activeSorted.length; i++) {
      const prevTs = new Date(activeSorted[i - 1] + "T00:00:00Z").getTime()
      const nextTs = new Date(activeSorted[i] + "T00:00:00Z").getTime()
      const gapDays = (nextTs - prevTs) / 86400000 - 1
      if (gapDays >= 5) {
        const lastSilentStr = new Date(nextTs - 86400000).toISOString().slice(0, 10)
        if (activeMonths.has(lastSilentStr.slice(0, 7))) {
          silenceEndMap.set(lastSilentStr, gapDays)
        }
      }
    }

    const firstDate = new Date(activeSorted[0] + "T00:00:00Z")
    const lastDate = new Date(activeSorted[activeSorted.length - 1] + "T00:00:00Z")
    let cy = firstDate.getUTCFullYear(), cm = firstDate.getUTCMonth()
    const ly = lastDate.getUTCFullYear(), lm = lastDate.getUTCMonth()

    const flatItems: CalendarItem[] = []
    let gapStart: { year: number; month: number } | null = null
    let gapEnd: { year: number; month: number } | null = null
    let gapCount = 0

    function flushGap() {
      if (gapStart && gapEnd && gapCount > 0) {
        flatItems.push({ type: "gap", startYear: gapStart.year, startMonth: gapStart.month, endYear: gapEnd.year, endMonth: gapEnd.month, count: gapCount })
      }
      gapStart = gapEnd = null
      gapCount = 0
    }

    while (cy < ly || (cy === ly && cm <= lm)) {
      const monthKey = `${cy}-${String(cm + 1).padStart(2, "0")}`
      if (activeMonths.has(monthKey)) {
        flushGap()
        flatItems.push({ type: "month", year: cy, month: cm })
      } else {
        if (!gapStart) gapStart = { year: cy, month: cm }
        gapEnd = { year: cy, month: cm }
        gapCount++
      }
      cm++
      if (cm > 11) { cm = 0; cy++ }
    }

    const grouped = new Map<number, CalendarItem[]>()
    for (const item of flatItems) {
      const year = item.type === "month" ? item.year : item.startYear
      const arr = grouped.get(year) ?? []
      arr.push(item)
      grouped.set(year, arr)
    }

    const years = Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, items]) => ({ year, items }))

    return { dayMap: map, maxCount: max, byYear: years, streakMap: streaks, silenceEnds: silenceEndMap }
  }, [dailyActivity])

  return (
    <div>
      {tooltip && <FloatingTooltip info={tooltip} />}
      <div className="flex flex-col gap-8">
        {byYear.map(({ year, items }) => (
          <div key={year}>
            <p className="mb-4 text-base font-semibold">{year}</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {items.map((item, i) =>
                item.type === "gap" ? (
                  <GapEntry key={`gap-${i}`} {...item} />
                ) : (
                  <MonthGrid
                    key={`${item.year}-${item.month}`}
                    year={item.year}
                    month={item.month}
                    dayMap={dayMap}
                    maxCount={maxCount}
                    streakMap={streakMap}
                    silenceEnds={silenceEnds}
                    isGroup={isGroup}
                    onHover={setTooltip}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
