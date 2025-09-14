/**
 * Optimized Socket.io Wrapper with Throttling and Debouncing
 * Provides performance optimizations for real-time collaboration
 */

import { Socket } from 'socket.io-client';
import { socketClient } from '../socket/client';
import { MessageQueue, MessagePriority, QueuedMessage } from './message-queue';

// Throttle and debounce utilities
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

interface OptimizationConfig {
  cursorThrottle: number;      // ms
  typingDebounce: number;      // ms
  presenceInterval: number;    // ms
  batchInterval: number;       // ms
  maxBatchSize: number;
  enableWebWorker: boolean;
  enableCompression: boolean;
}

export class OptimizedSocket {
  private socket: Socket | null = null;
  private messageQueue: MessageQueue;
  private config: OptimizationConfig;
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private presenceTimer: NodeJS.Timeout | null = null;
  private lastCursorPosition: { x: number; y: number } | null = null;
  private worker: Worker | null = null;
  private pendingAcks: Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = new Map();

  // Throttled/Debounced methods
  private throttledCursorMove: (...args: unknown[]) => void;
  private debouncedTyping: (...args: unknown[]) => void;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      cursorThrottle: 50,      // 20 FPS for cursor movement
      typingDebounce: 300,     // 300ms debounce for typing
      presenceInterval: 5000,  // 5s presence updates
      batchInterval: 16,       // ~60 FPS batching
      maxBatchSize: 50,
      enableWebWorker: true,
      enableCompression: true,
      ...config
    };

    this.messageQueue = new MessageQueue({
      batchInterval: this.config.batchInterval,
      maxBatchSize: this.config.maxBatchSize
    });

    // Setup message processing
    this.messageQueue.onProcess(this.processBatch.bind(this));

    // Initialize throttled/debounced methods
    this.throttledCursorMove = throttle(this.sendCursorUpdate.bind(this), this.config.cursorThrottle);
    this.debouncedTyping = debounce(this.sendTypingUpdate.bind(this), this.config.typingDebounce);

    // Initialize Web Worker if enabled
    if (this.config.enableWebWorker && typeof Worker !== 'undefined') {
      this.initializeWorker();
    }
  }

  /**
   * Initialize Web Worker for heavy processing
   */
  private initializeWorker() {
    try {
      this.worker = new Worker('/workers/socket-worker.js');

      this.worker.onmessage = (event) => {
        const { type, data } = event.data;

        switch (type) {
          case 'processed':
            this.handleProcessedMessage(data);
            break;
          case 'error':
            console.error('Worker error:', data);
            break;
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.worker = null; // Fallback to main thread
      };
    } catch (error) {
      console.warn('Web Worker initialization failed:', error);
      this.config.enableWebWorker = false;
    }
  }

  /**
   * Connect to Socket.io server
   */
  connect(): void {
    this.socket = socketClient.connect();
    this.setupOptimizedListeners();
    this.startPresenceUpdates();
  }

  /**
   * Setup optimized event listeners
   */
  private setupOptimizedListeners() {
    if (!this.socket) return;

    // Intercept incoming messages for optimization
    const originalOn = this.socket.on.bind(this.socket);

    this.socket.on = (event: string, handler: (...args: unknown[]) => void) => {
      // Store handlers for batch processing
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());

        // Setup actual listener once
        originalOn(event, (data: unknown) => {
          this.handleIncomingMessage(event, data);
        });
      }

      this.eventHandlers.get(event)!.add(handler);
      return this.socket!;
    };
  }

  /**
   * Handle incoming messages with optional worker processing
   */
  private handleIncomingMessage(event: string, data: unknown) {
    // Heavy processing goes to worker
    if (this.worker && this.shouldUseWorker(event)) {
      this.worker.postMessage({
        type: 'process',
        event,
        data
      });
    } else {
      this.handleProcessedMessage({ event, data });
    }
  }

  /**
   * Determine if message should be processed in worker
   */
  private shouldUseWorker(event: string): boolean {
    const heavyEvents = [
      'scene:update',
      'annotations:batch',
      'project:sync',
      'bulk:update'
    ];

    return heavyEvents.includes(event);
  }

  /**
   * Handle processed messages from worker or main thread
   */
  private handleProcessedMessage(message: { event: string; data: unknown }) {
    const handlers = this.eventHandlers.get(message.event);
    if (handlers) {
      // Use requestAnimationFrame for UI updates
      requestAnimationFrame(() => {
        handlers.forEach(handler => handler(message.data));
      });
    }
  }

  /**
   * Process batch of outgoing messages
   */
  private async processBatch(messages: QueuedMessage[]): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    // Group messages by event type for efficient emission
    const grouped = messages.reduce((acc, msg) => {
      if (!acc[msg.event]) acc[msg.event] = [];
      acc[msg.event].push(msg.data);
      return acc;
    }, {} as Record<string, unknown[]>);

    // Emit batched messages
    for (const [event, dataArray] of Object.entries(grouped)) {
      if (dataArray.length === 1) {
        // Single message, emit directly
        this.socket.emit(event, dataArray[0]);
      } else {
        // Multiple messages, emit as batch
        this.socket.emit(`${event}:batch`, dataArray);
      }
    }
  }

  /**
   * Start periodic presence updates
   */
  private startPresenceUpdates() {
    this.presenceTimer = setInterval(() => {
      this.emit('presence:ping', {
        timestamp: Date.now(),
        cursor: this.lastCursorPosition
      }, MessagePriority.LOW);
    }, this.config.presenceInterval);
  }

  /**
   * Emit event with priority
   */
  emit(event: string, data: unknown, priority: MessagePriority = MessagePriority.NORMAL): string {
    return this.messageQueue.enqueue(event, data, priority);
  }

  /**
   * Emit with acknowledgment
   */
  emitWithAck(event: string, data: unknown, priority: MessagePriority = MessagePriority.NORMAL): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const messageData = typeof data === 'object' && data !== null
        ? { ...data, __ackId: Date.now() }
        : { data, __ackId: Date.now() };
      const messageId = this.emit(event, messageData, priority);
      this.pendingAcks.set(messageId, { resolve, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingAcks.has(messageId)) {
          this.pendingAcks.delete(messageId);
          reject(new Error('Acknowledgment timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Cursor movement with throttling
   */
  moveCursor(projectId: string, x: number, y: number) {
    this.lastCursorPosition = { x, y };
    this.throttledCursorMove(projectId, x, y);
  }

  private sendCursorUpdate(projectId: string, x: number, y: number) {
    this.emit('cursor:move', { projectId, x, y }, MessagePriority.HIGH);
  }

  /**
   * Typing indicator with debouncing
   */
  setTyping(projectId: string, location: string, isTyping: boolean) {
    this.debouncedTyping(projectId, location, isTyping);
  }

  private sendTypingUpdate(projectId: string, location: string, isTyping: boolean) {
    const event = isTyping ? 'typing:start' : 'typing:stop';
    this.emit(event, { projectId, location }, MessagePriority.NORMAL);
  }

  /**
   * Join project room with optimizations
   */
  joinProject(projectId: string) {
    this.emit('join_project', { projectId }, MessagePriority.HIGH);
  }

  /**
   * Leave project room
   */
  leaveProject(projectId: string) {
    this.emit('leave_room', { roomId: `project:${projectId}` }, MessagePriority.HIGH);
  }

  /**
   * Batch comment updates
   */
  batchComments(projectId: string, comments: unknown[]) {
    this.emit('comments:batch', { projectId, comments }, MessagePriority.NORMAL);
  }

  /**
   * Batch annotation updates
   */
  batchAnnotations(imageId: string, annotations: unknown[]) {
    this.emit('annotations:batch', { imageId, annotations }, MessagePriority.NORMAL);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      queue: this.messageQueue.getMetrics(),
      queueSizes: this.messageQueue.getQueueSizes(),
      connected: this.socket?.connected || false,
      pendingAcks: this.pendingAcks.size
    };
  }

  /**
   * Flush all pending messages
   */
  async flush() {
    await this.messageQueue.flush();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.messageQueue.clear();
    this.eventHandlers.clear();
    this.pendingAcks.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get underlying socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const optimizedSocket = new OptimizedSocket();

// Export convenience methods
export const connectOptimized = () => optimizedSocket.connect();
export const disconnectOptimized = () => optimizedSocket.disconnect();
export const getOptimizedSocket = () => optimizedSocket.getSocket();