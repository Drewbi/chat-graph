# chat-graph

A personal Facebook Messenger history visualizer built with React + TypeScript + Vite + shadcn/ui.

## Project Purpose
Visualize the "ebb and flow" of messaging patterns across Facebook Messenger history — who is talked to most at different points in time, and how those relationships change over the years.

## Data Setup
Place a Facebook Messenger export inside the `data/` folder. The expected structure is the standard Facebook export format:
```
data/
  messages/
    inbox/
      PersonName_hashid/
        message_1.json
        message_2.json
        ...
```

Data is loaded statically at build/dev time via Vite's `import.meta.glob` — no file upload UI.

## Key Technical Decisions

### Facebook Encoding Fix
Facebook exports text as Latin-1 bytes misread as UTF-8 (mojibake). All names and content are decoded with:
```ts
decodeURIComponent(escape(str))
```
Applied in `src/lib/encoding.ts`, called during data parsing in `src/lib/data.ts`.

### Owner Name
The user's own name is derived at runtime as the most frequent `sender_name` across all conversations. Can be overridden by setting `OWNER_NAME` constant in `src/lib/data.ts` after first run if auto-detection is wrong.

### Navigation
Simple `useState<string | null>` in `App.tsx` — `null` = Dashboard, a conversation key string = Detail view. No router library.

### Charting
Uses shadcn `Chart` component (wraps Recharts). Week granularity for all time-series data. ISO week format: `"2021-W04"`.

## App Structure
```
src/
  lib/
    types.ts          # TypeScript interfaces
    encoding.ts       # fixEncoding() utility
    data.ts           # glob import + all data processing
  components/
    Dashboard.tsx         # main view: stacked area + leaderboard
    StackedAreaCard.tsx   # top-10 contacts ebb/flow chart
    LeaderboardCard.tsx   # all-time ranking, clickable
    ContactDetail.tsx     # per-conversation drill-down
    ui/               # shadcn components (do not edit manually)
```

## Stack
- React 19, TypeScript, Vite 7
- Tailwind CSS v4
- shadcn/ui (base-nova style, base-ui primitives)
- lucide-react icons
- Bun package manager (`bunx` for CLI tools)

## Common Commands
```bash
bun run dev       # start dev server
bun run build     # production build
bun run typecheck # type check only
bunx shadcn@latest add <component>  # add shadcn components
```
