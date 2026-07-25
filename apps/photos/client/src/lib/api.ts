/**
 * Typed client for the photos API. All paths are BASE_URL-relative so they
 * work under the /photos/ subpath in dev (Vite proxy) and prod.
 */

export interface PublicPhoto {
  id: string
  fullKey: string
  thumbKey: string
  width: number
  height: number
  contentType: string
  did: string
  createdAt: number // unix seconds
}

export interface Uploader {
  did: string
  name: string | null
  avatar: string | null
}

export interface RollResponse {
  photos: PublicPhoto[]
  uploaders: Record<string, Uploader>
}

export interface UploadSlot {
  id: string
  fullUploadUrl: string
  thumbUploadUrl: string
}

const api = (path: string) => `${import.meta.env.BASE_URL}api/${path}`

export const imgUrl = (key: string) => api(`img/${key}`)

async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(api(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error((data as { error?: string } | null)?.error ?? `Request failed (${response.status})`)
  }
  return response.json()
}

export function fetchRoll(): Promise<RollResponse> {
  return requestJson('GET', 'photos')
}

export function requestUploads(profileJwt: string, count: number): Promise<{ uploads: UploadSlot[] }> {
  return requestJson('POST', 'request-uploads', { profileJwt, count })
}

export function confirmUploads(
  profileJwt: string,
  photos: Array<{ id: string; width: number; height: number }>
): Promise<{ photos: PublicPhoto[]; failed: string[] }> {
  return requestJson('POST', 'confirm-uploads', { profileJwt, photos })
}

export function deletePhoto(profileJwt: string, id: string): Promise<{ success: boolean }> {
  return requestJson('DELETE', 'photo', { profileJwt, id })
}
