interface FilterChipsProps {
  tags: string[]
  active: string | null
  onChange: (tag: string | null) => void
}

export function FilterChips({ tags, active, onChange }: FilterChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Filter by interest"
    >
      <button
        type="button"
        className={`chip shrink-0 ${!active ? 'chip-on' : ''}`}
        onClick={() => onChange(null)}
      >
        everyone
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`chip shrink-0 ${active === tag ? 'chip-on' : ''}`}
          onClick={() => onChange(active === tag ? null : tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
