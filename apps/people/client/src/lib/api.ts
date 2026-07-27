/**
 * Small typed API client. All endpoints live under the app's subpath
 * (BASE_URL is '/people/'), matching the server's Hono basePath.
 */

export interface PublicUser {
  did: string
  name: string | null
  avatar: string | null
  line: string | null
  highlights: string[]
  interests: string[]
  checkedInAt: string | null
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || `Request to ${path} failed`)
  }
  return response.json()
}

export async function checkIn(params: {
  profileJwt: string
  line: string
  highlights: string[]
  interests: string[]
}): Promise<PublicUser & { isAdmin: boolean }> {
  return postJson('check-in', params)
}

export async function removeUser(profileJwt: string, targetDid: string): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/remove-user`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileJwt, targetDid }),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || 'Failed to remove camper')
  }
}

export async function fetchUsers(): Promise<PublicUser[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/users`)
  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }
  const { users } = (await response.json()) as { users: PublicUser[] }
  return users
}
