import type { Camper } from '../hooks/useDirectory'
import { CamperAvatar } from './CamperAvatar'

interface CamperCardProps {
  camper: Camper
  onOpen: (camper: Camper) => void
}

const SHOWN_TAGS = 4

export function CamperCard({ camper, onOpen }: CamperCardProps) {
  const shared = new Set(camper.shared)
  const shown = camper.interests.slice(0, SHOWN_TAGS)
  const extra = camper.interests.length - shown.length
  const kindred = camper.shared.length >= 2

  return (
    <button
      type="button"
      onClick={() => onOpen(camper)}
      className={`card ${kindred ? 'card-kindred' : ''} text-left w-full p-3.5 flex gap-3 items-start transition-[border-color,transform] duration-150 active:scale-[0.985]`}
    >
      <CamperAvatar avatar={camper.avatar} name={camper.name} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base">{camper.name ?? 'camper'}</span>
          {camper.shared.length > 0 && (
            <span className="font-brand-mono text-[10px] px-2 py-[3px] rounded-full bg-acid text-ink whitespace-nowrap">
              ✳ {camper.shared.length} shared root{camper.shared.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {camper.line && (
          <span className="block text-dim text-[13.5px] leading-snug mt-[3px] line-clamp-2">
            {camper.line}
          </span>
        )}
        <span className="flex flex-wrap gap-[5px] mt-2">
          {shown.map((t) => (
            <span key={t} className={`tag ${shared.has(t) ? 'tag-shared' : ''}`}>
              {t}
            </span>
          ))}
          {extra > 0 && <span className="tag tag-more">+{extra}</span>}
        </span>
      </span>
    </button>
  )
}
