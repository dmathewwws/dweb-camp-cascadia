import { useMemo, useState } from 'react'
import { TAG_GROUPS, ALL_TAGS } from '@dweb/people-shared'

interface TagPickerProps {
  selected: Set<string>
  onToggle: (tag: string) => void
  /** When true, unselected chips are disabled (the 10-tag cap is reached) */
  atCap: boolean
}

/** Chips shown per group before "+N more" */
const PEEK = 6

export function TagPicker({ selected, onToggle, atCap }: TagPickerProps) {
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  const q = query.trim().toLowerCase()

  const visibleGroups = useMemo(
    () =>
      TAG_GROUPS.map((group) => {
        const matches = q ? group.tags.filter((t) => t.includes(q)) : group.tags
        if (matches.length === 0) return null
        // When searching, show everything; otherwise peek + already-selected
        const open = q !== '' || openGroups.has(group.label)
        const visible = open
          ? matches
          : matches.filter((t, idx) => idx < PEEK || selected.has(t))
        return { group, visible, hidden: matches.length - visible.length }
      }).filter((g) => g !== null),
    [q, openGroups, selected]
  )

  const chip = (tag: string) => {
    const on = selected.has(tag)
    return (
      <button
        key={tag}
        type="button"
        className={`chip ${on ? 'chip-on' : ''} ${!on && atCap ? 'opacity-35 cursor-not-allowed' : ''}`}
        aria-pressed={on}
        disabled={!on && atCap}
        onClick={() => onToggle(tag)}
      >
        {tag}
      </button>
    )
  }

  return (
    <div>
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim text-sm" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          className="field-input !rounded-full !py-3 !pl-9 text-[15px]"
          placeholder={`Search ${ALL_TAGS.length} tags — rss, linux, sauna…`}
          aria-label="Search interest tags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div role="group" aria-label="Pick your interests">
        {visibleGroups.length === 0 && (
          <p className="font-brand-mono text-[12.5px] text-dim py-4 leading-relaxed">
            No tag matches “{query.trim()}”. Try another word.
          </p>
        )}
        {visibleGroups.map(({ group, visible, hidden }) => (
          <div key={group.label}>
            {group.section && !q && (
              <div className="mt-6 mb-4 pb-2.5 border-b-2 border-ink flex items-baseline gap-2.5 flex-wrap first:mt-0">
                <span className="font-display font-bold text-xl tracking-tight [background:linear-gradient(transparent_62%,var(--color-acid)_62%)]">
                  {group.section}
                </span>
                <span className="font-brand-mono text-[11px] text-dim">{group.sectionSub}</span>
              </div>
            )}
            <div className="mb-5">
              <div className="mono-label !text-[10.5px] !text-dim mb-2 flex items-center gap-2.5 after:content-[''] after:flex-1 after:h-px after:bg-line">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {visible.map(chip)}
                {hidden > 0 && (
                  <button
                    type="button"
                    className="chip border-dashed text-dim font-bold"
                    onClick={() =>
                      setOpenGroups((prev) => new Set(prev).add(group.label))
                    }
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
