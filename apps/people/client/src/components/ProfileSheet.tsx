import { useEffect } from 'react'
import type { Camper } from '../hooks/useDirectory'
import { CamperAvatar } from './CamperAvatar'

interface ProfileSheetProps {
  camper: Camper | null
  onClose: () => void
}

export function ProfileSheet({ camper, onClose }: ProfileSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = camper !== null
  const shared = new Set(camper?.shared ?? [])
  const firstName = camper?.name?.split(' ')[0] ?? 'camper'

  return (
    <>
      {/* scrim */}
      <div
        className={`fixed inset-0 bg-ink/45 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Camper profile"
        className={`fixed bottom-0 left-1/2 w-full max-w-[430px] z-50 bg-card
          rounded-t-3xl border-[1.5px] border-b-0 border-line
          px-[22px] pt-2.5 pb-[calc(24px+env(safe-area-inset-bottom))]
          max-h-[86dvh] overflow-y-auto
          transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0.25,1)]
          ${open ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-[105%]'}`}
      >
        {camper && (
          <>
            <div className="w-10 h-1 rounded-full bg-line mx-auto mt-1 mb-[18px]" />
            <div className="flex gap-3.5 items-center mb-1.5">
              <CamperAvatar
                avatar={camper.avatar}
                name={camper.name}
                className="w-16 h-16 rounded-[18px]"
              />
              <div>
                <div className="font-display font-bold text-[21px] tracking-tight">
                  {camper.name ?? 'camper'}
                </div>
                <div className="font-brand-mono text-xs text-dim mt-[3px]">
                  node/{firstName.toLowerCase()}
                </div>
              </div>
            </div>

            {camper.line && (
              <p className="text-[15px] leading-relaxed mt-3.5 mb-1.5">{camper.line}</p>
            )}

            <div className="mono-label mt-[18px] mb-2">their roots</div>
            <div className="flex flex-wrap gap-1.5">
              {camper.interests.map((t) => (
                <span
                  key={t}
                  className={`tag !text-[11.5px] !px-2.5 !py-1.5 ${shared.has(t) ? 'tag-shared' : ''}`}
                >
                  {t}
                </span>
              ))}
            </div>

            {camper.shared.length > 0 && (
              <div className="mt-[18px] p-[13px_15px] rounded-[14px] bg-acid text-[13.5px] leading-normal flex gap-2.5 items-start">
                <span>✳</span>
                <span>
                  You share{' '}
                  <span className="font-brand-mono font-bold">
                    {camper.shared.length} root{camper.shared.length > 1 ? 's' : ''}
                  </span>{' '}
                  — {camper.shared.join(', ')}. A campfire conversation waiting to happen.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
