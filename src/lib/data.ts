import { fixEncoding } from "./encoding"
import type {
  ConversationDetail,
  ConversationSummary,
  DailyPoint,
  FacebookMessage,
  FacebookMessageFile,
  WeeklyPoint,
} from "./types"

// ---------------------------------------------------------------------------
// Glob import — lazy, returns loader functions
// ---------------------------------------------------------------------------
const fileLoaders = import.meta.glob("/data/**/messages/*/*/message_*.json") as Record<
  string,
  () => Promise<{ default: FacebookMessageFile }>
>

// ---------------------------------------------------------------------------
// Week arithmetic — no Date objects per message
// Jan 5 1970 was the first Monday after Unix epoch
// ---------------------------------------------------------------------------
const MONDAY_EPOCH_OFFSET = 345600000 // ms
const MS_PER_WEEK = 604800000 // ms

function tsToWeekNum(ts: number): number {
  return Math.floor((ts - MONDAY_EPOCH_OFFSET) / MS_PER_WEEK)
}

function weekNumToStart(n: number): number {
  return MONDAY_EPOCH_OFFSET + n * MS_PER_WEEK
}

// Cached: weekNum → { weekStart, week string }
const weekMetaCache = new Map<number, { weekStart: number; week: string }>()

function getWeekMeta(weekNum: number): { weekStart: number; week: string } {
  const cached = weekMetaCache.get(weekNum)
  if (cached) return cached
  const ws = weekNumToStart(weekNum)
  // Create a single Date only once per unique week
  const d = new Date(ws)
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1)
  const weekOfYear = Math.floor((ws - jan1) / MS_PER_WEEK) + 1
  const meta = {
    weekStart: ws,
    week: `${d.getUTCFullYear()}-W${String(weekOfYear).padStart(2, "0")}`,
  }
  weekMetaCache.set(weekNum, meta)
  return meta
}

// ---------------------------------------------------------------------------
// Pre-build fileByKey map — populated by dataReady
// ---------------------------------------------------------------------------
const fileByKey = new Map<string, FacebookMessageFile>()

// ---------------------------------------------------------------------------
// Week bucket — stored per conversation, pre-computed once
// ---------------------------------------------------------------------------
interface WeekBucket {
  weekStart: number
  week: string
  total: number
  sent: number
  received: number
}

// Stored alongside each summary for use by buildTopNWeekly and getConversationDetail
const weekBucketsByKey = new Map<string, Map<number, WeekBucket>>()

// ---------------------------------------------------------------------------
// Day bucket — stored per conversation, pre-computed once
// ---------------------------------------------------------------------------
interface DayBucket {
  dateStr: string           // "YYYY-MM-DD"
  ts: number                // UTC start-of-day
  total: number
  sent: number
  received: number
  senderCounts: Record<string, number>
}

const dayBucketsByKey = new Map<string, Map<string, DayBucket>>()

function tsToDayStr(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

function tsToDayStart(ts: number): number {
  return Math.floor(ts / 86400000) * 86400000
}

// ---------------------------------------------------------------------------
// Derive owner name
// ---------------------------------------------------------------------------
function deriveOwnerName(grouped: Map<string, FacebookMessage[]>): string {
  const counts = new Map<string, number>()
  for (const messages of grouped.values()) {
    if (messages.length === 0) continue
    const name = fixEncoding(messages[0].sender_name)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  let best = ""
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) { best = name; bestCount = count }
  }
  return best
}

// ---------------------------------------------------------------------------
// Build ConversationSummary[] — single pass per conversation, pre-computes
// week buckets so nothing downstream needs to touch messages again
// ---------------------------------------------------------------------------
function buildSummaries(
  grouped: Map<string, FacebookMessage[]>,
  ownerName: string
): ConversationSummary[] {
  const summaries: ConversationSummary[] = []

  for (const [key, messages] of grouped) {
    if (messages.length === 0) continue
    const file = fileByKey.get(key)
    if (!file) continue

    const title = fixEncoding(file.title)
    const participants = file.participants.map((p) => fixEncoding(p.name))

    let sent = 0
    let received = 0
    let firstTs = Infinity
    let lastTs = -Infinity
    let isGroup =
      file.thread_type === "RegularGroup" ||
      participants.length > 2

    // Single pass: stats + week buckets + day buckets + group detection
    const buckets = new Map<number, WeekBucket>()
    const dayBuckets = new Map<string, DayBucket>()

    for (const msg of messages) {
      const ts = msg.timestamp_ms
      if (ts < firstTs) firstTs = ts
      if (ts > lastTs) lastTs = ts

      // Skip Instagram reaction system messages ("Reacted X to your message")
      if (msg.content && /^Reacted .+ to your message/.test(msg.content)) continue

      const senderFixed = fixEncoding(msg.sender_name)
      const isSent = senderFixed === ownerName
      if (isSent) sent++; else received++

      if (!isGroup && msg.content) {
        isGroup = /\b(left the group|named the group|added .+ to the group|created the group|your invite link|group video chat)\b/i.test(msg.content)
      }

      // Week bucket
      const weekNum = tsToWeekNum(ts)
      let bucket = buckets.get(weekNum)
      if (!bucket) {
        const { weekStart, week } = getWeekMeta(weekNum)
        bucket = { weekStart, week, total: 0, sent: 0, received: 0 }
        buckets.set(weekNum, bucket)
      }
      bucket.total++
      if (isSent) bucket.sent++; else bucket.received++

      // Day bucket
      const dayStr = tsToDayStr(ts)
      let dayBucket = dayBuckets.get(dayStr)
      if (!dayBucket) {
        dayBucket = { dateStr: dayStr, ts: tsToDayStart(ts), total: 0, sent: 0, received: 0, senderCounts: {} }
        dayBuckets.set(dayStr, dayBucket)
      }
      dayBucket.total++
      if (isSent) dayBucket.sent++; else dayBucket.received++
      dayBucket.senderCounts[senderFixed] = (dayBucket.senderCounts[senderFixed] ?? 0) + 1
    }

    weekBucketsByKey.set(key, buckets)
    dayBucketsByKey.set(key, dayBuckets)

    summaries.push({
      key,
      title,
      participants,
      totalMessages: messages.length,
      sentMessages: sent,
      receivedMessages: received,
      firstTimestamp: firstTs === Infinity ? 0 : firstTs,
      lastTimestamp: lastTs === -Infinity ? 0 : lastTs,
      isGroup,
    })
  }

  return summaries.sort((a, b) => b.totalMessages - a.totalMessages)
}

// ---------------------------------------------------------------------------
// Build weekly stacked area data — reads pre-computed buckets, no message iteration
// ---------------------------------------------------------------------------
function buildTopNWeekly(
  summaries: ConversationSummary[],
  n: number
): WeeklyPoint[] {
  const topN = summaries.slice(0, n)

  // Collect all weekNums across the entire dataset for x-axis range
  let minWeek = Infinity
  let maxWeek = -Infinity
  for (const buckets of weekBucketsByKey.values()) {
    for (const weekNum of buckets.keys()) {
      if (weekNum < minWeek) minWeek = weekNum
      if (weekNum > maxWeek) maxWeek = weekNum
    }
  }

  if (minWeek === Infinity) return []

  // Build one WeeklyPoint per week across the full date range
  const points: WeeklyPoint[] = []
  for (let wn = minWeek; wn <= maxWeek; wn++) {
    const { weekStart, week } = getWeekMeta(wn)
    const point: WeeklyPoint = { week, weekStart }
    for (const summary of topN) {
      point[summary.title] = weekBucketsByKey.get(summary.key)?.get(wn)?.total ?? 0
    }
    points.push(point)
  }

  return points
}

// ---------------------------------------------------------------------------
// Loading status — readable via useSyncExternalStore
// ---------------------------------------------------------------------------
let _loadingStatus = "Starting..."
const _statusSubscribers = new Set<() => void>()

function setStatus(s: string) {
  _loadingStatus = s
  _statusSubscribers.forEach((cb) => cb())
}

export function getLoadingStatus() { return _loadingStatus }
export function subscribeLoadingStatus(cb: () => void) {
  _statusSubscribers.add(cb)
  return () => { _statusSubscribers.delete(cb) }
}

// ---------------------------------------------------------------------------
// Module-level state — populated when dataReady resolves
// ---------------------------------------------------------------------------
export let ownerName = ""
export let allConversations: ConversationSummary[] = []
export let hasData = false

export type ConversationTypeFilter = "individuals" | "groups"

// Resolves once all files are loaded and processed. Suspend components with use(dataReady).
export const dataReady: Promise<void> = (async () => {
  const entries = Object.entries(fileLoaders)
  if (entries.length === 0) return

  const total = entries.length
  let done = 0
  setStatus(`Loading files (0 / ${total})`)

  const loaded = await Promise.all(
    entries.map(async ([path, loader]) => {
      const mod = await loader()
      setStatus(`Loading files (${++done} / ${total})`)
      return { path, file: mod.default }
    })
  )

  setStatus("Processing conversations...")

  // fileByKey: first file per conversation key holds the metadata
  for (const { path, file } of loaded) {
    const idx = path.indexOf("/messages/")
    if (idx === -1) continue
    const parts = path.slice(idx + 10).split("/")
    if (parts.length < 2) continue
    const key = parts[1]
    if (!fileByKey.has(key)) fileByKey.set(key, file)
  }

  // Group all messages by conversation key
  const grouped = new Map<string, FacebookMessage[]>()
  for (const { path, file } of loaded) {
    const idx = path.indexOf("/messages/")
    if (idx === -1) continue
    const parts = path.slice(idx + 10).split("/")
    if (parts.length < 2) continue
    const key = parts[1]
    const existing = grouped.get(key) ?? []
    grouped.set(key, existing.concat(file.messages))
  }

  ownerName = deriveOwnerName(grouped)
  allConversations = buildSummaries(grouped, ownerName)
  hasData = true
})()

const weeklyCache = new Map<string, WeeklyPoint[]>()

export function getTopNWeeklyData(n: number, filter: ConversationTypeFilter[]): WeeklyPoint[] {
  const cacheKey = `${n}-${[...filter].sort().join(",")}`
  const cached = weeklyCache.get(cacheKey)
  if (cached) return cached
  const filtered = getFilteredConversations(filter)
  const data = buildTopNWeekly(filtered, n)
  weeklyCache.set(cacheKey, data)
  return data
}

export function getFilteredConversations(filter: ConversationTypeFilter[]): ConversationSummary[] {
  const showIndividuals = filter.length === 0 || filter.includes("individuals")
  const showGroups = filter.length === 0 || filter.includes("groups")
  if (showIndividuals && showGroups) return allConversations
  if (showGroups) return allConversations.filter((c) => c.isGroup)
  return allConversations.filter((c) => !c.isGroup)
}

// Returns conversations sorted by message count within a given time window
export function getConversationsInWindow(
  filter: ConversationTypeFilter[],
  fromTs: number,
  toTs: number
): ConversationSummary[] {
  const fromWeek = tsToWeekNum(fromTs)
  const toWeek = tsToWeekNum(toTs)
  const base = getFilteredConversations(filter)

  return base
    .map((conv) => {
      const buckets = weekBucketsByKey.get(conv.key)
      if (!buckets) return { ...conv, totalMessages: 0 }
      let total = 0
      for (const [wn, b] of buckets) {
        if (wn >= fromWeek && wn <= toWeek) total += b.total
      }
      return { ...conv, totalMessages: total }
    })
    .filter((c) => c.totalMessages > 0)
    .sort((a, b) => b.totalMessages - a.totalMessages)
}

// ---------------------------------------------------------------------------
// Per-conversation detail — reads pre-computed buckets, no message iteration
// ---------------------------------------------------------------------------
export function getConversationDetail(key: string): ConversationDetail | null {
  const summary = allConversations.find((s) => s.key === key)
  if (!summary) return null

  const buckets = weekBucketsByKey.get(key)
  if (!buckets) return null

  const weeklyActivity = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, b]) => ({ week: b.week, weekStart: b.weekStart, sent: b.sent, received: b.received }))

  const rawDayBuckets = dayBucketsByKey.get(key)
  const dailyActivity: DailyPoint[] = rawDayBuckets
    ? Array.from(rawDayBuckets.values()).sort((a, b) => a.ts - b.ts)
    : []

  return { summary, weeklyActivity, dailyActivity }
}

