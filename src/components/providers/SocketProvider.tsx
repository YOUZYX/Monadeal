'use client'

import { useEffect } from 'react'

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Socket.IO server via API call
    const initSocket = async () => {
      try {
        const response = await fetch('/api/socket')
        if (response.ok) {
          console.log('✅ Socket.IO initialized via API')
        }
      } catch (error) {
        console.error('❌ Failed to initialize Socket.IO:', error)
      }
    }

    initSocket()
  }, [])

  return <>{children}</>
} 