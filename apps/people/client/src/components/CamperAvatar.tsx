const HUES = ['#DCFFAF', '#B9EDD2', '#EFF7B0', '#FFE3B0', '#C7E6F2', '#E1D4F5']

interface CamperAvatarProps {
  avatar?: string | null
  name?: string | null
  className?: string
}

/**
 * Real avatar image when the camper has one; otherwise a deterministic
 * generative "node" mark keyed on their name (from the mockup).
 */
export function CamperAvatar({ avatar, name, className = 'w-[46px] h-[46px] rounded-[14px]' }: CamperAvatarProps) {
  if (avatar) {
    return (
      <span className={`${className} overflow-hidden shrink-0 block`}>
        <img src={avatar} alt={`${name ?? 'camper'} avatar`} className="w-full h-full object-cover" />
      </span>
    )
  }

  const display = (name ?? '?').trim() || '?'
  let h = 0
  for (const c of display) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const bg = HUES[h % HUES.length]
  const rot = h % 360
  const r2 = 8 + (h % 7)
  const initial = display[0].toUpperCase()

  return (
    <span className={`${className} overflow-hidden shrink-0 block`}>
      <svg viewBox="0 0 46 46" role="img" aria-label={`${display} avatar`} className="block w-full h-full">
        <rect width="46" height="46" fill={bg} />
        <g
          stroke="#131A0F"
          strokeWidth="1.4"
          fill="none"
          opacity=".8"
          transform={`rotate(${rot} 23 23)`}
        >
          <circle cx="23" cy="23" r={r2} />
          <line x1="23" y1={23 - r2} x2="23" y2="4" />
          <line x1={23 + r2} y1="23" x2="42" y2="23" />
          <line x1="23" y1={23 + r2} x2="23" y2="42" />
        </g>
        <text
          x="23"
          y="28"
          textAnchor="middle"
          fontFamily="'Space Mono',monospace"
          fontWeight="700"
          fontSize="15"
          fill="#131A0F"
        >
          {initial}
        </text>
      </svg>
    </span>
  )
}
