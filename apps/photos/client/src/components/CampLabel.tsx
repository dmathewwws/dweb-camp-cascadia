/** Camp branding label — links out to the host landing grid at the site root.
 *  A real anchor, not a react-router <Link>: the router's basename is /photos/,
 *  and the console is a separate document, so this needs a full navigation. */
export function CampLabel() {
  return (
    <a
      href="/"
      className="font-mono-stamp text-[11px] uppercase tracking-[0.12em] text-paper-dim hover:text-paper flex items-center gap-2 w-fit"
    >
      <span aria-hidden="true" className="text-[15px] leading-none text-paper">
        ←
      </span>
      dweb camp cascadia ’26 · salt spring island
    </a>
  )
}
