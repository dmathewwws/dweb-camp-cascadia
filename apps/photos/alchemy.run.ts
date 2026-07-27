/**
 * Alchemy Configuration for Local First Auth Starter
 *
 * Deploys the starter mini-app to Cloudflare:
 * - D1 Database for user storage
 * - Durable Object for real-time WebSocket broadcasting
 * - Worker for API and static asset serving
 */

import alchemy from 'alchemy'
import { Assets, D1Database, DurableObjectNamespace, R2Bucket, Worker } from 'alchemy/cloudflare'
import { CloudflareStateStore } from 'alchemy/state'
import type { Broadcaster } from './server/src/durable-object'

// The single origin this app accepts Local First Auth JWTs for. Committed literal
// on purpose — never read this from .env (alchemy deploy loads .env, so a local
// deploy would push a localhost origin to prod). `pnpm setup-project
// --allowed-production-origin https://your.domain` (from the workspace root) replaces
// it everywhere at once. While it is still the placeholder, no routes are attached —
// the Worker only gets its workers.dev URL.
const ALLOWED_PRODUCTION_ORIGIN = 'https://dweb.dmathewwws.com'
const hasRealOrigin = !ALLOWED_PRODUCTION_ORIGIN.includes('your-domain.example')

// Initialize Alchemy app with remote state store
const app = await alchemy('dweb-photos-mini-app', {
  // Encryption key for secret values persisted to Alchemy state. Only required once
  // you add an alchemy.secret binding below — set it in .env before you do, and keep
  // it stable across deploys (changing it orphans previously-encrypted state).
  password: process.env.ALCHEMY_PASSWORD,
  stateStore: (scope) => new CloudflareStateStore(scope),
})

/**
 * D1 Database
 * Stores user information
 */
const database = await D1Database(`${app.name}-${app.stage}-db`, {
  name: `${app.name}-${app.stage}-db`,
  migrationsDir: './server/src/db/migrations',
  adopt: true,
})

/**
 * R2 Bucket
 * Camp photos (full-size + thumbnail per photo). Phones upload directly via
 * presigned PUT URLs, so the bucket needs CORS for the app origin.
 * A lifecycle rule deletes every object 14 days after upload.
 */
const photosBucket = await R2Bucket(`${app.name}-${app.stage}-photos`, {
  name: `${app.name}-${app.stage}-photos`,
  adopt: true,
  cors: [
    {
      allowed: {
        methods: ['PUT'],
        origins: [ALLOWED_PRODUCTION_ORIGIN, 'http://localhost:5175'],
        headers: ['content-type'],
      },
      maxAgeSeconds: 3600,
    },
  ],
  lifecycle: [
    {
      id: 'delete-photos-after-14-days',
      conditions: { prefix: '' },
      enabled: true,
      deleteObjectsTransition: {
        condition: { type: 'Age', maxAge: 14 * 24 * 60 * 60 },
      },
      // Clean up presigned uploads that never finished
      abortMultipartUploadsTransition: {
        condition: { type: 'Age', maxAge: 24 * 60 * 60 },
      },
    },
  ],
})

/**
 * Static Assets
 * Client build directory containing the React app
 */
const staticAssets = await Assets({
  path: './client/dist',
})

/**
 * Durable Object Namespace
 * Manages real-time WebSocket connections for broadcasting user updates
 */
const durableObject = DurableObjectNamespace<Broadcaster>(`${app.name}-${app.stage}-durable-object`, {
  className: 'Broadcaster',
  sqlite: true,
})

/**
 * Cloudflare Worker
 * Handles API routes, WebSocket upgrades, and serves static client assets
 */
export const worker = await Worker('worker', {
  name: `${app.name}-${app.stage}`,
  entrypoint: './server/src/index.ts',
  bindings: {
    DB: database,
    DURABLE_OBJECT: durableObject,
    ASSETS: staticAssets,
    ALLOWED_PRODUCTION_ORIGIN,
    // Example runtime secret — the full pattern (see docs/secrets.md):
    //   1. add MY_SECRET= to .env and .env.example
    //   2. add it to [secrets] required in wrangler.toml (local dev)
    //   3. bind it here — alchemy.secret.env throws at deploy time if unset in .env
    //   4. add `MY_SECRET?: string` to server/src/types.ts
    // MY_SECRET: alchemy.secret.env.MY_SECRET,

    // Photo storage + presign config. The R2_* values are intentionally NOT in
    // wrangler.toml [secrets] required — absent in dev, request-uploads falls
    // back to worker-relative dev-upload URLs against the local bucket.
    PHOTOS_BUCKET: photosBucket,
    R2_BUCKET_NAME: photosBucket.name,
    R2_ACCOUNT_ID: alchemy.env.CLOUDFLARE_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: alchemy.secret.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: alchemy.secret.env.R2_SECRET_ACCESS_KEY,
  },
  assets: {
    html_handling: 'auto-trailing-slash',
    not_found_handling: 'single-page-application',
    // Assets are uploaded at dist-root keys but requested under /<slug>/, so no
    // asset ever matches directly — the Worker strips the prefix and serves them
    // via the ASSETS binding. This disables the pre-Worker asset/SPA interception.
    run_worker_first: true,
  },
  // Claim /<slug>/* (entry page + assets + in-app routes) on the shared domain.
  // Most-specific route wins, so this overrides the host console's catch-all.
  // Links must use the trailing-slash form (/<slug>/); the bare /<slug> path is
  // not claimed. Activates automatically once ALLOWED_PRODUCTION_ORIGIN is your
  // real domain.
  ...(hasRealOrigin
    ? {
        routes: [
          `${new URL(ALLOWED_PRODUCTION_ORIGIN).host}/photos/*`,
        ],
      }
    : {}),
  url: true,
})

// Finalize deployment
await app.finalize()

console.log('✅ Alchemy deployment complete')
console.log(`📦 App: ${app.name}`)
console.log(`🌍 Stage: ${app.stage}`)
console.log(`🗄️  D1 Database: ${database.name}`)
console.log(`🔄 Durable Object: ${durableObject.className}`)
console.log(`⚡ Worker: ${worker.name}`)
console.log(`🌐 URL: ${worker.url}`)
