import { useState } from 'react'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { AdminSection } from '../components/AdminSection'
import { CheckIn } from '../screens/CheckIn'
import { Directory } from '../screens/Directory'

function Landing({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-5 pt-5">
      <div className="mono-label flex items-center gap-2 mb-6 before:content-[''] before:w-[9px] before:h-[9px] before:rounded-full before:bg-acid-deep before:shadow-[0_0_0_3px_rgba(184,245,92,0.3)]">
        dweb camp cascadia ’26 · salt spring island
      </div>
      <h1 className="font-display font-bold text-[clamp(26px,7.4vw,32px)] leading-[1.12] tracking-tight mb-2.5">
        Put down your{' '}
        <em className="not-italic [background:linear-gradient(transparent_58%,var(--color-acid)_58%)]">roots</em>
        , camper.
      </h1>
      <p className="text-dim text-[15px] leading-relaxed mb-7">
        Co-Adapt. Co-Create. Co-Here. Tell camp what pulls you in — we’ll light up
        everyone whose roots tangle with yours.
      </p>

      {/* Mobile: start onboarding right here. Desktop: point at the QR panel. */}
      <button onClick={onJoin} className="cta md:hidden">
        Add yourself <span className="font-brand-mono">→</span>
      </button>
      <p className="hidden md:block font-brand-mono text-xs text-dim">
        ← scan the QR code with Antler Browser to join
      </p>
    </div>
  )
}

export function Home() {
  const { user, setIsOnboardingModalOpen, getProfileJwt } = useLocalFirstAuth()
  const [editing, setEditing] = useState(false)

  const checkedIn = (user?.interests?.length ?? 0) >= 1

  let screen
  if (!user) {
    screen = <Landing onJoin={() => setIsOnboardingModalOpen(true)} />
  } else if (!checkedIn || editing) {
    screen = <CheckIn editing={checkedIn} onDone={() => setEditing(false)} />
  } else {
    screen = <Directory onEdit={() => setEditing(true)} />
  }

  return (
    <div className="flex-1 flex flex-col">
      {screen}

      {/* Admin Section - only show if user is admin */}
      {user?.isAdmin && (
        <div className="px-5">
          {/* Reset keeps admin rows (and their check-in) server-side; the
              directory clears itself via the 'reset' WebSocket broadcast */}
          <AdminSection getProfileJwt={getProfileJwt} onReset={() => {}} />
        </div>
      )}
    </div>
  )
}
