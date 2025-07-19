const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true)
      
      // Handle the request with Next.js
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // Initialize Socket.IO only on server start
  let socketInitialized = false
  
  const initializeSocket = async () => {
    if (!socketInitialized) {
      try {
        // Use the JavaScript version for compatibility
        const { initializeSocketServer } = require('./src/lib/socket-server.js')
        const io = initializeSocketServer(httpServer)
        
        console.log('✅ Socket.IO server initialized')
        socketInitialized = true
        
        // Log active connections periodically
        setInterval(() => {
          const connectedSockets = io.sockets.sockets.size
          if (connectedSockets > 0) {
            console.log(`📡 Active Socket.IO connections: ${connectedSockets}`)
          }
        }, 30000) // Every 30 seconds
        
      } catch (error) {
        console.error('❌ Failed to initialize Socket.IO:', error)
      }
    }
  }

  // Start the server
  httpServer
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`🚀 Monadeal server ready on http://${hostname}:${port}`)
      console.log(`📊 Environment: ${dev ? 'development' : 'production'}`)
      
      // Initialize Socket.IO after server starts
      initializeSocket()
    })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    httpServer.close(() => {
      console.log('Process terminated')
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully')
    httpServer.close(() => {
      console.log('Process terminated')
    })
  })
}) 