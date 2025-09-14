/**
 * Realtime Performance Test Suite
 * Tests message queue processing, socket optimization, and collaboration performance
 */

import { MessageQueue, MessagePriority } from '@/lib/realtime/message-queue'
import { OptimizedSocketManager } from '@/lib/realtime/optimized-socket'
import { io, Socket } from 'socket.io-client'

// Define QueuedMessage interface
interface QueuedMessage {
  id: string
  event: string
  data: unknown
  priority: MessagePriority
  timestamp: number
}

// Mock socket.io-client
jest.mock('socket.io-client')

describe('Message Queue Performance', () => {
  let messageQueue: MessageQueue
  let processCallback: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    processCallback = jest.fn().mockResolvedValue(undefined)
    messageQueue = new MessageQueue({
      maxBatchSize: 10,
      batchInterval: 16
    })
    messageQueue.setProcessor(processCallback)
  })

  afterEach(() => {
    messageQueue.destroy()
    jest.useRealTimers()
  })

  describe('Message Enqueueing', () => {
    it('should enqueue messages with correct priority', () => {
      const id1 = messageQueue.enqueue('test1', { data: 1 }, MessagePriority.HIGH)
      const id2 = messageQueue.enqueue('test2', { data: 2 }, MessagePriority.LOW)
      const id3 = messageQueue.enqueue('test3', { data: 3 }, MessagePriority.NORMAL)

      expect(id1).toMatch(/^msg_\d+_\d+$/)
      expect(id2).toMatch(/^msg_\d+_\d+$/)
      expect(id3).toMatch(/^msg_\d+_\d+$/)
    })

    it('should process CRITICAL messages immediately', () => {
      messageQueue.enqueue('critical', { urgent: true }, MessagePriority.CRITICAL)

      expect(processCallback).toHaveBeenCalledTimes(1)
      const messages = processCallback.mock.calls[0][0]
      expect(messages).toHaveLength(1)
      expect(messages[0].event).toBe('critical')
    })

    it('should batch non-critical messages', () => {
      messageQueue.enqueue('normal1', { data: 1 }, MessagePriority.NORMAL)
      messageQueue.enqueue('normal2', { data: 2 }, MessagePriority.NORMAL)
      messageQueue.enqueue('normal3', { data: 3 }, MessagePriority.NORMAL)

      expect(processCallback).not.toHaveBeenCalled()

      jest.advanceTimersByTime(16)

      expect(processCallback).toHaveBeenCalledTimes(1)
      const messages = processCallback.mock.calls[0][0]
      expect(messages).toHaveLength(3)
    })

    it('should respect priority order in batches', () => {
      messageQueue.enqueue('low', { data: 'low' }, MessagePriority.LOW)
      messageQueue.enqueue('high', { data: 'high' }, MessagePriority.HIGH)
      messageQueue.enqueue('normal', { data: 'normal' }, MessagePriority.NORMAL)

      jest.advanceTimersByTime(16)

      const messages = processCallback.mock.calls[0][0]
      expect(messages[0].priority).toBe(MessagePriority.HIGH)
      expect(messages[1].priority).toBe(MessagePriority.NORMAL)
      expect(messages[2].priority).toBe(MessagePriority.LOW)
    })
  })

  describe('Batch Processing', () => {
    it('should respect maxBatchSize limit', () => {
      // Enqueue more messages than batch size
      for (let i = 0; i < 15; i++) {
        messageQueue.enqueue(`msg${i}`, { index: i }, MessagePriority.NORMAL)
      }

      jest.advanceTimersByTime(16)

      expect(processCallback).toHaveBeenCalledTimes(1)
      const firstBatch = processCallback.mock.calls[0][0]
      expect(firstBatch).toHaveLength(10) // maxBatchSize

      jest.advanceTimersByTime(16)

      expect(processCallback).toHaveBeenCalledTimes(2)
      const secondBatch = processCallback.mock.calls[1][0]
      expect(secondBatch).toHaveLength(5) // remaining messages
    })

    it('should handle mixed priority batches correctly', () => {
      // Add messages with different priorities
      for (let i = 0; i < 3; i++) {
        messageQueue.enqueue(`high${i}`, { i }, MessagePriority.HIGH)
      }
      for (let i = 0; i < 5; i++) {
        messageQueue.enqueue(`normal${i}`, { i }, MessagePriority.NORMAL)
      }
      for (let i = 0; i < 7; i++) {
        messageQueue.enqueue(`low${i}`, { i }, MessagePriority.LOW)
      }

      jest.advanceTimersByTime(16)

      const batch = processCallback.mock.calls[0][0]
      expect(batch).toHaveLength(10)

      // Check priority order
      const priorities = batch.map((m: QueuedMessage) => m.priority)
      expect(priorities.slice(0, 3)).toEqual([
        MessagePriority.HIGH,
        MessagePriority.HIGH,
        MessagePriority.HIGH
      ])
    })

    it('should handle processor errors gracefully', async () => {
      processCallback.mockRejectedValueOnce(new Error('Process failed'))

      messageQueue.enqueue('test', { data: 1 })
      jest.advanceTimersByTime(16)

      await Promise.resolve() // Let promises settle

      expect(processCallback).toHaveBeenCalled()
      // Queue should continue functioning after error

      processCallback.mockResolvedValue(undefined)
      messageQueue.enqueue('test2', { data: 2 })
      jest.advanceTimersByTime(16)

      expect(processCallback).toHaveBeenCalledTimes(2)
    })
  })

  describe('Queue Metrics', () => {
    it('should track processing metrics', () => {
      for (let i = 0; i < 25; i++) {
        messageQueue.enqueue(`msg${i}`, { i })
      }

      jest.advanceTimersByTime(16)
      jest.advanceTimersByTime(16)
      jest.advanceTimersByTime(16)

      const metrics = messageQueue.getMetrics()
      expect(metrics.processed).toBe(25)
      expect(metrics.batches).toBe(3)
      expect(metrics.avgBatchSize).toBeCloseTo(8.33, 1)
      expect(metrics.dropped).toBe(0)
    })

    it('should track dropped messages when queue is full', () => {
      // Override max queue size for testing
      const smallQueue = new MessageQueue({
        maxBatchSize: 5,
        batchInterval: 100,
        maxQueueSize: 10
      })
      smallQueue.setProcessor(processCallback)

      // Fill queue beyond capacity
      for (let i = 0; i < 15; i++) {
        smallQueue.enqueue(`msg${i}`, { i }, MessagePriority.LOW)
      }

      const metrics = smallQueue.getMetrics()
      expect(metrics.dropped).toBeGreaterThan(0)

      smallQueue.destroy()
    })
  })

  describe('Queue Management', () => {
    it('should clear queues correctly', () => {
      for (let i = 0; i < 10; i++) {
        messageQueue.enqueue(`msg${i}`, { i })
      }

      messageQueue.clear()
      jest.advanceTimersByTime(16)

      expect(processCallback).not.toHaveBeenCalled()
    })

    it('should pause and resume processing', () => {
      messageQueue.pause()

      for (let i = 0; i < 5; i++) {
        messageQueue.enqueue(`msg${i}`, { i })
      }

      jest.advanceTimersByTime(16)
      expect(processCallback).not.toHaveBeenCalled()

      messageQueue.resume()
      jest.advanceTimersByTime(16)
      expect(processCallback).toHaveBeenCalled()
    })

    it('should handle destroy correctly', () => {
      for (let i = 0; i < 5; i++) {
        messageQueue.enqueue(`msg${i}`, { i })
      }

      messageQueue.destroy()
      jest.advanceTimersByTime(16)

      expect(processCallback).not.toHaveBeenCalled()
    })
  })

  describe('Performance Under Load', () => {
    it('should handle high message volume efficiently', () => {

      // Simulate high message load
      for (let i = 0; i < 1000; i++) {
        messageQueue.enqueue(`msg${i}`, {
          index: i,
          timestamp: Date.now(),
          data: Array(100).fill(i) // Some payload
        })
      }

      // Process all messages
      while (processCallback.mock.calls.length < 100) {
        jest.advanceTimersByTime(16)
      }

      const totalMessages = processCallback.mock.calls.reduce(
        (sum, call) => sum + call[0].length,
        0
      )

      expect(totalMessages).toBe(1000)

      // Check that batching is working efficiently
      const avgBatchSize = totalMessages / processCallback.mock.calls.length
      expect(avgBatchSize).toBeCloseTo(10, 1) // Should be close to maxBatchSize
    })

    it('should prioritize critical messages under load', () => {
      // Add many low priority messages
      for (let i = 0; i < 100; i++) {
        messageQueue.enqueue(`low${i}`, { i }, MessagePriority.LOW)
      }

      // Add critical message
      messageQueue.enqueue('critical', { urgent: true }, MessagePriority.CRITICAL)

      // Critical should be processed immediately
      expect(processCallback).toHaveBeenCalled()
      const firstBatch = processCallback.mock.calls[0][0]
      expect(firstBatch.some((m: QueuedMessage) => m.event === 'critical')).toBe(true)
    })

    it('should maintain performance with mixed priorities', () => {
      const priorities = [
        MessagePriority.CRITICAL,
        MessagePriority.HIGH,
        MessagePriority.NORMAL,
        MessagePriority.LOW
      ]

      // Add 250 messages of each priority (1000 total)
      for (const p of priorities) {
        for (let i = 0; i < 250; i++) {
          if (p !== MessagePriority.CRITICAL) {
            messageQueue.enqueue(`msg_${p}_${i}`, { i }, p)
          }
        }
      }

      // Add critical messages separately to avoid immediate processing
      for (let i = 0; i < 250; i++) {
        messageQueue.enqueue(`critical_${i}`, { i }, MessagePriority.CRITICAL)
      }

      // Process all messages
      while (processCallback.mock.calls.length < 100) {
        jest.advanceTimersByTime(16)
      }

      const allMessages = processCallback.mock.calls.flatMap(call => call[0])

      // Verify all critical messages were processed
      const criticalMessages = allMessages.filter(
        (m: QueuedMessage) => m.priority === MessagePriority.CRITICAL
      )
      expect(criticalMessages.length).toBe(250)
    })
  })

  describe('Memory Management', () => {
    it('should not leak memory with continuous message flow', () => {
      const iterations = 100
      const messagesPerIteration = 50

      for (let i = 0; i < iterations; i++) {
        // Add messages
        for (let j = 0; j < messagesPerIteration; j++) {
          messageQueue.enqueue(`msg_${i}_${j}`, { i, j })
        }

        // Process them
        jest.advanceTimersByTime(16)
      }

      const metrics = messageQueue.getMetrics()
      expect(metrics.processed).toBe(iterations * messagesPerIteration)

      // Queue should be empty after processing
      messageQueue.clear()
      jest.advanceTimersByTime(16)
      expect(processCallback.mock.calls[processCallback.mock.calls.length - 1]).toBeUndefined()
    })
  })
})

describe('Optimized Socket Manager', () => {
  let socketManager: OptimizedSocketManager
  let mockSocket: jest.Mocked<Socket>

  beforeEach(() => {
    jest.useFakeTimers()

    // Create mock socket
    mockSocket = {
      connected: false,
      id: 'test-socket-id',
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      io: {
        opts: {}
      }
    } as unknown as jest.Mocked<Socket>

    // Mock io function
    ;(io as jest.Mock).mockReturnValue(mockSocket)

    socketManager = new OptimizedSocketManager('http://localhost:3001', {
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    })
  })

  afterEach(() => {
    socketManager.destroy()
    jest.useRealTimers()
  })

  describe('Connection Management', () => {
    it('should establish connection correctly', () => {
      socketManager.connect()

      expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.objectContaining({
        transports: ['websocket'],
        reconnection: true
      }))
    })

    it('should handle connection events', () => {
      const onConnect = jest.fn()
      const onDisconnect = jest.fn()

      socketManager.on('connect', onConnect)
      socketManager.on('disconnect', onDisconnect)

      socketManager.connect()

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      connectHandler?.()

      expect(onConnect).toHaveBeenCalled()

      // Simulate disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1]
      disconnectHandler?.()

      expect(onDisconnect).toHaveBeenCalled()
    })

    it('should handle reconnection attempts', () => {
      socketManager.connect()

      // Simulate connection failure
      mockSocket.connected = false
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1]
      errorHandler?.(new Error('Connection failed'))

      // Should attempt reconnection
      jest.advanceTimersByTime(1000)

      expect(mockSocket.connect).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    it('should emit messages through queue', () => {
      socketManager.connect()
      mockSocket.connected = true

      socketManager.emit('test-event', { data: 'test' })

      // Should be queued
      jest.advanceTimersByTime(16)

      // Message should be emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should handle high-priority messages', () => {
      socketManager.connect()
      mockSocket.connected = true

      socketManager.emitPriority('urgent-event', { urgent: true }, MessagePriority.CRITICAL)

      // Critical messages should be sent immediately
      expect(mockSocket.emit).toHaveBeenCalledWith('urgent-event', { urgent: true })
    })

    it('should buffer messages when disconnected', () => {
      socketManager.connect()
      mockSocket.connected = false

      socketManager.emit('test-event', { data: 'test' })

      jest.advanceTimersByTime(16)

      // Should not emit when disconnected
      expect(mockSocket.emit).not.toHaveBeenCalled()

      // Reconnect
      mockSocket.connected = true
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      connectHandler?.()

      jest.advanceTimersByTime(16)

      // Should emit buffered messages
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })
  })

  describe('Performance Monitoring', () => {
    it('should track connection metrics', () => {
      socketManager.connect()
      mockSocket.connected = true

      // Simulate some activity
      for (let i = 0; i < 10; i++) {
        socketManager.emit(`event${i}`, { i })
      }

      jest.advanceTimersByTime(16)

      const metrics = socketManager.getMetrics()
      expect(metrics.messagesSent).toBeGreaterThan(0)
      expect(metrics.messagesReceived).toBe(0)
      expect(metrics.connectionTime).toBeDefined()
    })

    it('should track latency', () => {
      socketManager.connect()
      mockSocket.connected = true

      // Simulate latency measurement
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')?.[1]

      // Trigger ping
      jest.advanceTimersByTime(5000) // Default ping interval

      // Simulate pong response
      pongHandler?.()

      const metrics = socketManager.getMetrics()
      expect(metrics.latency).toBeDefined()
      expect(metrics.latency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle socket errors gracefully', () => {
      const onError = jest.fn()
      socketManager.on('error', onError)

      socketManager.connect()

      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')?.[1]
      errorHandler?.(new Error('Socket error'))

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should implement exponential backoff for reconnection', () => {
      socketManager.connect()
      mockSocket.connected = false

      // First failure
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1]
      errorHandler?.(new Error('Connection failed'))

      jest.advanceTimersByTime(1000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)

      // Second failure - should wait longer
      errorHandler?.(new Error('Connection failed'))

      jest.advanceTimersByTime(1500)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(500)
      expect(mockSocket.connect).toHaveBeenCalledTimes(2)
    })
  })

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      socketManager.connect()

      socketManager.destroy()

      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockSocket.off).toHaveBeenCalled()
    })

    it('should clear message queue on destroy', () => {
      socketManager.connect()

      // Add some messages
      for (let i = 0; i < 10; i++) {
        socketManager.emit(`event${i}`, { i })
      }

      socketManager.destroy()
      jest.advanceTimersByTime(16)

      // Messages should not be sent after destroy
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })
})