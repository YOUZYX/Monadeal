import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'

let io: SocketIOServer | null = null

export async function GET(request: NextRequest) {
  if (!io) {
    console.log('Initializing Socket.IO...')
    
    // Create a minimal HTTP server for Socket.IO
    const httpServer = createServer()
    
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

    // Basic connection handler
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`)
      })

      // Basic room management
      socket.on('join-room', (roomId) => {
        socket.join(roomId)
        console.log(`Socket ${socket.id} joined room: ${roomId}`)
      })

      socket.on('leave-room', (roomId) => {
        socket.leave(roomId)
        console.log(`Socket ${socket.id} left room: ${roomId}`)
      })
    })

    // Start the HTTP server on a different port for Socket.IO
    const socketPort = 3001
    httpServer.listen(socketPort, () => {
      console.log(`✅ Socket.IO server running on port ${socketPort}`)
    })
  }

  return new Response(JSON.stringify({ status: 'Socket.IO server running' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
} 