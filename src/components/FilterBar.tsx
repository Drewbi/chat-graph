import { Fragment, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import type { ConversationTypeFilter } from "@/lib/data"

export interface FilterValues {
  topN: number
  typeFilter: ConversationTypeFilter[]
  fromMonth: string
  toMonth: string
}

interface FilterBarProps {
  dataFrom: string
  dataTo: string
  committed: FilterValues
  /** Called when the user clicks Apply */
  onApply: (values: FilterValues) => void
  /** When brush moves, parent pushes new months to sync the displayed inputs */
  syncFromMonth: string
  syncToMonth: string
}

const FILTER_ITEMS: ConversationTypeFilter[] = ["individuals", "groups"]

export function FilterBar({
  dataFrom,
  dataTo,
  committed,
  onApply,
  syncFromMonth,
  syncToMonth,
}: FilterBarProps) {
  const anchor = useComboboxAnchor()

  const [draftN, setDraftN] = useState(String(committed.topN))
  const [draftTypeFilter, setDraftTypeFilter] = useState<ConversationTypeFilter[]>(committed.typeFilter)
  const [draftFromMonth, setDraftFromMonth] = useState(committed.fromMonth)
  const [draftToMonth, setDraftToMonth] = useState(committed.toMonth)

  // Sync date inputs when brush moves
  useEffect(() => { setDraftFromMonth(syncFromMonth) }, [syncFromMonth])
  useEffect(() => { setDraftToMonth(syncToMonth) }, [syncToMonth])

  const parsedN = Number(draftN) || committed.topN
  const dirty =
    parsedN !== committed.topN ||
    draftTypeFilter.join(",") !== committed.typeFilter.join(",") ||
    draftFromMonth !== committed.fromMonth ||
    draftToMonth !== committed.toMonth

  function handleApply() {
    onApply({
      topN: parsedN,
      typeFilter: draftTypeFilter,
      fromMonth: draftFromMonth,
      toMonth: draftToMonth,
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Combobox
        multiple
        items={FILTER_ITEMS}
        value={draftTypeFilter}
        onValueChange={(v) => setDraftTypeFilter(v as ConversationTypeFilter[])}
      >
        <ComboboxChips ref={anchor} className="min-w-36">
          <ComboboxValue>
            {(values: string[]) => (
              <Fragment>
                {values.map((v) => (
                  <ComboboxChip key={v}>{v}</ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={draftTypeFilter.length === 0 ? "All types" : ""} />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No options.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="month"
          value={draftFromMonth}
          min={dataFrom}
          max={draftToMonth}
          onChange={(e) => setDraftFromMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
        />
        <span>–</span>
        <input
          type="month"
          value={draftToMonth}
          min={draftFromMonth}
          max={dataTo}
          onChange={(e) => setDraftToMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Top
        <input
          type="number"
          value={draftN}
          onChange={(e) => setDraftN(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && dirty) handleApply() }}
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground tabular-nums"
        />
        contacts
      </div>

      <Button size="sm" disabled={!dirty} onClick={handleApply}>
        Apply
      </Button>
    </div>
  )
}
