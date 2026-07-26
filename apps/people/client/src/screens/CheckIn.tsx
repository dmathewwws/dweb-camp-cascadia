import { useState } from 'react'
import {
  MAX_HIGHLIGHTS,
  MAX_HIGHLIGHT_LENGTH,
  MAX_INTERESTS,
  MAX_LINE_LENGTH,
  MIN_INTERESTS,
  sanitizeHighlight,
} from '@dweb/people-shared'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { checkIn } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { CampLabel } from '../components/CampLabel'
import { TagPicker } from '../components/TagPicker'

// One placeholder shows a full URL — links need an explicit https:// to be detected
const HIGHLIGHT_PLACEHOLDERS = [
  'Ran a repair café for 3 years',
  'Built https://taddy.org/developers',
  'Learning to make cheese',
]

const TOTAL_STEPS = 3

interface CheckInProps {
  /** Called after a successful save (also used as "back" context for edits) */
  onDone: () => void
  /** True when the user is editing an existing check-in (changes CTA copy) */
  editing: boolean
}

export function CheckIn({ onDone, editing }: CheckInProps) {
  const { user, getProfileJwt, setIsOnboardingModalOpen, applyUser } = useLocalFirstAuth()
  const [step, setStep] = useState(1)
  const [line, setLine] = useState(user?.line ?? '')
  // Fixed-length array so each input stays controlled and edits are positional;
  // blanks are dropped on save
  const [highlights, setHighlights] = useState<string[]>(() => {
    const saved = user?.highlights ?? []
    return Array.from({ length: MAX_HIGHLIGHTS }, (_, i) => saved[i] ?? '')
  })
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(user?.interests ?? [])
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const count = selected.size
  const atCap = count >= MAX_INTERESTS
  const canJoin = count >= MIN_INTERESTS && !saving

  const setHighlight = (index: number, value: string) => {
    setHighlights((prev) => prev.map((h, i) => (i === index ? value : h)))
  }

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

  const goNext = () => {
    setStep((s) => s + 1)
    window.scrollTo(0, 0)
  }

  // Back off step 1 only exists while editing — it returns to the directory
  const goBack = () => {
    if (step === 1) {
      onDone()
      return
    }
    setStep((s) => s - 1)
    window.scrollTo(0, 0)
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
        highlights: highlights.map(sanitizeHighlight).filter(Boolean),
        interests: [...selected],
      })
      applyUser({
        line: saved.line,
        highlights: saved.highlights,
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

  const firstName = user?.name?.split(' ')[0] ?? 'camper'

  let heading: string
  let sub: string | null = null
  let body: React.ReactNode
  let ctaLabel: string
  let ctaDisabled = false
  let onCta: () => void

  if (step === 1) {
    heading = `What DWeb interests pull you in, ${firstName}?`
    body = (
      <div className="mb-2">
        <div className="flex items-baseline justify-end mb-2.5">
          <span className="font-brand-mono text-[11px] text-dim">
            {count} / {MAX_INTERESTS}
          </span>
        </div>
        <TagPicker selected={selected} onToggle={toggle} atCap={atCap} />
      </div>
    )
    ctaLabel = 'Next'
    ctaDisabled = !canJoin
    onCta = goNext
  } else if (step === 2) {
    heading = 'One line about you'
    sub = "Optional — skip if you'd rather not."
    body = (
      <div className="mb-6">
        <input
          id="in-line"
          type="text"
          aria-label="One line about you"
          className="field-input"
          placeholder="I care about ..."
          autoComplete="off"
          maxLength={MAX_LINE_LENGTH}
          value={line}
          onChange={(e) => setLine(e.target.value)}
        />
      </div>
    )
    ctaLabel = line.trim() ? 'Next' : 'Skip'
    onCta = goNext
  } else {
    heading = "What are you proud of?"
    sub = 'Optional — up to three things you want to share or highlight. You can add links as well.'
    body = (
      <div className="mb-6">
        <div className="space-y-2">
          {highlights.map((highlight, i) => (
            <input
              key={i}
              id={`in-highlight-${i}`}
              type="text"
              className="field-input"
              aria-label={`Highlight ${i + 1}`}
              placeholder={HIGHLIGHT_PLACEHOLDERS[i]}
              autoComplete="off"
              maxLength={MAX_HIGHLIGHT_LENGTH}
              value={highlight}
              onChange={(e) => setHighlight(i, e.target.value)}
            />
          ))}
        </div>
      </div>
    )
    ctaLabel = saving ? 'Saving…' : editing ? 'Save your profile' : 'Add yourself'
    ctaDisabled = saving
    onCta = handleSubmit
  }

  const showBack = step > 1 || editing

  return (
    <div className="flex-1 flex flex-col px-5 pt-5">
      <CampLabel />

      <div className="flex items-center gap-3.5 mb-4">
        {showBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={goBack}
            className="font-brand-mono text-lg leading-none text-dim hover:text-ink shrink-0"
          >
            ←
          </button>
        )}
        <Avatar avatar={user?.avatar} name={user?.name} size="sm" />
        <div className="flex-1">
          <span className="mono-label block mb-1.5">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`h-[3px] flex-1 rounded-full ${
                  i < step ? 'bg-acid-deep' : 'bg-line'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <h1
        className={`font-display font-bold text-[clamp(22px,6.5vw,28px)] leading-tight tracking-tight ${
          sub ? 'mb-1.5' : 'mb-5'
        }`}
      >
        {heading}
      </h1>
      {sub && <p className="text-dim text-[13px] leading-snug mb-5">{sub}</p>}

      {body}

      {error && (
        <div className="mb-3 p-3 rounded-[14px] bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 px-5 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] bg-[linear-gradient(transparent,var(--color-paper)_30%)]">
        <button className="cta" disabled={ctaDisabled} onClick={onCta}>
          {ctaLabel} <span className="font-brand-mono">→</span>
        </button>
      </div>
    </div>
  )
}
