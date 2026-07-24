# CLAUDE.md — Console Starter workspace

Guidance for Claude Code when working in this repository.

## What this repo is

A pnpm workspace hosting a family of Local First Auth mini apps on one domain:

| Path | Role |
|---|---|
| `apps/console/` | The **host**: catch-all Cloudflare Worker serving the landing grid at `/`, SPA fallback, and the Settings → Admin console. Has its own D1 (operator allowlist). No Durable Object. |
| `apps/<slug>/` | Mini apps scaffolded by `pnpm new-app <slug>` — each an independent Worker with its own D1 (+ Durable Object for WebSockets), served under `/<slug>/`. |
| `templates/mini-app-starter/` | The vendored starter that `new-app` copies. **Excluded from the workspace** (generic `@starter/*` names). Edit it to change what future apps start from; see its `UPSTREAM.md`. |
| `scripts/` | Root scaffolding: `new-app.ts`, `setup-project.ts`, `lib/workspace.ts`. |
| `docs/` | Shared reference docs: auth spec, mini-app examples, port troubleshooting. |

Every app is a package trio (`client` = React 19 + Vite + Tailwind 4, `server` = Hono +
Drizzle + D1, `shared` = JWT verification), deployed independently via Alchemy
(`alchemy.run.ts`; `wrangler.toml` is dev-only).

The workspace name in the root `package.json` is the single source of truth for naming:
package scopes are `@<name>/*`, Cloudflare resources `<name>-…`, display strings its
Title Case. Scripts derive from it — never hardcode the project name.

## Commands

```bash
pnpm install
pnpm dev:console            # host console (worker :8787, vite :5173)
pnpm dev:<slug>             # a scaffolded app (script added by new-app)
pnpm build                  # build every app
pnpm typecheck              # tsc -b every app
pnpm new-app <slug>         # scaffold a mini app from the template
pnpm setup-project [name] [--allowed-origins <csv>] [--github-url <url>]
                            # rename the workspace + optional prod settings
```

Per-app commands go through a filter: `pnpm --filter @<workspace>/<slug> run <script>`
(e.g. `db:generate-migrations`, `db:run-migrations`, `dev:simulator`,
`deploy:cloudflare`).

## Project Setup (Claude: Follow These Instructions)

**When to run these steps:** when the user asks to "set up", "initialize", or "rename"
this project.

Run: `pnpm setup-project {kebab-case-name}` (defaults to the repo directory name). It
rewrites the package scope, Cloudflare resource names, and display strings from the
current workspace name to the new one, then reinstalls. Optional flags:
`--allowed-origins <csv>` sets the production `ALLOWED_ORIGINS` in every
`apps/*/alchemy.run.ts`, and `--github-url <url>` points each app's footer link
(`apps/*/client/src/components/Footer.tsx`) at the user's fork; a flags-only run
leaves the name unchanged. Both flags also update `templates/mini-app-starter`, so
apps scaffolded later by `new-app` inherit the values — set them once, never twice.
It is idempotent and prints a checklist of only what was not provided (the dev D1 id
and GitHub template flag always remain manual).

## Adding a mini app (Claude: Follow These Instructions)

1. `pnpm new-app <slug>` — scaffolds `apps/<slug>`, claims ports, wires root
   tsconfig/scripts, installs.
2. Build the app's features inside `apps/<slug>` (see its own `CLAUDE.md`, copied from
   the template).
3. Serve it under `/<slug>/`: prefix server routes to `/<slug>/api/*` per
   `apps/console/docs/hosting-a-mini-app.md`.
4. After its first deploy, register it with the host console:
   - `apps/console/client/src/apps.ts` — add the landing-grid card
   - `apps/console/shared/src/apps.ts` — add to `MANAGED_APPS` and extend
     `ChildBindingKey` (replace `never` with the union of binding keys)
   - `apps/console/wrangler.toml` — add the `DB_<SLUG>` dev binding (commented example
     block is in the file)

## Auth in one paragraph

Users sign in by scanning a QR code with Antler Browser, which injects
`window.localFirstAuth`; identity is a `did:key` and requests carry short-lived EdDSA
JWTs verified server-side by each app's `shared/src/jwt.ts` (`decodeAndVerifyJWT`,
checks signature + expiry + allowed origins). Local dev without a phone:
`pnpm --filter @<workspace>/<app> run dev:simulator`. Full spec:
`docs/local-first-auth-spec.md`.

## More docs

- `apps/console/CLAUDE.md` — the host console's architecture, admin API, registry
- `templates/mini-app-starter/CLAUDE.md` — what scaffolded apps look like inside
- `docs/mini-app-examples.md` — reference mini apps to learn patterns from
- `apps/console/docs/` — host-specific: domain setup, hosting contract, admin setup, secrets
