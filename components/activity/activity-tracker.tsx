'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const SESSION_KEY = 'viros_activity_session_id'
const HEARTBEAT_INTERVAL_MS = 45000 // 45 seconds

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      window.sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}

export function ActivityTracker() {
  const { data: session, status } = useSession()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionIdRef = useRef<string>('')

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return
    }

    const sessionId = getOrCreateSessionId()
    sessionIdRef.current = sessionId

    // Initial silent tracking call
    const trackLogin = async () => {
      try {
        await fetch('/api/activity/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
      } catch {
        // Silent fail
      }
    }

    void trackLogin()

    // Silent heartbeat loop for software usage duration
    const sendPing = async () => {
      try {
        await fetch('/api/activity/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
      } catch {
        // Silent fail
      }
    }

    intervalRef.current = setInterval(() => {
      void sendPing()
    }, HEARTBEAT_INTERVAL_MS)

    // Handle tab / browser close with Beacon API
    const handleUnload = () => {
      try {
        const payload = JSON.stringify({ sessionId: sessionIdRef.current, isClosing: true })
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          navigator.sendBeacon('/api/activity/ping', blob)
        } else {
          void fetch('/api/activity/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          })
        }
      } catch {
        // Silent fail
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [status, session?.user?.id])

  return null
}
