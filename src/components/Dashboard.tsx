import { use, useCallback, useMemo, useState, useTransition } from "react"
import { LeaderboardCard } from "./LeaderboardCard"
import { StackedAreaCard } from "./StackedAreaCard"
import { FilterBar, type FilterValues } from "./FilterBar"
import { allConversations, dataReady, hasData, ownerName } from "@/lib/data"

interface DashboardProps {
  onSelectConversation: (key: string) => void
}

function monthToTs(month: string): number {
  return new Date(month + "-01T00:00:00Z").getTime()
}

function monthToEndTs(month: string): number {
  const [y, m] = month.split("-").map(Number)
  return new Date(Date.UTC(y, m, 1) - 1).getTime()
}

function tsToMonthInput(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function Dashboard({ onSelectConversation }: DashboardProps) {
  use(dataReady) // suspend until all data files are loaded and processed

  const [isPending, startTransition] = useTransition()

  const { dataFrom, dataTo } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const c of allConversations) {
      if (c.firstTimestamp < min) min = c.firstTimestamp
      if (c.lastTimestamp > max) max = c.lastTimestamp
    }
    return {
      dataFrom: tsToMonthInput(min === Infinity ? Date.now() : min),
      dataTo: tsToMonthInput(max === -Infinity ? Date.now() : max),
    }
  }, [])

  const initialValues: FilterValues = {
    topN: 50,
    typeFilter: [],
    fromMonth: dataFrom,
    toMonth: dataTo,
  }

  // Committed values — what the charts actually use
  const [committed, setCommitted] = useState<FilterValues>(initialValues)

  // Brush sync state — pushed to FilterBar to keep date inputs in sync
  const [syncFromMonth, setSyncFromMonth] = useState(dataFrom)
  const [syncToMonth, setSyncToMonth] = useState(dataTo)

  const fromTs = useMemo(() => monthToTs(committed.fromMonth), [committed.fromMonth])
  const toTs = useMemo(() => monthToEndTs(committed.toMonth), [committed.toMonth])

  function handleApply(values: FilterValues) {
    startTransition(() => {
      setCommitted(values)
      setSyncFromMonth(values.fromMonth)
      setSyncToMonth(values.toMonth)
    })
  }

  // Brush only syncs the FilterBar's date inputs — does not commit
  const handleWindowChange = useCallback((from: number, to: number) => {
    setSyncFromMonth(tsToMonthInput(from))
    setSyncToMonth(tsToMonthInput(to))
  }, [])

  if (!hasData) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">No data found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Place your Facebook Messenger export inside the <code>data/</code> folder,
            then restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold">Chat Graph</h1>
          <span className="text-sm text-muted-foreground">
            {allConversations.length} conversations · {ownerName}
          </span>
        </div>
        <FilterBar
          dataFrom={dataFrom}
          dataTo={dataTo}
          committed={committed}
          onApply={handleApply}
          syncFromMonth={syncFromMonth}
          syncToMonth={syncToMonth}
        />
      </div>

      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <svg className="size-6 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}
        <StackedAreaCard
          n={committed.topN}
          filter={committed.typeFilter}
          fromTs={fromTs}
          toTs={toTs}
          onWindowChange={handleWindowChange}
        />
      </div>
      <LeaderboardCard
        onSelect={onSelectConversation}
        filter={committed.typeFilter}
        fromTs={fromTs}
        toTs={toTs}
        isPending={isPending}
      />
    </div>
  )
}
