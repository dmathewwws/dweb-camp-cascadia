import { useState } from 'react'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useDirectory, type Camper } from '../hooks/useDirectory'
import { CamperCard } from '../components/CamperCard'
import { CampLabel } from '../components/CampLabel'
import { FilterChips } from '../components/FilterChips'
import { ProfileSheet } from '../components/ProfileSheet'

interface DirectoryProps {
  onEdit: () => void
}

export function Directory({ onEdit }: DirectoryProps) {
  const { user } = useLocalFirstAuth()
  const { visible, filterTags, query, setQuery, filter, setFilter } = useDirectory()
  const [openCamper, setOpenCamper] = useState<Camper | null>(null)

  const clearFilters = () => {
    setFilter(null)
    setQuery('')
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur-md px-5 pt-3.5 border-b-[1.5px] border-line">
        <CampLabel className="mb-2.5" />
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-bold text-[19px] tracking-tight">Campers Directory</div>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit your interests"
            className="flex items-center gap-[7px] font-brand-mono text-[11px] py-1.5 pl-1.5 pr-2.5 rounded-full bg-acid border-[1.5px] border-ink active:scale-[0.96] transition-transform"
          >
            <span className="w-[18px] h-[18px] rounded-full bg-ink text-acid grid place-items-center text-[9px] font-bold">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span>{user?.name?.split(' ')[0]?.toLowerCase() ?? 'you'}</span>
          </button>
        </div>
        <div className="relative mb-3">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[17px] h-[17px] block"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </span>
          <input
            type="search"
            className="field-input !rounded-full !py-3 !pl-10 text-[15px]"
            placeholder="Search campers…"
            aria-label="Search campers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <FilterChips tags={filterTags} active={filter} onChange={setFilter} />
      </header>

      <div className="px-4 pt-4 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-2.5">
        {visible.length === 0 ? (
          <div className="py-14 px-8 text-center text-dim">
            <div className="text-[28px] mb-3">⌀</div>
            <p className="text-[14.5px] leading-relaxed">
              No campers match that yet.
              <br />
              Try another interest or clear the search.
            </p>
            {(filter || query) && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3.5 font-brand-mono text-xs underline text-moss"
              >
                clear filters
              </button>
            )}
          </div>
        ) : (
          visible.map((camper) => (
            <CamperCard key={camper.did} camper={camper} onOpen={setOpenCamper} />
          ))
        )}
      </div>

      <ProfileSheet camper={openCamper} onClose={() => setOpenCamper(null)} />
    </div>
  )
}
