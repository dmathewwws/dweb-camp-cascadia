import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchRoll, type PublicPhoto, type Uploader } from '../lib/api'
import { useLocalFirstAuth } from './useLocalFirstAuth'

/**
 * The shared roll, kept in sync over WebSocket. Frame numbers are positional:
 * index + 1 in this sorted list (deleting a frame renumbers later ones).
 */

interface RollContextType {
  photos: PublicPhoto[]
  uploaders: Record<string, Uploader>
  loading: boolean
  mergePhotos: (incoming: PublicPhoto[], incomingUploaders?: Record<string, Uploader>) => void
}

const RollContext = createContext<RollContextType | undefined>(undefined)

const byRollOrder = (a: PublicPhoto, b: PublicPhoto) =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id)

export function RollProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useLocalFirstAuth()
  const [photos, setPhotos] = useState<PublicPhoto[]>([])
  const [uploaders, setUploaders] = useState<Record<string, Uploader>>({})
  const [loading, setLoading] = useState(true)

  const mergePhotos = useCallback(
    (incoming: PublicPhoto[], incomingUploaders?: Record<string, Uploader>) => {
      if (incomingUploaders) {
        setUploaders((prev) => ({ ...prev, ...incomingUploaders }))
      }
      setPhotos((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]))
        incoming.forEach((p) => byId.set(p.id, p))
        return [...byId.values()].sort(byRollOrder)
      })
    },
    []
  )

  const refetch = useCallback(async () => {
    try {
      const { photos, uploaders } = await fetchRoll()
      setPhotos(photos.sort(byRollOrder))
      setUploaders(uploaders)
    } catch (err) {
      console.error('Error fetching roll:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'photo-added': {
          const { uploader, ...photo } = message.data
          mergePhotos([photo as PublicPhoto], uploader ? { [uploader.did]: uploader } : undefined)
          break
        }
        case 'photo-deleted':
          setPhotos((prev) => prev.filter((p) => p.id !== message.data.id))
          break
        case 'user-joined': {
          // Profile/avatar updates for someone whose frames are on the roll
          const { did, name, avatar } = message.data ?? {}
          if (did) {
            setUploaders((prev) => (prev[did] ? { ...prev, [did]: { did, name, avatar } } : prev))
          }
          break
        }
        case 'reset':
          setPhotos([])
          setUploaders({})
          break
        case 'connected':
          // Catch up on anything missed while the phone slept
          refetch()
          break
      }
    })
  }, [subscribe, mergePhotos, refetch])

  return (
    <RollContext.Provider value={{ photos, uploaders, loading, mergePhotos }}>
      {children}
    </RollContext.Provider>
  )
}

export function useRoll() {
  const context = useContext(RollContext)
  if (context === undefined) {
    throw new Error('useRoll must be used within a RollProvider')
  }
  return context
}
