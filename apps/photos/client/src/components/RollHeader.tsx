import { CAMP } from '@dweb/photos-shared'

export function RollHeader({ frameCount }: { frameCount: number }) {
  return (
    <header className="px-4.5 pt-4.5 pb-5">
      <div className="flex items-baseline justify-between gap-3 mb-4.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[26px] tracking-[0.04em]">ROLL</span>
          <span className="font-mono-stamp text-[9px] tracking-[0.16em] text-paper-dim uppercase">
            {CAMP.tagline}
          </span>
        </div>
        <span className="font-mono-stamp text-[10px] tracking-[0.16em] uppercase text-paper-dim flex-none">
          {CAMP.datesLabel}
        </span>
      </div>
      <h1 className="font-display font-bold text-[clamp(40px,13vw,56px)] leading-[0.84] uppercase">
        {CAMP.title}
      </h1>
      <div className="mt-3.5 flex items-baseline gap-2 font-mono-stamp text-[10px] tracking-[0.18em] uppercase text-paper-dim">
        <b className="stamp text-lg tracking-[0.02em]">{frameCount}</b>
        <span>{frameCount === 1 ? 'Frame' : 'Frames'}</span>
      </div>
    </header>
  )
}
