const { createServer } = require('http')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()
const PORT = process.env.SOCKET_PORT || 3001

// Create HTTP server
const httpServer = createServer()

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling']
})

// Middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication error'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    socket.userId = decoded.userId
    next()
  } catch (error) {
    next(new Error('Authentication error'))
  }
})

// Connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}, userId: ${socket.userId}`)

  // Join work-task room
  socket.on('join:work-task', async (workTaskId) => {
    try {
      // Verify user has access to the work task
      const workTask = await prisma.workTask.findFirst({
        where: {
          id: workTaskId,
          OR: [
            { createdById: socket.userId },
            {
              participants: {
                some: {
                  userId: socket.userId
                }
              }
            }
          ]
        }
      })

      if (!workTask) {
        socket.emit('error', { message: 'Access denied to work task' })
        return
      }

      socket.join(`work-task:${workTaskId}`)
      console.log(`[Socket.IO] User ${socket.userId} joined work-task:${workTaskId}`)

      // Get room size
      const room = io.sockets.adapter.rooms.get(`work-task:${workTaskId}`)
      const clientCount = room ? room.size : 0

      socket.emit('joined:work-task', {
        workTaskId,
        roomId: `work-task:${workTaskId}`,
        clientCount
      })
    } catch (error) {
      console.error(`[Socket.IO] Error joining work-task room:`, error)
      socket.emit('error', { message: 'Failed to join work task room' })
    }
  })

  // Leave work-task room
  socket.on('leave:work-task', (workTaskId) => {
    socket.leave(`work-task:${workTaskId}`)
    console.log(`[Socket.IO] User ${socket.userId} left work-task:${workTaskId}`)
  })

  // Join project room (for workspace-wide events)
  socket.on('join:project', async (projectId) => {
    try {
      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { creator_id: socket.userId },
            {
              project_participants: {
                some: {
                  user_id: socket.userId
                }
              }
            }
          ]
        }
      })

      if (!project) {
        socket.emit('error', { message: 'Access denied to project' })
        return
      }

      socket.join(`project:${projectId}`)
      console.log(`[Socket.IO] User ${socket.userId} joined project:${projectId}`)

      socket.emit('joined:project', {
        projectId,
        roomId: `project:${projectId}`
      })
    } catch (error) {
      console.error(`[Socket.IO] Error joining project room:`, error)
      socket.emit('error', { message: 'Failed to join project room' })
    }
  })

  // Leave project room
  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`)
    console.log(`[Socket.IO] User ${socket.userId} left project:${projectId}`)
  })

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}, userId: ${socket.userId}`)
  })
})

// Helper functions to emit events (called from API routes via HTTP)
async function emitSubtaskUpdate(workTaskId, eventType, data) {
  const roomId = `work-task:${workTaskId}`

  const eventData = {
    ...data,
    workTaskId,
    timestamp: new Date().toISOString()
  }

  io.to(roomId).emit(`subtask:${eventType}`, eventData)

  console.log(`[Socket.IO] Emitted subtask:${eventType} to room ${roomId}:`, {
    workTaskId,
    subtaskId: data.subtask?.id || data.subtaskId,
    eventType
  })
}

async function emitSubtaskCommentUpdate(workTaskId, subtaskId, eventType, data) {
  const roomId = `work-task:${workTaskId}`

  const eventData = {
    ...data,
    subtaskId,
    workTaskId,
    timestamp: new Date().toISOString()
  }

  io.to(roomId).emit(`subtask-comment:${eventType}`, eventData)

  console.log(`[Socket.IO] Emitted subtask-comment:${eventType} to room ${roomId}`)
}

// HTTP endpoint for internal API calls to emit events
httpServer.on('request', async (req, res) => {
  // Handle internal API calls to emit events
  if (req.method === 'POST' && req.url === '/emit') {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        const { type, workTaskId, subtaskId, eventType, payload } = data

        // Verify internal API key
        const apiKey = req.headers['x-api-key']
        if (apiKey !== process.env.INTERNAL_API_KEY) {
          res.writeHead(401)
          res.end('Unauthorized')
          return
        }

        if (type === 'subtask') {
          await emitSubtaskUpdate(workTaskId, eventType, payload)
        } else if (type === 'subtask-comment') {
          await emitSubtaskCommentUpdate(workTaskId, subtaskId, eventType, payload)
        }

        res.writeHead(200)
        res.end('OK')
      } catch (error) {
        console.error('[Socket.IO Server] Error handling emit request:', error)
        res.writeHead(500)
        res.end('Internal Server Error')
      }
    })
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Socket.IO] SIGTERM signal received: closing HTTP server')
  httpServer.close(() => {
    console.log('[Socket.IO] HTTP server closed')
    prisma.$disconnect()
    process.exit(0)
  })
})

module.exports = { io, emitSubtaskUpdate, emitSubtaskCommentUpdate }