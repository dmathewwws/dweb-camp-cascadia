import { useEffect, useMemo, useState } from 'react'
import { ALL_TAGS } from '@dweb/people-shared'
import { fetchUsers, type PublicUser } from '../lib/api'
import { useLocalFirstAuth } from './useLocalFirstAuth'

export interface Camper extends PublicUser {
  shared: string[]
  isSelf?: boolean
}

export function useDirectory() {
  const { user, subscribeToWs } = useLocalFirstAuth()
  const [byDid, setByDid] = useState<Map<string, PublicUser>>(new Map())
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string | null>(null)

  const myDid = user?.did
  const myInterests = useMemo(() => new Set(user?.interests ?? []), [user?.interests])

  useEffect(() => {
    let cancelled = false

    const refetch = async () => {
      try {
        const users = await fetchUsers()
        if (cancelled) return
        setByDid(new Map(users.map((u) => [u.did, u])))
      } catch (err) {
        console.error('Failed to fetch directory:', err)
      }
    }

    refetch()

    // Refetch on every (re)connect to heal missed events; individual events
    // keep the map fresh in between without re-downloading avatars.
    const unsubscribe = subscribeToWs((message) => {
      switch (message.type) {
        case 'connected':
          refetch()
          break
        case 'user-joined':
        case 'user-updated':
          if (message.data?.did) {
            setByDid((prev) => new Map(prev).set(message.data.did, message.data))
          }
          break
        case 'user-left':
          if (message.data?.did) {
            setByDid((prev) => {
              const next = new Map(prev)
              next.delete(message.data.did)
              return next
            })
          }
          break
        case 'reset':
          setByDid(new Map())
          break
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [subscribeToWs])

  // Everyone checked in, with shared-roots computed against me. My own card
  // gets an empty `shared` so it doesn't render as a kindred match with myself.
  const campers: Camper[] = useMemo(
    () =>
      [...byDid.values()]
        .filter((u) => (u.interests?.length ?? 0) >= 1)
        .map((u) =>
          u.did === myDid
            ? { ...u, shared: [], isSelf: true }
            : { ...u, shared: u.interests.filter((t) => myInterests.has(t)) }
        ),
    [byDid, myDid, myInterests]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return campers
      .filter((c) => !filter || c.interests.includes(filter))
      .filter(
        (c) =>
          !q ||
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.line ?? '').toLowerCase().includes(q) ||
          c.highlights.some((h) => h.toLowerCase().includes(q)) ||
          c.interests.some((t) => t.includes(q))
      )
      .sort(
        (a, b) =>
          (a.isSelf ? 1 : 0) - (b.isSelf ? 1 : 0) ||
          b.shared.length - a.shared.length ||
          (a.name ?? '').localeCompare(b.name ?? '')
      )
  }, [campers, query, filter])

  // Filter chips: tags with ≥1 camper, my own roots first, then by popularity
  const filterTags = useMemo(() => {
    const counts = new Map<string, number>()
    campers.forEach((c) => c.interests.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return ALL_TAGS.filter((t) => counts.has(t)).sort((a, b) => {
      const aMine = myInterests.has(a) ? 1 : 0
      const bMine = myInterests.has(b) ? 1 : 0
      return bMine - aMine || (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    })
  }, [campers, myInterests])

  return {
    campers,
    visible,
    filterTags,
    query,
    setQuery,
    filter,
    setFilter,
    myInterests,
  }
}
