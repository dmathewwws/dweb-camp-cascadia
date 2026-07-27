/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  // D1 Database binding
  DB: D1Database

  // Durable Object namespace for real-time WebSocket broadcasting
  DURABLE_OBJECT: DurableObjectNamespace

  // Static assets binding (the client build); files are keyed at dist-root paths,
  // so the Worker strips the /<slug> prefix before fetching from it
  ASSETS: Fetcher

  // The single production origin this Worker accepts Local First Auth JWTs for;
  // unset in dev, which skips the audience check. local-first-auth v3 signs with
  // a per-origin key, so a JWT minted at another origin carries a different DID —
  // reject it (see shared/src/jwt.ts).
  ALLOWED_PRODUCTION_ORIGIN?: string

  // Example runtime secret (see docs/secrets.md for the full add-a-secret pattern).
  // Dev: plain string from `.env` via [secrets] required in wrangler.toml.
  // Prod: Worker secret bound via alchemy.secret.env in alchemy.run.ts.
  // MY_SECRET?: string

  // R2 bucket holding camp photos (full-size + thumbnail per photo)
  PHOTOS_BUCKET: R2Bucket

  // S3-compat credentials for presigning direct-upload PUT URLs. All four are
  // deliberately absent in dev (NOT in [secrets] required) — their absence makes
  // /api/request-uploads hand out worker-relative /api/dev-upload/* URLs that
  // write to the local simulated bucket instead (see r2.ts).
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ACCOUNT_ID?: string
  R2_BUCKET_NAME?: string
}
