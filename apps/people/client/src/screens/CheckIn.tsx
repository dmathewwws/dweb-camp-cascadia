import { useState } from 'react'
import { MAX_INTERESTS, MAX_LINE_LENGTH, MIN_INTERESTS } from '@dweb/people-shared'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { checkIn } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { TagPicker } from '../components/TagPicker'

interface CheckInProps {
  /** Called after a successful save (also used as "back" context for edits) */
  onDone: () => void
  /** True when the user is editing an existing check-in (changes CTA copy) */
  editing: boolean
}

export function CheckIn({ onDone, editing }: CheckInProps) {
  const { user, getProfileJwt, setIsOnboardingModalOpen, applyUser } = useLocalFirstAuth()
  const [line, setLine] = useState(user?.line ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(user?.interests ?? [])
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const count = selected.size
  const atCap = count >= MAX_INTERESTS
  const canJoin = count >= MIN_INTERESTS && !saving

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else if (next.size < MAX_INTERESTS) {
        next.add(tag)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    const profileJwt = await getProfileJwt()
    if (!profileJwt) {
      setIsOnboardingModalOpen(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await checkIn({
        profileJwt,
        line: line.trim(),
        interests: [...selected],
      })
      applyUser({
        line: saved.line,
        interests: saved.interests,
        checkedInAt: saved.checkedInAt,
        isAdmin: saved.isAdmin,
      })
      onDone()
      window.scrollTo(0, 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const rootsCount =
    count === 0 ? (
      <>pick at least <b className="text-moss">{MIN_INTERESTS}</b></>
    ) : atCap ? (
      <><b className="text-moss">{count}/{MAX_INTERESTS}</b> — cap reached, deselect to swap</>
    ) : (
      <><b className="text-moss">{count}/{MAX_INTERESTS}</b> roots down</>
    )

  return (
    <div className="flex-1 flex flex-col px-5 pt-5">
      <div className="mono-label flex items-center gap-2 mb-6 before:content-[''] before:w-[9px] before:h-[9px] before:rounded-full before:bg-acid-deep before:shadow-[0_0_0_3px_rgba(184,245,92,0.3)]">
        dweb camp cascadia ’26 · salt spring island
      </div>

      <div className="flex items-center gap-3.5 mb-4">
        <Avatar avatar={user?.avatar} name={user?.name} size="sm" />
        <div>
          <h1 className="font-display font-bold text-[clamp(22px,6.5vw,28px)] leading-tight tracking-tight">
            Put down your{' '}
            <em className="not-italic [background:linear-gradient(transparent_58%,var(--color-acid)_58%)]">roots</em>
            , {user?.name?.split(' ')[0] ?? 'camper'}.
          </h1>
        </div>
      </div>
      <p className="text-dim text-[15px] leading-relaxed mb-7">
        Co-Adapt. Co-Create. Co-Here. Tell camp what pulls you in — we’ll light up
        everyone whose roots tangle with yours.
      </p>

      <div className="mb-6">
        <label htmlFor="in-line" className="mono-label block mb-2">
          One line about you <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="in-line"
          type="text"
          className="field-input"
          placeholder="Building a solar-powered mesh node…"
          autoComplete="off"
          maxLength={MAX_LINE_LENGTH}
          value={line}
          onChange={(e) => setLine(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="mono-label">Your roots</span>
          <span className="font-brand-mono text-[11px] text-dim">{rootsCount}</span>
        </div>
        <TagPicker selected={selected} onToggle={toggle} atCap={atCap} />
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-[14px] bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 px-5 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] bg-[linear-gradient(transparent,var(--color-paper)_30%)]">
        <button className="cta" disabled={!canJoin} onClick={handleSubmit}>
          {saving ? 'Saving…' : editing ? 'Save your roots' : 'Join the directory'}{' '}
          <span className="font-brand-mono">→</span>
        </button>
      </div>
    </div>
  )
}
