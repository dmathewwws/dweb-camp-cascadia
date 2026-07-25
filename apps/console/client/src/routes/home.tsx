import { Link } from 'react-router-dom'
import { apps, type MiniApp } from '../apps'

/** Card classes shared by external (cross-document) and internal (host route) links. */
const cardClasses =
  'card group block h-full p-6 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-acid-deep active:scale-[0.985]'

export function Home() {
  const hasMiniApps = apps.some((app) => !app.internal)

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-10 sm:mb-14">
        <div className="mono-label flex items-center justify-center gap-2 mb-5 before:content-[''] before:w-[9px] before:h-[9px] before:rounded-full before:bg-acid-deep before:shadow-[0_0_0_3px_rgba(184,245,92,0.3)]">
          dweb camp cascadia ’26 · salt spring island
        </div>
        <h1 className="text-center font-display font-bold text-[clamp(28px,6vw,44px)] leading-[1.12] tracking-tight">
          Welcome to DWeb Camp{' '}
          <em className="not-italic [background:linear-gradient(transparent_58%,var(--color-acid)_58%)]">
            Cascadia
          </em>
        </h1>
      </header>

      {!hasMiniApps && (
        <div className="card p-10 text-center text-dim mb-5">
          <p className="text-lg font-semibold text-ink">No mini apps yet</p>
          <p className="mt-2 text-sm">
            Scaffold one with <code className="font-brand-mono">pnpm new-app &lt;slug&gt;</code>, then
            add its card to <code className="font-brand-mono">client/src/apps.ts</code> and register
            it in <code className="font-brand-mono">shared/src/apps.ts</code> — see{' '}
            <code className="font-brand-mono">docs/hosting-a-mini-app.md</code>.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {apps.map((app) => (
          <li key={app.slug}>
            {/* Internal cards (e.g. Settings) are host routes → client-side Link.
                External cards are separate Workers/documents → real anchor so the
                browser does a full navigation. */}
            {app.internal ? (
              <Link to={app.path} className={cardClasses}>
                <CardBody app={app} />
              </Link>
            ) : (
              <a href={app.path} className={cardClasses}>
                <CardBody app={app} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shared inner markup for both internal and external app cards. */
function CardBody({ app }: { app: MiniApp }) {
  return (
    <>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-acid text-3xl">
        <span aria-hidden="true">{app.icon}</span>
      </div>
      <h2 className="text-lg font-bold">{app.name}</h2>
      <p className="mt-1 text-sm text-dim">{app.description}</p>
    </>
  )
}
