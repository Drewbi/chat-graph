import { memo, useRef, useMemo } from "react"
import { Area, AreaChart, Brush, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFilteredConversations, getTopNWeeklyData, type ConversationTypeFilter } from "@/lib/data"
import { indexToCoralColor } from "@/lib/colors"
import type { ConversationSummary } from "@/lib/types"

function formatWeekTick(value: number): string {
  const d = new Date(value)
  return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
}

interface StackedAreaCardProps {
  n: number
  filter: ConversationTypeFilter[]
  fromTs: number
  toTs: number
  onWindowChange: (fromTs: number, toTs: number) => void
}

export const StackedAreaCard = memo(function StackedAreaCard({
  n,
  filter,
  fromTs,
  toTs,
  onWindowChange,
}: StackedAreaCardProps) {
  const topNSummaries = useMemo<ConversationSummary[]>(
    () => getFilteredConversations(filter).slice(0, n),
    [n, filter]
  )

  const topNMaxMessage = topNSummaries[0].totalMessages ?? null;
  const weeklyData = useMemo(() => getTopNWeeklyData(n, filter), [n, filter])

  const { chartConfig, allAreaData, overviewData } = useMemo(() => {
    const config: ChartConfig = {}
    topNSummaries.forEach((s: ConversationSummary, i: number) => {
      config[`c${i}`] = { label: s.title, color: indexToCoralColor(i, topNSummaries.length) }
    })

    const all = weeklyData.map((point) => {
      const row: Record<string, number | string> = {
        week: point.week,
        weekStart: point.weekStart,
      }
      topNSummaries.forEach((s: ConversationSummary, i: number) => {
        row[`c${i}`] = (point[s.title] as number) ?? 0
      })
      return row
    })

    // Overview: full dataset, fixed scale — never changes with window
    const overview = all.map((d) => ({
      weekStart: d.weekStart,
      total: topNSummaries.reduce((sum, _, i) => sum + (Number(d[`c${i}`]) || 0), 0),
    }))

    return { chartConfig: config, allAreaData: all, overviewData: overview }
  }, [topNSummaries, weeklyData])

  const windowedAreaData = useMemo(
    () => allAreaData.filter((d) => (d.weekStart as number) >= fromTs && (d.weekStart as number) <= toTs),
    [allAreaData, fromTs, toTs]
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const brushStart = useMemo(() => {
    const idx = allAreaData.findIndex((d) => (d.weekStart as number) >= fromTs)
    return idx === -1 ? 0 : idx
  }, [allAreaData, fromTs])

  const brushEnd = useMemo(() => {
    for (let i = allAreaData.length - 1; i >= 0; i--) {
      if ((allAreaData[i].weekStart as number) <= toTs) return i
    }
    return allAreaData.length - 1
  }, [allAreaData, toTs])

  if (topNSummaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No conversation data found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Main chart — windowed view */}
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <AreaChart data={windowedAreaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="weekStart"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatWeekTick}
              tickCount={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} width={36} />
            <ChartTooltip
              content={({ content: _, ...props }) => (
                <ChartTooltipContent
                  {...props}
                  payload={props.payload
                    ?.filter((p) => Number(p.value) > 0)
                    .sort((a, b) => Number(b.value) - Number(a.value))}
                  labelFormatter={(_label, payload) => {
                    const ts = payload?.[0]?.payload?.weekStart
                    if (!ts) return ""
                    return new Date(ts).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  }}
                />
              )}
            />
            {topNSummaries.map((convo: ConversationSummary, i: number) => (
              <Area
                key={`c${i}`}
                type="monotone"
                dataKey={`c${i}`}
                stackId="1"
                stroke="none"
                fill={`hsla(18, ${topNMaxMessage ? 20 + (convo.totalMessages / topNMaxMessage) * 80 : 20}%, 63%, 1)`}
                fillOpacity={1}
              />
            ))}
          </AreaChart>
        </ChartContainer>

        {/* Overview — area shape and brush are separate so the area never rescales */}
        <div className="relative h-16 w-full">
          {/* Area shape: fixed domain, no brush, never rescales */}
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overviewData} margin={{ top: 2, right: 8, left: 36, bottom: 0 }}>
                <XAxis hide dataKey="weekStart" type="number" scale="time" domain={["dataMin", "dataMax"]} />
                <YAxis hide domain={[0, Math.max(...overviewData.map((d) => d.total), 1)]} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--muted-foreground)"
                  fill="var(--muted-foreground)"
                  fillOpacity={0.2}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Brush only — overlaid on top, same margins so indices align */}
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overviewData} margin={{ top: 2, right: 8, left: 36, bottom: 0 }}>
                <XAxis hide dataKey="weekStart" />
                <YAxis hide />
                <Brush
                  dataKey="weekStart"
                  startIndex={brushStart}
                  endIndex={brushEnd}
                  height={64}
                  travellerWidth={6}
                  fill="transparent"
                  stroke="var(--border)"
                  tickFormatter={formatWeekTick}
                  onChange={(range) => {
                    if (!range || range.startIndex == null || range.endIndex == null) return
                    const from = overviewData[range.startIndex]?.weekStart as number | undefined
                    const to = overviewData[range.endIndex]?.weekStart as number | undefined
                    if (from == null || to == null) return
                    if (debounceRef.current) clearTimeout(debounceRef.current)
                    debounceRef.current = setTimeout(() => onWindowChange(from, to), 300)
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
