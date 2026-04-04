/** Raw shape from a single Facebook message JSON file */
export interface FacebookMessageFile {
  participants: { name: string }[]
  messages: FacebookMessage[]
  title: string
  thread_type: "Regular" | "RegularGroup" | string
}

export interface FacebookMessage {
  sender_name: string
  timestamp_ms: number
  content?: string
  type: "Generic" | "Share" | "Call" | string
  reactions?: { reaction: string; actor: string }[]
  photos?: { uri: string; creation_timestamp: number }[]
}

/** Processed summary per conversation */
export interface ConversationSummary {
  key: string
  title: string
  participants: string[]
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  firstTimestamp: number
  lastTimestamp: number
  isGroup: boolean
}

/** One data point for the stacked area chart */
export interface WeeklyPoint {
  week: string
  weekStart: number
  [contactTitle: string]: number | string
}

/** Processed data for per-conversation detail view */
export interface ConversationDetail {
  summary: ConversationSummary
  weeklyActivity: {
    week: string
    weekStart: number
    sent: number
    received: number
  }[]
}
