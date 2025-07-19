import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from './prisma'
import { createMessage, setUserOnlineStatus, createNotification } from './database'
import { MessageType } from '@prisma/client'

// Enhanced socket data interface
interface SocketData {
  userAddress?: string
  dealRooms?: Set<string>
  isAuthenticated?: boolean
}

// Socket event interfaces
interface JoinDealData {
  dealId: string
  userAddress: string
}

interface SendMessageData {
  dealId: string
  content: string
  senderAddress: string
  type?: MessageType
  replyToId?: string
}

interface TypingData {
  dealId: string
  userAddress: string
  isTyping: boolean
}

interface DealUpdateData {
  dealId: string
  status: string
  updatedBy: string
  metadata?: Record<string, any>
}

// Global socket server instance
let io: SocketIOServer | null = null

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const userAddress = socket.handshake.auth.userAddress
      
      if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return next(new Error('Invalid user address'))
      }

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { address: userAddress }
      })

      if (!user) {
        // Create user if doesn't exist
        await prisma.user.create({
          data: {
            address: userAddress,
            isOnline: true,
            lastSeen: new Date(),
          }
        })
      } else {
        // Update user online status
        await setUserOnlineStatus(userAddress, true)
      }

      // Store user data in socket
      socket.data.userAddress = userAddress
      socket.data.dealRooms = new Set()
      socket.data.isAuthenticated = true

      next()
    } catch (error) {
      console.error('Socket authentication error:', error)
      next(new Error('Authentication failed'))
    }
  })

  // Connection handler
  io.on('connection', (socket) => {
    const userAddress = socket.data.userAddress
    console.log(`User connected: ${userAddress} (${socket.id})`)

    // Join user to their personal room for notifications
    socket.join(`user:${userAddress}`)

    // Broadcast user online status
    socket.broadcast.emit('user-online', { userAddress })

    // Handle joining deal rooms
    socket.on('join-deal', async (data: JoinDealData) => {
      try {
        const { dealId, userAddress: requestUserAddress } = data

        // Verify user is authenticated and matches the request
        if (!socket.data.isAuthenticated || socket.data.userAddress !== requestUserAddress) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        // Verify deal exists and user is a participant
        const deal = await prisma.deal.findUnique({
          where: { id: dealId },
          include: {
            creator: true,
            counterparty: true,
          }
        })

        if (!deal) {
          socket.emit('error', { message: 'Deal not found' })
          return
        }

        const isParticipant = 
          deal.creatorAddress === userAddress ||
          deal.counterpartyAddress === userAddress

        if (!isParticipant) {
          socket.emit('error', { message: 'You are not a participant in this deal' })
          return
        }

        // Join deal room
        socket.join(`deal:${dealId}`)
        socket.data.dealRooms?.add(dealId)

        // Notify others in the room
        socket.to(`deal:${dealId}`).emit('user-joined-deal', {
          dealId,
          userAddress,
          timestamp: new Date()
        })

        // Send confirmation
        socket.emit('deal-joined', { dealId })

        console.log(`User ${userAddress} joined deal room: ${dealId}`)
      } catch (error) {
        console.error('Error joining deal:', error)
        socket.emit('error', { message: 'Failed to join deal' })
      }
    })

    // Handle leaving deal rooms
    socket.on('leave-deal', async (data: { dealId: string }) => {
      try {
        const { dealId } = data
        
        socket.leave(`deal:${dealId}`)
        socket.data.dealRooms?.delete(dealId)

        // Notify others in the room
        socket.to(`deal:${dealId}`).emit('user-left-deal', {
          dealId,
          userAddress,
          timestamp: new Date()
        })

        socket.emit('deal-left', { dealId })
        console.log(`User ${userAddress} left deal room: ${dealId}`)
      } catch (error) {
        console.error('Error leaving deal:', error)
      }
    })

    // Handle sending messages
    socket.on('send-message', async (data: SendMessageData) => {
      try {
        const { dealId, content, senderAddress, type = MessageType.TEXT, replyToId } = data

        // Verify user is authenticated
        if (!socket.data.isAuthenticated || socket.data.userAddress !== senderAddress) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        // Verify user is in the deal room
        if (!socket.data.dealRooms?.has(dealId)) {
          socket.emit('error', { message: 'You must join the deal room first' })
          return
        }

        // Create message in database
        const message = await createMessage({
          dealId,
          senderAddress,
          content,
          type,
          replyToId,
        })

        // Get the full message with relations
        const fullMessage = await prisma.message.findUnique({
          where: { id: message.id },
          include: {
            sender: {
              select: {
                address: true,
                username: true,
                avatar: true,
                ensName: true,
              }
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                senderAddress: true,
              }
            }
          }
        })

        // Broadcast message to all users in the deal room
        io?.to(`deal:${dealId}`).emit('receive-message', {
          id: fullMessage?.id,
          dealId,
          content,
          senderAddress,
          type,
          timestamp: fullMessage?.timestamp,
          sender: fullMessage?.sender,
          replyTo: fullMessage?.replyTo,
        })

        // Create notification for the other participant
        const deal = await prisma.deal.findUnique({
          where: { id: dealId },
          select: {
            creatorAddress: true,
            counterpartyAddress: true,
          }
        })

        if (deal) {
          const recipientAddress = deal.creatorAddress === senderAddress 
            ? deal.counterpartyAddress 
            : deal.creatorAddress

          if (recipientAddress) {
                         await createNotification({
               userId: recipientAddress,
               dealId,
               type: 'MESSAGE_RECEIVED',
               title: 'New Message',
               message: `You have a new message in your deal`,
               data: { messageId: message.id },
             })

            // Send notification to recipient
            io?.to(`user:${recipientAddress}`).emit('notification', {
              type: 'NEW_MESSAGE',
              dealId,
              message: 'You have a new message',
              timestamp: new Date(),
            })
          }
        }

        console.log(`Message sent in deal ${dealId} by ${senderAddress}`)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Handle typing indicators
    socket.on('typing', (data: TypingData) => {
      try {
        const { dealId, userAddress: typingUserAddress, isTyping } = data

        // Verify user is authenticated
        if (!socket.data.isAuthenticated || socket.data.userAddress !== typingUserAddress) {
          return
        }

        // Verify user is in the deal room
        if (!socket.data.dealRooms?.has(dealId)) {
          return
        }

        // Broadcast typing status to others in the room
        socket.to(`deal:${dealId}`).emit('user-typing', {
          dealId,
          userAddress: typingUserAddress,
          isTyping,
          timestamp: new Date()
        })
      } catch (error) {
        console.error('Error handling typing:', error)
      }
    })

    // Handle deal updates
    socket.on('deal-updated', async (data: DealUpdateData) => {
      try {
        const { dealId, status, updatedBy, metadata } = data

        // Verify user is authenticated
        if (!socket.data.isAuthenticated || socket.data.userAddress !== updatedBy) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        // Broadcast deal update to all users in the deal room
        io?.to(`deal:${dealId}`).emit('deal-status-updated', {
          dealId,
          status,
          updatedBy,
          metadata,
          timestamp: new Date()
        })

        // Create notifications for participants
        const deal = await prisma.deal.findUnique({
          where: { id: dealId },
          select: {
            creatorAddress: true,
            counterpartyAddress: true,
          }
        })

        if (deal) {
          const participants = [deal.creatorAddress, deal.counterpartyAddress].filter(addr => addr !== updatedBy)
          
          for (const participantAddress of participants) {
            if (participantAddress) {
                             await createNotification({
                 userId: participantAddress,
                 dealId,
                 type: 'DEAL_ACCEPTED',
                 title: 'Deal Updated',
                 message: `Deal status changed to ${status}`,
                 data: { status, updatedBy },
               })

              // Send notification
              io?.to(`user:${participantAddress}`).emit('notification', {
                type: 'DEAL_UPDATE',
                dealId,
                message: `Deal status changed to ${status}`,
                timestamp: new Date(),
              })
            }
          }
        }

        console.log(`Deal ${dealId} updated to ${status} by ${updatedBy}`)
      } catch (error) {
        console.error('Error handling deal update:', error)
      }
    })

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      try {
        console.log(`User disconnected: ${userAddress} (${socket.id}). Reason: ${reason}`)

        // Update user offline status
        if (userAddress) {
          await setUserOnlineStatus(userAddress, false)
          
          // Broadcast user offline status
          socket.broadcast.emit('user-offline', { userAddress })
        }

        // Clean up room memberships
        if (socket.data.dealRooms) {
          for (const dealId of socket.data.dealRooms) {
            socket.to(`deal:${dealId}`).emit('user-left-deal', {
              dealId,
              userAddress,
              timestamp: new Date()
            })
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error)
      }
    })

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  console.log('Socket.IO server initialized')
  return io
}

export function getSocketServer(): SocketIOServer | null {
  return io
}

// Utility function to emit events to specific users or rooms
export function emitToUser(userAddress: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userAddress}`).emit(event, data)
  }
}

export function emitToDeal(dealId: string, event: string, data: any) {
  if (io) {
    io.to(`deal:${dealId}`).emit(event, data)
  }
}

export function emitToAll(event: string, data: any) {
  if (io) {
    io.emit(event, data)
  }
} 