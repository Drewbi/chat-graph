import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getConversationDetail, ownerName } from "@/lib/data"
import { ArrowLeftIcon } from "lucide-react"

const chartConfig: ChartConfig = {
  sent: { label: "Sent", color: "hsl(218, 19%, 38%)" },
  received: { label: "Received", color: "hsl(18, 83%, 78%)" },
}

function formatWeekTick(value: number): string {
  const d = new Date(value)
  return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
}

interface ContactDetailProps {
  conversationKey: string
  onBack: () => void
}

export function ContactDetail({ conversationKey, onBack }: ContactDetailProps) {
  const detail = getConversationDetail(conversationKey)

  if (!detail) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Conversation not found.</p>
      </div>
    )
  }

  const { summary, weeklyActivity } = detail
  const firstDate = new Date(summary.firstTimestamp).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  })
  const lastDate = new Date(summary.lastTimestamp).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  })
  const sentPct =
    summary.totalMessages > 0
      ? Math.round((summary.sentMessages / summary.totalMessages) * 100)
      : 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{summary.title}</h1>
          <p className="text-sm text-muted-foreground">
            {summary.isGroup ? "Group · " : ""}{firstDate} – {lastDate}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total messages" value={summary.totalMessages.toLocaleString()} />
        <StatCard label={`Sent by ${ownerName.split(" ")[0]}`} value={`${summary.sentMessages.toLocaleString()} (${sentPct}%)`} />
        <StatCard label="Received" value={summary.receivedMessages.toLocaleString()} />
        <StatCard label="Active weeks" value={weeklyActivity.length.toLocaleString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart
              data={weeklyActivity}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
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
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.weekStart
                      if (!ts) return ""
                      return new Date(ts).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="sent" stackId="a" fill="var(--color-sent)" />
              <Bar dataKey="received" stackId="a" fill="var(--color-received)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
