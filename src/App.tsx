import { lazy, Suspense, useState, useSyncExternalStore } from "react"
import { ContactDetail } from "./components/ContactDetail"
import { getLoadingStatus, subscribeLoadingStatus } from "./lib/data"

const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })))

function LoadingScreen() {
  const status = useSyncExternalStore(subscribeLoadingStatus, getLoadingStatus)
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <svg
        className="size-8 animate-spin text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <p className="text-sm text-muted-foreground tabular-nums">{status}</p>
    </div>
  )
}

export function App() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  if (selectedKey) {
    return (
      <div className="min-h-svh">
        <ContactDetail
          conversationKey={selectedKey}
          onBack={() => setSelectedKey(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-svh">
      <Suspense fallback={<LoadingScreen />}>
        <Dashboard onSelectConversation={setSelectedKey} />
      </Suspense>
    </div>
  )
}

export default App
