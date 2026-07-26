/**
 * Link detection for user-generated highlight text.
 *
 * Highlights are free text typed by campers, so the rule is deliberately narrow:
 * an explicit `http(s)://` run becomes a link, everything else stays literal.
 * No markdown, no HTML, no bare-domain guessing. Consumers build DOM nodes from
 * the tokens below — never an HTML string — so the only attacker-reachable
 * surface is the `href`, which `safeUrl` locks to http/https.
 */

/** Explicit-scheme URL runs only. No TLD guessing, no bare domains. */
const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi

/** Sentence punctuation that trails a URL far more often than it belongs to one. */
const TRAILING_PUNCT = /[.,;:!?'"]/

/** Closers we only strip when the match left them unbalanced. */
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

/** Control characters, zero-width marks, and bidi overrides. */
const INVISIBLE_RE =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

export type HighlightToken =
  | { type: 'text'; value: string }
  | { type: 'url'; href: string; label: string }

/**
 * Parse a candidate URL, returning the full href plus a short display label
 * (bare host, `www.` dropped). Returns null for anything we won't link.
 */
export function safeUrl(raw: string): { href: string; label: string } | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  // The whole XSS defence: check the *parsed* protocol, never the raw string,
  // so `javascript:`, `data:`, `vbscript:` and friends can never reach an href.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const label = url.hostname.toLowerCase().replace(/^www\./, '')
  // A host with no dot is a bare hostname (localhost, an intranet name) — not
  // something worth linking out to from a public directory.
  if (!label.includes('.')) return null

  return { href: url.toString(), label }
}

/**
 * Trim trailing characters that belong to the sentence rather than the URL.
 * Balanced brackets are kept, so `.../Foo_(bar))` keeps the inner paren.
 */
function trimTrailing(match: string): { url: string; rest: string } {
  let end = match.length
  while (end > 0) {
    const ch = match[end - 1]
    if (TRAILING_PUNCT.test(ch)) {
      end--
      continue
    }
    const opener = CLOSERS[ch]
    if (opener) {
      // Count the part *before* this closer — including it would always net to
      // zero and strip a legitimately balanced pair
      const body = match.slice(0, end - 1)
      let depth = 0
      for (const c of body) {
        if (c === opener) depth++
        else if (c === ch) depth--
      }
      // depth <= 0 means this closer has no opener of its own to match
      if (depth <= 0) {
        end--
        continue
      }
    }
    break
  }
  return { url: match.slice(0, end), rest: match.slice(end) }
}

/**
 * Split free text into alternating plain-text and link tokens.
 * Anything that isn't a linkable http(s) URL comes back as a `text` token, so
 * callers can render every token safely as a text node or an anchor.
 */
export function tokenizeHighlight(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = []
  const re = new RegExp(URL_RE.source, URL_RE.flags)
  let cursor = 0
  let pending = ''

  const pushText = (value: string) => {
    pending += value
  }
  const flushText = () => {
    if (pending) tokens.push({ type: 'text', value: pending })
    pending = ''
  }

  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    pushText(text.slice(cursor, match.index))
    cursor = match.index + match[0].length

    const { url, rest } = trimTrailing(match[0])
    const parsed = url ? safeUrl(url) : null
    if (parsed) {
      flushText()
      tokens.push({ type: 'url', ...parsed })
      pushText(rest)
    } else {
      // Degrade to literal text rather than render a link we don't trust
      pushText(match[0])
    }
  }

  pushText(text.slice(cursor))
  flushText()
  return tokens
}

/**
 * Strip characters that can make rendered text lie about itself — bidi
 * overrides in particular can reorder a line so the visible text disagrees
 * with the link beside it.
 */
export function sanitizeHighlight(text: string): string {
  return text.replace(INVISIBLE_RE, '').trim()
}
