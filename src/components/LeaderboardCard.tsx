import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getConversationsInWindow, type ConversationTypeFilter } from "@/lib/data"
import { rankToCoralColor } from "@/lib/colors"
import type { ConversationSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

interface LeaderboardCardProps {
  onSelect: (key: string) => void
  filter: ConversationTypeFilter[]
  fromTs: number
  toTs: number
  isPending?: boolean
}

export function LeaderboardCard({ onSelect, filter, fromTs, toTs, isPending }: LeaderboardCardProps) {
  const conversations = useMemo(
    () => getConversationsInWindow(filter, fromTs, toTs),
    [filter, fromTs, toTs]
  )
  const maxMessages = conversations[0]?.totalMessages ?? 1
  const [displayCount, setDisplayCount] = useState(Math.min(conversations.length, 100))

  return (
    <Card className="relative flex flex-col">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
          <svg className="size-6 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}
      <CardHeader>
        <CardTitle>Top Conversations</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {conversations.slice(0, displayCount).map((conv, i) => (
            <LeaderboardRow
              key={conv.key}
              conversation={conv}
              rank={i + 1}
              maxMessages={maxMessages}
              color={rankToCoralColor(i, displayCount)}
              onClick={() => onSelect(conv.key)}
            />
          ))}
        </div>
        {conversations.length > displayCount && (
          <div className="mt-4 flex flex-col items-center">
            <Button onClick={() => setDisplayCount((val) => val + 20)}>Load More</Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              +{conversations.length - displayCount} more conversations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface LeaderboardRowProps {
  conversation: ConversationSummary
  rank: number
  maxMessages: number
  color: string
  onClick: () => void
}

function LeaderboardRow({ conversation, rank, maxMessages, color, onClick }: LeaderboardRowProps) {
  const widthPct = (conversation.totalMessages / maxMessages) * 100

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left",
        "transition-colors hover:bg-accent"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {rank}
          </span>
          <span className="truncate text-sm font-medium">{conversation.title}</span>
          {conversation.isGroup && (
            <span className="shrink-0 text-xs text-muted-foreground">(group)</span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {conversation.totalMessages.toLocaleString()}
        </span>
      </div>
        <div className="pl-6 w-full">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${widthPct}%`, backgroundColor: color }}
            />
          </div>
        </div>
    </button>
  )
}
