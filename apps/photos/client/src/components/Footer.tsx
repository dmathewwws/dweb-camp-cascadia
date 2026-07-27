export function Footer() {
  return (
    <div className="mt-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-center text-sm text-paper-dim">
      This is an {' '}
      <a
        href="https://github.com/dmathewwws/dweb-camp-cascadia"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary-hover underline"
      >
        open source
      </a>
      {' '}project. {' '}<br />
      All photos are deleted after 14 days.
      <br />
    </div>
  )
}
