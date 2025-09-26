import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket as NetSocket } from 'net'

interface SocketServer extends HTTPServer {
  io?: SocketIOServer
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

// Global socket server instance
let io: SocketIOServer | undefined

/**
 * Get or initialize Socket.IO server
 * Note: This approach works with API routes but has limitations in serverless environment
 */
export function getSocketServer(res: NextApiResponseWithSocket): SocketIOServer {
  if (!res.socket.server.io) {
    console.log('[Socket.IO] Initializing new Socket.IO server...')

    const httpServer = res.socket.server as SocketServer
    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    // Store io instance
    res.socket.server.io = io

    // Setup event listeners
    io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`)

      // Join work-task room
      socket.on('join:work-task', (workTaskId: string) => {
        socket.join(`work-task:${workTaskId}`)
        console.log(`[Socket.IO] Client ${socket.id} joined work-task room: ${workTaskId}`)

        // Get room size
        const room = io?.sockets.adapter.rooms.get(`work-task:${workTaskId}`)
        const clientCount = room ? room.size : 0

        socket.emit('joined:work-task', {
          workTaskId,
          roomId: `work-task:${workTaskId}`,
          clientCount
        })
      })

      // Leave work-task room
      socket.on('leave:work-task', (workTaskId: string) => {
        socket.leave(`work-task:${workTaskId}`)
        console.log(`[Socket.IO] Client ${socket.id} left work-task room: ${workTaskId}`)
      })

      // Join project room (for workspace-wide events)
      socket.on('join:project', (projectId: string) => {
        socket.join(`project:${projectId}`)
        console.log(`[Socket.IO] Client ${socket.id} joined project room: ${projectId}`)
      })

      // Leave project room
      socket.on('leave:project', (projectId: string) => {
        socket.leave(`project:${projectId}`)
        console.log(`[Socket.IO] Client ${socket.id} left project room: ${projectId}`)
      })

      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`)
      })
    })
  } else {
    io = res.socket.server.io
  }

  return io
}

/**
 * Emit subtask update events to all clients in work-task room
 */
export function emitSubtaskUpdate(
  io: SocketIOServer,
  workTaskId: string,
  eventType: 'created' | 'updated' | 'deleted' | 'status-changed' | 'order-updated',
  data: any
) {
  const roomId = `work-task:${workTaskId}`

  // Add metadata
  const eventData = {
    ...data,
    workTaskId,
    timestamp: new Date().toISOString()
  }

  // Emit to room
  io.to(roomId).emit(`subtask:${eventType}`, eventData)

  console.log(`[Socket.IO] Emitted subtask:${eventType} to room ${roomId}:`, {
    workTaskId,
    subtaskId: data.subtask?.id || data.subtaskId,
    eventType
  })
}

/**
 * Emit subtask comment events
 */
export function emitSubtaskCommentUpdate(
  io: SocketIOServer,
  workTaskId: string,
  subtaskId: string,
  eventType: 'created' | 'updated' | 'deleted',
  data: any
) {
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

/**
 * Emit to project room (workspace-wide)
 */
export function emitToProject(
  io: SocketIOServer,
  projectId: string,
  eventName: string,
  data: any
) {
  const roomId = `project:${projectId}`

  const eventData = {
    ...data,
    projectId,
    timestamp: new Date().toISOString()
  }

  io.to(roomId).emit(eventName, eventData)

  console.log(`[Socket.IO] Emitted ${eventName} to project room ${roomId}`)
}

export default io