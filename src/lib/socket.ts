import { io, Socket } from 'socket.io-client'
import { appConfig } from './config'

// Socket.IO client instance
let socket: Socket | null = null

export const initializeSocket = () => {
  if (!socket) {
    socket = io(appConfig.socketio.url, {
      ...appConfig.socketio.options,
      transports: ['websocket', 'polling'] // Non-readonly array
    })
  }
  return socket
}

export const getSocket = () => {
  if (!socket) {
    return initializeSocket()
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Socket event types
export interface SocketEvents {
  // Chat events
  'join-deal': (dealId: string) => void
  'leave-deal': (dealId: string) => void
  'send-message': (data: { dealId: string; content: string; senderAddress: string }) => void
  'receive-message': (data: { id: string; dealId: string; content: string; senderAddress: string; timestamp: string }) => void
  
  // Deal events
  'deal-updated': (data: { dealId: string; status: string; updatedBy: string }) => void
  'deal-created': (data: { dealId: string; creatorAddress: string }) => void
  
  // User events
  'user-typing': (data: { dealId: string; userAddress: string; isTyping: boolean }) => void
  'user-online': (data: { userAddress: string }) => void
  'user-offline': (data: { userAddress: string }) => void
} 