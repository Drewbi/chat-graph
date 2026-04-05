import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getConversationDetail, ownerName } from "@/lib/data"
import { longestRunLength } from "@/lib/activity-utils"
import { ArrowLeftIcon } from "lucide-react"
import { ActivityCalendar } from "./ActivityCalendar"
import { ActivityWeekGrid } from "./ActivityWeekGrid"

interface ContactDetailProps {
  conversationKey: string
  onBack: () => void
}

export function ContactDetail({ conversationKey, onBack }: ContactDetailProps) {
  const [granularity, setGranularity] = useState<"day" | "week">("day")
  const detail = getConversationDetail(conversationKey)

  // Hooks must be called unconditionally
  const activeDays = useMemo(
    () => detail?.dailyActivity.filter((d) => d.total > 0) ?? [],
    [detail],
  )
  const activeDayStrs = useMemo(
    () => activeDays.map((d) => d.dateStr).sort(),
    [activeDays],
  )
  const longestStreak = useMemo(() => longestRunLength(activeDayStrs), [activeDayStrs])

  if (!detail) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Conversation not found.</p>
      </div>
    )
  }

  const { summary, weeklyActivity, dailyActivity } = detail

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

  const realTotal = summary.sentMessages + summary.receivedMessages
  const activeWeeks = weeklyActivity.filter((w) => w.sent + w.received > 0)
  const avgPerActiveDay =
    activeDays.length > 0 ? (realTotal / activeDays.length).toFixed(1) : "—"
  const avgPerActiveWeek =
    activeWeeks.length > 0 ? (realTotal / activeWeeks.length).toFixed(1) : "—"

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{summary.title}</h1>
          <p className="text-sm text-muted-foreground">
            {summary.isGroup ? "Group · " : ""}
            {firstDate} – {lastDate}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total messages" value={summary.totalMessages.toLocaleString()} />
        <StatCard
          label={`Sent by ${ownerName.split(" ")[0]}`}
          value={`${summary.sentMessages.toLocaleString()} (${sentPct}%)`}
        />
        <StatCard label="Received" value={summary.receivedMessages.toLocaleString()} />
        <StatCard label="Active days" value={activeDays.length.toLocaleString()} />
        <StatCard label="Active weeks" value={activeWeeks.length.toLocaleString()} />
        <StatCard label="Avg / active day" value={avgPerActiveDay} />
        <StatCard label="Avg / active week" value={avgPerActiveWeek} />
        <StatCard
          label="Longest streak"
          value={longestStreak > 0 ? `${longestStreak} days` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity</CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={granularity === "day" ? "default" : "ghost"}
                onClick={() => setGranularity("day")}
              >
                Day
              </Button>
              <Button
                size="sm"
                variant={granularity === "week" ? "default" : "ghost"}
                onClick={() => setGranularity("week")}
              >
                Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {granularity === "day" ? (
            <ActivityCalendar dailyActivity={dailyActivity} isGroup={summary.isGroup} />
          ) : (
            <ActivityWeekGrid weeklyActivity={weeklyActivity} />
          )}
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
