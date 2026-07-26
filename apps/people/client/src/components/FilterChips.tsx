import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

interface FilterChipsProps {
  tags: string[]
  active: string | null
  onChange: (tag: string | null) => void
}

/** px of fade drawn at a scrollable edge — sideways when collapsed, vertical when expanded */
const FADE_X = 28
const FADE_Y = 18

export function FilterChips({ tags, active, onChange }: FilterChipsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const [edges, setEdges] = useState({ start: false, end: false })
  const listId = useId()

  // Are there chips out of sight, and on which side? Sideways when collapsed,
  // above/below when expanded past the height cap.
  const measure = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    if (expanded) {
      const max = el.scrollHeight - el.clientHeight
      setEdges({ start: el.scrollTop > 1, end: el.scrollTop < max - 1 })
      return
    }
    const max = el.scrollWidth - el.clientWidth
    setOverflowing(max > 1)
    setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 })
  }, [expanded])

  // Chip widths change with the tag list and with selection (.chip-on adds an
  // asterisk), so re-measure on those too — a ResizeObserver on the scroller
  // only fires when the scroller itself is resized.
  useLayoutEffect(measure, [measure, tags, active])

  // Expanding turns one row into many; open the grid at the top rather than
  // wherever the row happened to be scrolled to. Runs before the
  // scroll-into-view effect below, so an active chip still wins.
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (el && expanded) el.scrollTop = 0
  }, [expanded])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [measure])

  // Desktop: a vertical wheel over the row scrolls it sideways. Must be a
  // non-passive listener — React's onWheel is passive and can't preventDefault.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || expanded) return

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 1) return
      // At either end, let the event through so the page keeps scrolling.
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return
      e.preventDefault()
      el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [expanded])

  // Keep the selected chip visible (e.g. after collapsing the grid).
  useEffect(() => {
    const el = scrollerRef.current
    const target = el?.querySelector<HTMLElement>('[data-chip-active="true"]')
    if (!target) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      // 'center', not 'nearest' — nearest parks the chip right under the edge fade.
      inline: 'center',
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [active, expanded])

  const select = (tag: string | null) => {
    onChange(tag)
    setExpanded(false)
  }

  // Mask (not a colored overlay) — the header is translucent + blurred, so an
  // opaque paper gradient would mismatch the content scrolling under it.
  const fade = expanded ? FADE_Y : FADE_X
  const mask =
    edges.start || edges.end
      ? `linear-gradient(to ${expanded ? 'bottom' : 'right'}, ${edges.start ? 'transparent' : 'black'} 0, black ${fade}px, black calc(100% - ${fade}px), ${edges.end ? 'transparent' : 'black'} 100%)`
      : undefined

  const options: Array<{ key: string; label: string; value: string | null }> = [
    { key: '__everyone', label: 'everyone', value: null },
    ...tags.map((tag) => ({ key: tag, label: tag, value: tag })),
  ]

  return (
    <div className="flex items-start gap-2 -mx-5 -mt-1 pr-5 pb-2">
      <div
        id={listId}
        ref={scrollerRef}
        onScroll={measure}
        role="group"
        aria-label="Filter by interest"
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className={`min-w-0 flex-1 gap-2 py-1 scrollbar-hide [overflow-anchor:none] ${
          expanded
            ? 'flex flex-wrap px-5 max-h-[40dvh] overflow-y-auto'
            : 'flex pl-5 pr-1 overflow-x-auto overscroll-x-contain'
        }`}
      >
        {options.map(({ key, label, value }) => {
          const on = active === value
          return (
            <button
              key={key}
              type="button"
              data-chip-active={on || undefined}
              aria-pressed={on}
              className={`chip shrink-0 ${on ? 'chip-on' : ''}`}
              onClick={() => select(on ? null : value)}
            >
              {label}
            </button>
          )
        })}
      </div>

      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="chip shrink-0 mt-1 !px-2.5 !gap-1 text-dim"
        >
          {expanded ? 'less' : 'all'}
          <svg
            viewBox="0 0 24 24"
            className={`w-3 h-3 block transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  )
}
