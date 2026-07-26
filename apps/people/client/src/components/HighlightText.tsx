import { useMemo } from 'react'
import { tokenizeHighlight } from '@dweb/people-shared'

interface HighlightTextProps {
  text: string
}

/**
 * Renders a camper-written highlight, turning explicit http(s) URLs into links
 * labelled with just the host ("Built https://taddy.org/developers" reads as
 * "Built taddy.org"). Everything else stays literal text — React escapes each
 * token as a text node, so no markup a camper types can ever render.
 */
export function HighlightText({ text }: HighlightTextProps) {
  const tokens = useMemo(() => tokenizeHighlight(text), [text])

  return (
    <>
      {tokens.map((token, i) =>
        token.type === 'text' ? (
          token.value
        ) : (
          <a
            key={i}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            title={token.href}
            // Highlights may end up inside a clickable card
            onClick={(e) => e.stopPropagation()}
            className="text-moss underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {token.label}
          </a>
        )
      )}
    </>
  )
}
