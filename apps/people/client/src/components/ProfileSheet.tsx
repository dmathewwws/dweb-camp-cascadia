import { useEffect, useState } from 'react'
import type { Camper } from '../hooks/useDirectory'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { removeUser } from '../lib/api'
import { CamperAvatar } from './CamperAvatar'
import { HighlightText } from './HighlightText'

interface ProfileSheetProps {
  camper: Camper | null
  onClose: () => void
}

export function ProfileSheet({ camper, onClose }: ProfileSheetProps) {
  const { user, getProfileJwt } = useLocalFirstAuth()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Clear the remove flow whenever the sheet switches campers or closes
  useEffect(() => {
    setShowConfirm(false)
    setRemoveError(null)
  }, [camper?.did])

  const canRemove = Boolean(user?.isAdmin && camper && camper.did !== user?.did)

  const handleRemove = async () => {
    if (!camper) return
    const profileJwt = await getProfileJwt()
    if (!profileJwt) {
      setRemoveError('No profile JWT available')
      return
    }

    setIsRemoving(true)
    setRemoveError(null)
    try {
      await removeUser(profileJwt, camper.did)
      onClose()
    } catch (err) {
      console.error('Error removing camper:', err)
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove camper')
    } finally {
      setIsRemoving(false)
      setShowConfirm(false)
    }
  }

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

            {camper.highlights.length > 0 && (
              <>
                <div className="mono-label mt-[18px] mb-2">proud of</div>
                <ul className="space-y-1.5">
                  {camper.highlights.map((highlight, i) => (
                    <li key={i} className="flex gap-2 items-baseline text-[14.5px] leading-snug">
                      <span aria-hidden="true">✦</span>
                      <span>
                        <HighlightText text={highlight} />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mono-label mt-[18px] mb-2">their interests</div>
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

            {canRemove && (
              <div className="mt-6 pt-4 border-t border-line">
                {removeError && (
                  <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-[13px]">
                    {removeError}
                  </div>
                )}
                {!showConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md text-[14px] hover:bg-red-50 transition-colors"
                  >
                    Remove camper
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[13px] text-red-700 font-medium">
                      Remove {camper.name ?? 'this camper'} from the directory? They can
                      check in again later.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-[14px] hover:bg-red-700 disabled:bg-red-300 transition-colors"
                      >
                        {isRemoving ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-[14px] hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
