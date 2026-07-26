import { TAG_GROUPS } from '@dweb/people-shared'

interface TagPickerProps {
  selected: Set<string>
  onToggle: (tag: string) => void
  /** When true, unselected chips are disabled (the 10-tag cap is reached) */
  atCap: boolean
}

export function TagPicker({ selected, onToggle, atCap }: TagPickerProps) {
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
      <div role="group" aria-label="Pick your interests">
        {TAG_GROUPS.map((group) => (
          <div key={group.label}>
            {group.section && (
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
              <div className="flex flex-wrap gap-2">{group.tags.map(chip)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
