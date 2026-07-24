/**
 * App registry — the single source of truth for the landing grid.
 *
 * Each mini app is an independent Cloudflare Worker (living at `apps/<slug>` in this
 * workspace), bound to the route patterns `<domain>/<slug>` and `<domain>/<slug>/*`. Cloudflare
 * resolves the most-specific route first, so a child Worker automatically overrides
 * this host's catch-all for its own paths.
 *
 * To add a mini app to the grid:
 *   1. Deploy the child app Worker with routes for its slug (see docs/hosting-a-mini-app.md).
 *   2. Add an entry below and redeploy the host.
 *
 * `path` MUST be `/<slug>` (a real cross-document link, not client-side routing).
 */

export interface MiniApp {
  /** URL-safe identifier, also the base path segment (e.g. "guestbook"). */
  slug: string
  /** Display name shown on the card. */
  name: string
  /** One-line description shown on the card. */
  description: string
  /** Absolute path this card links to. Must be `/<slug>`. */
  path: string
  /** Emoji or short glyph used as the card icon. */
  icon: string
  /** Tailwind gradient classes for the card's icon tile accent. */
  accent: string
  /**
   * When true, this card is a route served by the host itself (e.g. /settings),
   * so it links via client-side routing instead of a cross-document navigation.
   */
  internal?: boolean
}

export const apps: MiniApp[] = [
  {
    slug: 'settings',
    name: 'Settings',
    description: 'Create or edit your profile.',
    path: '/settings',
    icon: '⚙️',
    accent: 'from-slate-400 to-slate-300',
    internal: true,
  },
]
