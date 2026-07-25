import { useCallback, useEffect, useRef, useState } from 'react'

export interface WsMessage {
  type: string
  data?: any
}

export type WsListener = (message: WsMessage) => void

interface UseWebSocketsOptions {
  isAdmin: boolean
  onReset?: () => void
}

const MAX_BACKOFF_MS = 30_000

/**
 * Always-on WebSocket to the app's Durable Object. Connects regardless of
 * auth state — the roll is public, so logged-out viewers get live frames too.
 */
export function useWebSockets({ isAdmin, onReset }: UseWebSocketsOptions) {
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Set<WsListener>>(new Set())
  const backoffRef = useRef(1000)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closedByCleanupRef = useRef(false)

  // Stable across renders so consumers can subscribe once
  const subscribe = useCallback((listener: WsListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const notifyListeners = (message: WsMessage) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(message)
      } catch (err) {
        console.error('WebSocket listener error:', err)
      }
    })
  }

  useEffect(() => {
    closedByCleanupRef.current = false

    const connect = () => {
      // Don't stack sockets if one is already open/connecting
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${import.meta.env.BASE_URL}api/ws`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = 1000
        // Synthetic event so consumers can refetch state missed while offline
        notifyListeners({ type: 'connected' })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'reset') {
            setResetMessage(data.data.message)
            if (!isAdmin) {
              onReset?.()
            }
          }

          notifyListeners(data)
        } catch (err) {
          console.error('WebSocket message error:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
      }

      ws.onclose = () => {
        wsRef.current = null
        if (closedByCleanupRef.current) return
        // Phones sleep/background constantly at camp — retry with backoff
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }

    // Reconnect immediately when the phone wakes or comes back online
    const reconnectNow = () => {
      if (document.visibilityState === 'hidden') return
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      backoffRef.current = 1000
      connect()
    }
    document.addEventListener('visibilitychange', reconnectNow)
    window.addEventListener('online', reconnectNow)

    connect()

    return () => {
      closedByCleanupRef.current = true
      document.removeEventListener('visibilitychange', reconnectNow)
      window.removeEventListener('online', reconnectNow)
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [isAdmin, onReset])

  return { resetMessage, setResetMessage, subscribe }
}
