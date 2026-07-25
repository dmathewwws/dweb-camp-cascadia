/**
 * Photo model - Database operations for the shared camp roll
 */

import { asc, eq } from 'drizzle-orm'
import type { Database } from '../client.js'
import { photos, users, type Photo, type PhotoInsert } from '../schema.js'

// Re-export types
export type { Photo, PhotoInsert }

export interface PhotoWithUploader {
  photo: Photo
  uploader: { did: string; name: string | null; avatar: string | null }
}

/**
 * All photos in roll order (oldest first; id tiebreaks batch inserts that
 * share a second), excluding photos from blocked users
 */
export async function getLivePhotos(db: Database): Promise<PhotoWithUploader[]> {
  const rows = await db
    .select({ photo: photos, name: users.name, avatar: users.avatar })
    .from(photos)
    .innerJoin(users, eq(photos.did, users.did))
    .where(eq(users.blocked, false))
    .orderBy(asc(photos.createdAt), asc(photos.id))
    .limit(2000)

  return rows.map(({ photo, name, avatar }) => ({
    photo,
    uploader: { did: photo.did, name, avatar },
  }))
}

/**
 * Get a single photo by id
 */
export async function getPhotoById(db: Database, id: string): Promise<Photo | undefined> {
  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1)

  return photo
}

/**
 * Insert a batch of confirmed photos. onConflictDoNothing so a replayed
 * confirm request can't duplicate rows; returns only the newly inserted ones.
 */
export async function insertPhotos(db: Database, entries: PhotoInsert[]): Promise<Photo[]> {
  return await db
    .insert(photos)
    .values(entries)
    .onConflictDoNothing()
    .returning()
}

/**
 * Delete a photo by id
 */
export async function deletePhotoById(db: Database, id: string): Promise<void> {
  await db.delete(photos).where(eq(photos.id, id))
}

/**
 * Delete all photos by an uploader, returning the deleted rows so the caller
 * can clean up the R2 objects
 */
export async function deletePhotosByDid(db: Database, did: string): Promise<Photo[]> {
  return await db
    .delete(photos)
    .where(eq(photos.did, did))
    .returning()
}

/**
 * Clear the whole roll (admin reset)
 */
export async function deleteAllPhotos(db: Database): Promise<void> {
  await db.delete(photos)
  console.log('✅ All photos deleted')
}
