import { useState, useMemo } from "react"
import { cellColor, FloatingTooltip, type TooltipInfo } from "@/lib/activity-utils"

const MS_WEEK = 604800000

interface WeekCellProps {
  count: number
  maxCount: number
  weekStart: number
  sent: number
  received: number
  onHover: (info: TooltipInfo | null) => void
}

function WeekCell({ count, maxCount, weekStart, sent, received, onHover }: WeekCellProps) {
  const bg = cellColor(count, maxCount)

  function buildTooltip(e: React.MouseEvent): TooltipInfo {
    const title = `Week of ${new Date(weekStart).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })}`
    return {
      x: e.clientX,
      y: e.clientY,
      title,
      lines: [
        { label: "Total", value: count },
        { label: "Sent", value: sent },
        { label: "Received", value: received },
      ],
    }
  }

  return (
    <div
      className={`h-3.5 w-3.5 rounded-sm ${count > 0 ? "cursor-pointer hover:opacity-70 transition-opacity" : "cursor-default"}`}
      style={{ backgroundColor: bg }}
      onMouseEnter={(e) => count > 0 && onHover(buildTooltip(e))}
      onMouseMove={(e) => count > 0 && onHover(buildTooltip(e))}
      onMouseLeave={() => onHover(null)}
    />
  )
}

interface ActivityWeekGridProps {
  weeklyActivity: { week: string; weekStart: number; sent: number; received: number }[]
}

export function ActivityWeekGrid({ weeklyActivity }: ActivityWeekGridProps) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  const { maxCount, byYear } = useMemo(() => {
    if (!weeklyActivity.length) return { maxCount: 1, byYear: [] }

    const max = Math.max(...weeklyActivity.map((w) => w.sent + w.received), 1)

    const weekMap = new Map<number, (typeof weeklyActivity)[0]>()
    for (const w of weeklyActivity) weekMap.set(w.weekStart, w)

    const allTs = weeklyActivity.map((w) => w.weekStart).sort((a, b) => a - b)
    const firstTs = allTs[0]
    const lastTs = allTs[allTs.length - 1]

    const allWeeks: { weekStart: number; data: (typeof weeklyActivity)[0] | undefined }[] = []
    for (let ts = firstTs; ts <= lastTs; ts += MS_WEEK) {
      allWeeks.push({ weekStart: ts, data: weekMap.get(ts) })
    }

    const grouped = new Map<number, typeof allWeeks>()
    for (const w of allWeeks) {
      const year = new Date(w.weekStart).getUTCFullYear()
      const arr = grouped.get(year) ?? []
      arr.push(w)
      grouped.set(year, arr)
    }

    const years = Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, weeks]) => ({ year, weeks }))

    return { maxCount: max, byYear: years }
  }, [weeklyActivity])

  return (
    <div>
      {tooltip && <FloatingTooltip info={tooltip} />}
      <div className="flex flex-col gap-5">
        {byYear.map(({ year, weeks }) => (
          <div key={year}>
            <p className="mb-2 text-sm font-semibold">{year}</p>
            <div className="flex flex-wrap gap-0.5">
              {weeks.map(({ weekStart, data }) => (
                <WeekCell
                  key={weekStart}
                  count={data ? data.sent + data.received : 0}
                  maxCount={maxCount}
                  weekStart={weekStart}
                  sent={data?.sent ?? 0}
                  received={data?.received ?? 0}
                  onHover={setTooltip}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
