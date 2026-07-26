/** Camp branding label — links out to the host landing grid at the site root.
 *  A real anchor, not a react-router <Link>: the router's basename is /people/,
 *  and the console is a separate document, so this needs a full navigation. */
export function CampLabel() {
  return (
    <a href="/" className="mono-label flex items-center gap-2 mb-6 w-fit hover:text-ink">
      <span aria-hidden="true" className="text-[15px] leading-none text-ink">
        ←
      </span>
      dweb camp cascadia ’26 · salt spring island
    </a>
  )
}
