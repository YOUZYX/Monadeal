const { Server } = require('socket.io')

// Global socket server instance
let io = null

function initializeSocketServer(httpServer) {
  if (io) {
    return io
  }

  io = new Server(httpServer, {
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

  console.log('Socket.IO server initialized successfully')
  return io
}

function getSocketServer() {
  return io
}

module.exports = {
  initializeSocketServer,
  getSocketServer
} 