import { useEffect, useRef, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, initializeSocket } from '@/lib/socket'
import { useAccount } from 'wagmi'

// Socket event types
export interface SocketMessage {
  id: string
  dealId: string
  content: string
  senderAddress: string
  type: 'TEXT' | 'SYSTEM' | 'DEAL_UPDATE' | 'IMAGE' | 'NFT_PREVIEW'
  timestamp: Date
  sender?: {
    address: string
    username?: string
    avatar?: string
    ensName?: string
  }
  replyTo?: {
    id: string
    content: string
    senderAddress: string
  }
}

export interface SocketTypingEvent {
  dealId: string
  userAddress: string
  isTyping: boolean
  timestamp: Date
}

export interface SocketUserEvent {
  userAddress: string
  timestamp?: Date
}

export interface SocketDealEvent {
  dealId: string
  status: string
  updatedBy: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface SocketNotificationEvent {
  type: string
  dealId?: string
  message: string
  timestamp: Date
}

// Main Socket.IO hook
export function useSocket() {
  const { address, isConnected } = useAccount()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!address || !isConnected) {
      console.log('Cannot connect socket: wallet not connected')
      return
    }

    try {
      console.log('Connecting socket for user:', address)
             const newSocket = initializeSocket()
      
      // Set authentication
      newSocket.auth = { userAddress: address }
      
      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id)
        setIsSocketConnected(true)
        setConnectionError(null)
        reconnectAttempts.current = 0
      })

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        setIsSocketConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setConnectionError(error.message)
        
        // Exponential backoff for reconnection
        reconnectAttempts.current++
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000
          setTimeout(() => {
            console.log(`Retrying connection (attempt ${reconnectAttempts.current + 1})`)
            newSocket.connect()
          }, delay)
        }
      })

      newSocket.on('error', (error) => {
        console.error('Socket error:', error)
        setConnectionError(error.message)
      })

      setSocket(newSocket)
    } catch (error) {
      console.error('Failed to initialize socket:', error)
      setConnectionError('Failed to initialize socket connection')
    }
  }, [address, isConnected])

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('Disconnecting socket')
      socket.disconnect()
      setSocket(null)
      setIsSocketConnected(false)
      setConnectionError(null)
    }
  }, [socket])

  // Auto-connect when wallet is connected
  useEffect(() => {
    if (address && isConnected && !socket) {
      connect()
    } else if ((!address || !isConnected) && socket) {
      disconnect()
    }

    return () => {
      if (socket && !isConnected) {
        socket.disconnect()
      }
    }
  }, [address, isConnected, socket, connect, disconnect])

  return {
    socket,
    isConnected: isSocketConnected,
    connectionError,
    connect,
    disconnect,
  }
}

// Hook for deal room management
export function useDealRoom(dealId: string) {
  const { socket, isConnected } = useSocket()
  const { address } = useAccount()
  const [isInRoom, setIsInRoom] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)

  const joinRoom = useCallback(() => {
    if (!socket || !isConnected || !address || !dealId) {
      console.log('Cannot join room: socket not ready or missing data')
      return
    }

    console.log('Joining deal room:', dealId)
    socket.emit('join-deal', { dealId, userAddress: address })
  }, [socket, isConnected, address, dealId])

  const leaveRoom = useCallback(() => {
    if (!socket || !dealId) return

    console.log('Leaving deal room:', dealId)
    socket.emit('leave-deal', { dealId })
  }, [socket, dealId])

  useEffect(() => {
    if (!socket || !isConnected) return

    // Room event handlers
    const handleDealJoined = (data: { dealId: string }) => {
      if (data.dealId === dealId) {
        setIsInRoom(true)
        setRoomError(null)
        console.log('Successfully joined deal room:', dealId)
      }
    }

    const handleDealLeft = (data: { dealId: string }) => {
      if (data.dealId === dealId) {
        setIsInRoom(false)
        console.log('Left deal room:', dealId)
      }
    }

    const handleError = (error: { message: string }) => {
      setRoomError(error.message)
      console.error('Deal room error:', error.message)
    }

    socket.on('deal-joined', handleDealJoined)
    socket.on('deal-left', handleDealLeft)
    socket.on('error', handleError)

    // Auto-join room when socket is ready
    if (dealId) {
      joinRoom()
    }

    return () => {
      socket.off('deal-joined', handleDealJoined)
      socket.off('deal-left', handleDealLeft)
      socket.off('error', handleError)
      
      // Leave room on cleanup
      if (isInRoom) {
        leaveRoom()
      }
    }
  }, [socket, isConnected, dealId, joinRoom, leaveRoom, isInRoom])

  return {
    isInRoom,
    roomError,
    joinRoom,
    leaveRoom,
  }
}

// Hook for real-time messaging
export function useSocketMessages(dealId: string) {
  const { socket } = useSocket()
  const { address } = useAccount()
  const [messages, setMessages] = useState<SocketMessage[]>([])

  const sendMessage = useCallback((content: string, replyToId?: string) => {
    if (!socket || !address || !dealId || !content.trim()) return

    socket.emit('send-message', {
      dealId,
      content: content.trim(),
      senderAddress: address,
      type: 'TEXT',
      replyToId,
    })
  }, [socket, address, dealId])

  useEffect(() => {
    if (!socket) return

    const handleReceiveMessage = (data: SocketMessage) => {
      if (data.dealId === dealId) {
        setMessages(prev => [...prev, data])
      }
    }

    socket.on('receive-message', handleReceiveMessage)

    return () => {
      socket.off('receive-message', handleReceiveMessage)
    }
  }, [socket, dealId])

  return {
    messages,
    sendMessage,
    clearMessages: () => setMessages([]),
  }
}

// Hook for typing indicators
export function useSocketTyping(dealId: string) {
  const { socket } = useSocket()
  const { address } = useAccount()
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setTyping = useCallback((isTyping: boolean) => {
    if (!socket || !address || !dealId) return

    socket.emit('typing', {
      dealId,
      userAddress: address,
      isTyping,
    })

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          dealId,
          userAddress: address,
          isTyping: false,
        })
      }, 3000)
    }
  }, [socket, address, dealId])

  useEffect(() => {
    if (!socket) return

    const handleUserTyping = (data: SocketTypingEvent) => {
      if (data.dealId === dealId && data.userAddress !== address) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          if (data.isTyping) {
            newSet.add(data.userAddress)
          } else {
            newSet.delete(data.userAddress)
          }
          return newSet
        })

        // Auto-remove typing indicator after 5 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev)
              newSet.delete(data.userAddress)
              return newSet
            })
          }, 5000)
        }
      }
    }

    socket.on('user-typing', handleUserTyping)

    return () => {
      socket.off('user-typing', handleUserTyping)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [socket, dealId, address])

  return {
    typingUsers: Array.from(typingUsers),
    setTyping,
  }
}

// Hook for deal updates
export function useSocketDealUpdates(dealId?: string) {
  const { socket } = useSocket()
  const { address } = useAccount()
  const [dealUpdates, setDealUpdates] = useState<SocketDealEvent[]>([])

  const emitDealUpdate = useCallback((status: string, metadata?: Record<string, any>) => {
    if (!socket || !dealId || !address) return

    socket.emit('deal-updated', {
      dealId,
      status,
      updatedBy: address,
      metadata,
    })
  }, [socket, dealId, address])

  useEffect(() => {
    if (!socket) return

    const handleDealUpdate = (data: SocketDealEvent) => {
      if (!dealId || data.dealId === dealId) {
        setDealUpdates(prev => [...prev, data])
      }
    }

    socket.on('deal-status-updated', handleDealUpdate)

    return () => {
      socket.off('deal-status-updated', handleDealUpdate)
    }
  }, [socket, dealId])

  return {
    dealUpdates,
    emitDealUpdate,
    clearDealUpdates: () => setDealUpdates([]),
  }
}

// Hook for user presence
export function useSocketPresence() {
  const { socket } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!socket) return

    const handleUserOnline = (data: SocketUserEvent) => {
      setOnlineUsers(prev => new Set(prev).add(data.userAddress))
    }

    const handleUserOffline = (data: SocketUserEvent) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.userAddress)
        return newSet
      })
    }

    socket.on('user-online', handleUserOnline)
    socket.on('user-offline', handleUserOffline)

    return () => {
      socket.off('user-online', handleUserOnline)
      socket.off('user-offline', handleUserOffline)
    }
  }, [socket])

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline: (userAddress: string) => onlineUsers.has(userAddress),
  }
}

// Hook for notifications
export function useSocketNotifications() {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<SocketNotificationEvent[]>([])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const removeNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleNotification = (data: SocketNotificationEvent) => {
      setNotifications(prev => [...prev, data])
      
      // Auto-remove notification after 10 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== data))
      }, 10000)
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket])

  return {
    notifications,
    clearNotifications,
    removeNotification,
  }
} 