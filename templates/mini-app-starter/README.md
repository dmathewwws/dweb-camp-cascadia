# __SLUG_TITLE__

A Local First Auth mini app living at `apps/__SLUG__` in this workspace, served under
`/__SLUG__/` on the shared domain. Scaffolded from `templates/mini-app-starter` by
`pnpm new-app` — signup/login, REST API, SQLite (D1), and real-time WebSocket updates
are already wired.

## Everyday commands

From the workspace root:

```bash
pnpm dev:__SLUG__                                        # worker + vite dev servers
```

From this directory (or via `pnpm --filter @<workspace>/__SLUG__ run …` at the root):

```bash
pnpm dev                     # dev servers (real QR-code sign-in)
pnpm dev:simulator           # …with a fake test user — no phone needed
pnpm build                   # build shared, then client
pnpm db:generate-migrations  # regenerate migrations after editing server/src/db/schema.ts
pnpm db:run-migrations       # apply migrations to the local D1
```

The local D1 needs no Cloudflare account (`database_id = "local"`); `pnpm new-app`
already ran the initial migrations.

## Building features

See [CLAUDE.md](./CLAUDE.md) for the architecture (auth, database, WebSockets, API) and
[`../../docs/mini-app-examples.md`](../../docs/mini-app-examples.md) for reference apps
to learn patterns from.

## Deploy

```bash
cp .env.example .env         # then fill in CLOUDFLARE_ACCOUNT_ID + ALCHEMY_STATE_TOKEN
pnpm exec alchemy configure  # one-time Cloudflare API token setup (alchemy is a devDep)
pnpm run deploy:cloudflare
```

Routes on the shared domain attach automatically once `ALLOWED_ORIGIN` in
`alchemy.run.ts` is your real domain — set it once for every app from the workspace
root: `pnpm setup-project --allowed-origin https://your.domain`.

After the first deploy, register the app with the host console (landing-grid card +
admin bindings): follow **"Register with the host console"** in
[`../console/docs/hosting-a-mini-app.md`](../console/docs/hosting-a-mini-app.md).

## Troubleshooting

- The worker serves under the subpath — in dev the API is at
  `http://localhost:<worker-port>/__SLUG__/api`, not `/api` (Hono `basePath`).
- Port already in use: see
  [`../../docs/port-troubleshooting.md`](../../docs/port-troubleshooting.md).
