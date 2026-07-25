/**
 * Cloudflare Worker with WebSocket for real-time user updates
 *
 * This is the main API entry point for the Local First Auth starter.
 * Endpoints handle user profile management via JWT-verified requests.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import type { Env } from './types'
import { Broadcaster } from './durable-object'
import { createDb } from './db/client'
import * as UserModel from './db/models/users'
import * as PhotoModel from './db/models/photos'
import type { Photo } from './db/models/photos'
import { canPresign, uploadUrlFor } from './r2'
import { decodeAndVerifyJWT } from '@dweb/photos-shared'

// The app is served under /<slug>/ on the shared domain; basePath keeps every
// handler's route written as /api/* while matching /<slug>/api/* on the wire.
const app = new Hono<{ Bindings: Env }>().basePath('/photos')

/**
 * Verify a Local First Auth JWT and enforce that it was minted for our origin
 * (the ALLOWED_PRODUCTION_ORIGIN binding; unset in dev, which skips the audience
 * check).
 * local-first-auth signs with a per-origin key, so a JWT issued at another origin carries
 * a different DID and would silently create a duplicate user row.
 */
const verifyJwt = (c: Context<{ Bindings: Env }>, jwt: string) =>
  decodeAndVerifyJWT(jwt, c.env.ALLOWED_PRODUCTION_ORIGIN)

// Enable CORS for all requests
app.use('/*', cors({
  origin: '*',
  credentials: true,
}))

/**
 * POST /api/add-user - Add or update user profile (without avatar)
 * Preserves existing avatar if user already exists
 */
app.post('/api/add-user', async (c) => {
  try {
    const body = await c.req.json()
    const { profileJwt } = body

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }

    // Verify and decode the profile JWT
    const profilePayload = await verifyJwt(c, profileJwt)

    // Key the user off the cryptographically verified DID (not data.did, which the
    // caller can set to anyone's DID and would let them overwrite that user's row)
    const did = profilePayload.iss

    // Extract profile data
    const { name, socials } = profilePayload.data as {
      name: string
      socials?: Array<{ platform: string; handle: string }>
    }

    // Create database instance and upsert user
    const db = createDb(c.env.DB)
    const user = await UserModel.addOrUpdateUser(
      db,
      did,
      name,
      socials ?? []
    )

    // Broadcast to all WebSocket clients via Durable Object
    await notifyDO(c, 'user-joined', user)

    return c.json(user)
  } catch (error) {
    console.error('Add user error:', error)
    return c.json(
      { error: 'Failed to add user', message: (error as Error).message },
      500
    )
  }
})

/**
 * POST /api/add-avatar - Add or update user avatar
 * Creates user with avatar only if doesn't exist yet
 */
app.post('/api/add-avatar', async (c) => {
  try {
    const body = await c.req.json()
    const { avatarJwt } = body

    if (!avatarJwt) {
      return c.json({ error: 'Missing avatarJwt' }, 400)
    }

    // Verify and decode the avatar JWT
    const avatarPayload = await verifyJwt(c, avatarJwt)

    // Extract DID from issuer and avatar from data
    const did = avatarPayload.iss
    const { avatar } = avatarPayload.data as { avatar: string }

    if (!avatar) {
      return c.json({ error: 'No avatar data in JWT' }, 400)
    }

    // Create database instance and upsert avatar
    const db = createDb(c.env.DB)
    const user = await UserModel.addOrUpdateUserAvatar(db, did, avatar)

    // Broadcast to all WebSocket clients via Durable Object
    await notifyDO(c, 'user-joined', user)

    return c.json(user)
  } catch (error) {
    console.error('Add avatar error:', error)
    return c.json(
      { error: 'Failed to add avatar', message: (error as Error).message },
      500
    )
  }
})

/**
 * DELETE /api/remove-user - Remove user
 * Requires JWT verification to ensure user is removing themselves
 */
app.delete('/api/remove-user', async (c) => {
  try {
    const body = await c.req.json()
    const { profileJwt } = body

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }

    // Verify and decode the JWT to get the user's DID
    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    // Create database instance and delete user
    const db = createDb(c.env.DB)
    await UserModel.deleteUserByDID(db, did)

    // Their photos go with them (the feed inner-joins users, so leftover rows
    // would vanish from listings anyway but leak R2 storage)
    const removedPhotos = await PhotoModel.deletePhotosByDid(db, did)
    if (removedPhotos.length) {
      const keys = removedPhotos.flatMap((p) => [p.fullKey, p.thumbKey])
      await c.env.PHOTOS_BUCKET.delete(keys)
      await purgeImgCache(c, keys)
    }

    // Broadcast to all WebSocket clients via Durable Object
    await notifyDO(c, 'user-left', { did })
    for (const photo of removedPhotos) {
      await notifyDO(c, 'photo-deleted', { id: photo.id })
    }

    return c.json({ success: true, did })
  } catch (error) {
    console.error('Remove user error:', error)
    return c.json(
      { error: 'Failed to remove user', message: (error as Error).message },
      500
    )
  }
})

/**
 * GET /api/users - Get all users
 */
app.get('/api/users', async (c) => {
  try {
    const db = createDb(c.env.DB)
    const users = await UserModel.getAllUsers(db)
    return c.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json(
      { error: 'Failed to fetch users', message: (error as Error).message },
      500
    )
  }
})

/**
 * POST /api/reset - Reset event (admin only)
 * Broadcasts reset message and clears all non-admin users
 */
app.post('/api/reset', async (c) => {
  try {
    const body = await c.req.json()
    const { profileJwt, message } = body

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Missing or invalid message' }, 400)
    }

    // Verify and decode the JWT to get the user's DID
    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    // Check if user is admin
    const db = createDb(c.env.DB)
    const isAdmin = await UserModel.isUserAdmin(db, did)

    if (!isAdmin) {
      return c.json({ error: 'Unauthorized: Admin access required' }, 403)
    }

    // Broadcast reset message to all connected clients
    await notifyDO(c, 'reset', { message })

    // Clear all non-admin users from database
    await UserModel.deleteNonAdminUsers(db)

    // Wipe the roll: all photo rows plus every object under photos/ in R2
    // (the prefix sweep also clears orphans from never-confirmed uploads)
    await PhotoModel.deleteAllPhotos(db)
    let cursor: string | undefined
    do {
      const listing = await c.env.PHOTOS_BUCKET.list({ prefix: 'photos/', cursor, limit: 1000 })
      if (listing.objects.length) {
        const keys = listing.objects.map((o) => o.key)
        await c.env.PHOTOS_BUCKET.delete(keys)
        await purgeImgCache(c, keys)
      }
      cursor = listing.truncated ? listing.cursor : undefined
    } while (cursor)

    return c.json({ success: true })
  } catch (error) {
    console.error('Reset error:', error)
    return c.json(
      { error: 'Failed to reset', message: (error as Error).message },
      500
    )
  }
})

// ---------------------------------------------------------------------------
// Photos — the shared camp roll
// ---------------------------------------------------------------------------

const MAX_BATCH = 25
const PHOTO_KEY_RE = /^photos\/[0-9a-f-]{36}\/(full|thumb)\.jpg$/

const photoKeys = (id: string) => ({
  fullKey: `photos/${id}/full.jpg`,
  thumbKey: `photos/${id}/thumb.jpg`,
})

// Deleted photos must stop being servable, but GET /api/img/* responses sit in
// the edge cache with a year-long TTL — purge them (best-effort; the Cache API
// is per-datacenter, and UUID keys are unguessable anyway).
async function purgeImgCache(c: Context<{ Bindings: Env }>, keys: string[]): Promise<void> {
  try {
    const cache = caches.default
    await Promise.all(
      keys.map((key) => cache.delete(new URL(`/photos/api/img/${key}`, c.req.url).toString()))
    )
  } catch (err) {
    console.error('Error purging image cache:', err)
  }
}

// What goes over the wire (list responses + photo-added broadcasts).
// createdAt as unix seconds; no isAdmin/blocked-style internals to leak here.
const toPublicPhoto = (p: Photo) => ({
  id: p.id,
  fullKey: p.fullKey,
  thumbKey: p.thumbKey,
  width: p.width,
  height: p.height,
  contentType: p.contentType,
  did: p.did,
  createdAt: Math.floor(p.createdAt.getTime() / 1000),
})

/**
 * POST /api/request-uploads - Mint direct-upload URLs for a batch of photos
 * Stateless: rows are only created at confirm time, once the objects exist.
 */
app.post('/api/request-uploads', async (c) => {
  try {
    const { profileJwt, count } = await c.req.json()

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
      return c.json({ error: `count must be an integer between 1 and ${MAX_BATCH}` }, 400)
    }

    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    const db = createDb(c.env.DB)
    const user = await UserModel.getUserByDID(db, did)
    if (!user || user.blocked) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const uploads = await Promise.all(
      Array.from({ length: count }, async () => {
        const id = crypto.randomUUID()
        const { fullKey, thumbKey } = photoKeys(id)
        return {
          id,
          fullUploadUrl: await uploadUrlFor(c.env, fullKey),
          thumbUploadUrl: await uploadUrlFor(c.env, thumbKey),
        }
      })
    )

    return c.json({ uploads })
  } catch (error) {
    console.error('Request uploads error:', error)
    return c.json(
      { error: 'Failed to create upload URLs', message: (error as Error).message },
      500
    )
  }
})

/**
 * PUT /api/dev-upload/* - Local-dev stand-in for presigned R2 PUTs
 * Writes to the simulated bucket via the binding. Disabled whenever real
 * presign credentials exist (prod).
 */
app.put('/api/dev-upload/*', async (c) => {
  if (canPresign(c.env)) {
    return c.json({ error: 'Not found' }, 404)
  }

  const key = decodeURIComponent(c.req.path.replace('/photos/api/dev-upload/', ''))
  if (!PHOTO_KEY_RE.test(key)) {
    return c.json({ error: 'Invalid key' }, 400)
  }

  await c.env.PHOTOS_BUCKET.put(key, c.req.raw.body, {
    httpMetadata: { contentType: c.req.header('content-type') ?? 'image/jpeg' },
  })
  return c.json({ ok: true })
})

/**
 * POST /api/confirm-uploads - Turn uploaded objects into live roll frames
 * Verifies both objects exist in R2 before creating each row; ids whose
 * uploads didn't complete come back in `failed`.
 */
app.post('/api/confirm-uploads', async (c) => {
  try {
    const { profileJwt, photos: requested } = await c.req.json()

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > MAX_BATCH) {
      return c.json({ error: `photos must be an array of 1 to ${MAX_BATCH} items` }, 400)
    }

    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    const db = createDb(c.env.DB)
    const user = await UserModel.getUserByDID(db, did)
    if (!user || user.blocked) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const entries: PhotoModel.PhotoInsert[] = []
    const failed: string[] = []
    for (const item of requested) {
      const { id, width, height } = item ?? {}
      const { fullKey, thumbKey } = photoKeys(String(id))
      const valid =
        PHOTO_KEY_RE.test(fullKey) &&
        Number.isInteger(width) && width > 0 && width <= 10000 &&
        Number.isInteger(height) && height > 0 && height <= 10000
      if (!valid) {
        failed.push(String(id))
        continue
      }
      const [full, thumb] = await Promise.all([
        c.env.PHOTOS_BUCKET.head(fullKey),
        c.env.PHOTOS_BUCKET.head(thumbKey),
      ])
      if (!full || !thumb) {
        failed.push(id)
        continue
      }
      entries.push({ id, did, fullKey, thumbKey, contentType: 'image/jpeg', width, height })
    }

    const inserted = entries.length ? await PhotoModel.insertPhotos(db, entries) : []

    const uploader = { did, name: user.name, avatar: user.avatar }
    for (const photo of inserted) {
      await notifyDO(c, 'photo-added', { ...toPublicPhoto(photo), uploader })
    }

    return c.json({ photos: inserted.map(toPublicPhoto), failed })
  } catch (error) {
    console.error('Confirm uploads error:', error)
    return c.json(
      { error: 'Failed to confirm uploads', message: (error as Error).message },
      500
    )
  }
})

/**
 * GET /api/photos - The whole roll, oldest first (public)
 * Uploaders are deduped into a map so base64 avatars aren't repeated per photo.
 */
app.get('/api/photos', async (c) => {
  try {
    const db = createDb(c.env.DB)
    const rows = await PhotoModel.getLivePhotos(db)

    const uploaders: Record<string, { did: string; name: string | null; avatar: string | null }> = {}
    for (const { uploader } of rows) {
      uploaders[uploader.did] = uploader
    }

    return c.json({ photos: rows.map((r) => toPublicPhoto(r.photo)), uploaders })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return c.json(
      { error: 'Failed to fetch photos', message: (error as Error).message },
      500
    )
  }
})

/**
 * DELETE /api/photo - Remove a frame (uploader themselves, or any admin)
 */
app.delete('/api/photo', async (c) => {
  try {
    const { profileJwt, id } = await c.req.json()

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }
    if (!id || typeof id !== 'string') {
      return c.json({ error: 'Missing photo id' }, 400)
    }

    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    const db = createDb(c.env.DB)
    const photo = await PhotoModel.getPhotoById(db, id)
    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404)
    }

    if (photo.did !== did && !(await UserModel.isUserAdmin(db, did))) {
      return c.json({ error: 'Unauthorized: not your photo' }, 403)
    }

    await c.env.PHOTOS_BUCKET.delete([photo.fullKey, photo.thumbKey])
    await PhotoModel.deletePhotoById(db, id)
    await purgeImgCache(c, [photo.fullKey, photo.thumbKey])
    await notifyDO(c, 'photo-deleted', { id })

    return c.json({ success: true, id })
  } catch (error) {
    console.error('Delete photo error:', error)
    return c.json(
      { error: 'Failed to delete photo', message: (error as Error).message },
      500
    )
  }
})

/**
 * GET /api/img/* - Serve a photo from R2 (public)
 * Keys are UUID-based and immutable, so responses cache aggressively at the
 * edge (Cache API) and in the browser.
 */
app.get('/api/img/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace('/photos/api/img/', ''))
  if (!PHOTO_KEY_RE.test(key)) {
    return c.json({ error: 'Not found' }, 404)
  }

  const cache = caches.default
  const cached = await cache.match(c.req.raw)
  if (cached) {
    return cached
  }

  const obj = await c.env.PHOTOS_BUCKET.get(key)
  if (!obj) {
    return c.json({ error: 'Not found' }, 404)
  }

  const res = new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      'ETag': obj.httpEtag,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()))
  return res
})

/**
 * Helper function to notify Durable Object about user changes
 */
async function notifyDO(c: Context<{ Bindings: Env }>, event: string, data: any): Promise<void> {
  try {
    const id = c.env.DURABLE_OBJECT.idFromName('default')
    const stub = c.env.DURABLE_OBJECT.get(id)
    await stub.fetch(new Request('http://do/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }))
  } catch (err) {
    console.error('Error notifying Durable Object:', err)
  }
}

/**
 * GET /api/ws - WebSocket endpoint for real-time updates
 * Forwards to Durable Object for connection management
 */
app.get('/api/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade')

  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426)
  }

  // Forward WebSocket upgrade to Durable Object
  const id = c.env.DURABLE_OBJECT.idFromName('default')
  const stub = c.env.DURABLE_OBJECT.get(id)

  return stub.fetch(new Request('http://do/ws', {
    headers: c.req.raw.headers,
  }))
})
/**
 * GET /api - Root api endpoint - Used for health check
 */
app.get('/api', (c) => {
  return c.text('😁')
})

// Export Durable Object
export { Broadcaster }

// Export Worker fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
  },
}
