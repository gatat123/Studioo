/**
 * Message Queue System for Real-time Collaboration
 * Implements priority-based message processing with batching
 */

export enum MessagePriority {
  CRITICAL = 0, // Immediate execution (auth, errors)
  HIGH = 1,     // User interactions (clicks, selections)
  NORMAL = 2,   // Regular updates (presence, status)
  LOW = 3       // Background tasks (analytics, logs)
}

export interface QueuedMessage {
  id: string;
  priority: MessagePriority;
  event: string;
  data: unknown;
  timestamp: number;
  retries?: number;
  maxRetries?: number;
}

interface BatchConfig {
  maxBatchSize: number;
  batchInterval: number; // milliseconds
  priorityThresholds: Record<MessagePriority, number>;
}

export class MessageQueue {
  private queues: Map<MessagePriority, QueuedMessage[]> = new Map();
  private processing = false;
  private batchTimer: NodeJS.Timeout | null = null;
  private messageCounter = 0;
  private config: BatchConfig;
  private processCallback: ((messages: QueuedMessage[]) => Promise<void>) | null = null;
  private metrics = {
    processed: 0,
    dropped: 0,
    batches: 0,
    avgBatchSize: 0
  };

  constructor(config?: Partial<BatchConfig>) {
    this.config = {
      maxBatchSize: 50,
      batchInterval: 16, // ~60fps
      priorityThresholds: {
        [MessagePriority.CRITICAL]: 1,    // Process immediately
        [MessagePriority.HIGH]: 5,         // Process within 5 messages
        [MessagePriority.NORMAL]: 20,      // Process within 20 messages
        [MessagePriority.LOW]: 50          // Process in full batches
      },
      ...config
    };

    // Initialize priority queues
    for (const priority of Object.values(MessagePriority)) {
      if (typeof priority === 'number') {
        this.queues.set(priority, []);
      }
    }
  }

  /**
   * Add a message to the queue
   */
  enqueue(
    event: string,
    data: unknown,
    priority: MessagePriority = MessagePriority.NORMAL
  ): string {
    const message: QueuedMessage = {
      id: `msg_${++this.messageCounter}_${Date.now()}`,
      priority,
      event,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };

    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(message);

      // Critical messages trigger immediate processing
      if (priority === MessagePriority.CRITICAL) {
        this.processBatch();
      } else {
        this.scheduleBatch();
      }
    }

    return message.id;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.config.batchInterval);
  }

  /**
   * Process a batch of messages
   */
  private async processBatch() {
    if (this.processing || !this.processCallback) return;

    this.processing = true;
    const batch: QueuedMessage[] = [];
    let remainingCapacity = this.config.maxBatchSize;

    // Process by priority
    for (const priority of [
      MessagePriority.CRITICAL,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ]) {
      const queue = this.queues.get(priority);
      if (!queue || queue.length === 0) continue;

      const threshold = this.config.priorityThresholds[priority];
      const takeCount = Math.min(threshold, remainingCapacity, queue.length);

      if (takeCount > 0) {
        batch.push(...queue.splice(0, takeCount));
        remainingCapacity -= takeCount;
      }

      if (remainingCapacity <= 0) break;
    }

    if (batch.length > 0) {
      try {
        await this.processCallback(batch);
        this.updateMetrics(batch.length);
      } catch {
        
        this.handleFailedMessages(batch);
      }
    }

    this.processing = false;

    // Schedule next batch if queues aren't empty
    if (this.hasMessages()) {
      this.scheduleBatch();
    }
  }

  /**
   * Handle failed messages with retry logic
   */
  private handleFailedMessages(messages: QueuedMessage[]) {
    for (const message of messages) {
      if (message.retries! < message.maxRetries!) {
        message.retries!++;
        // Re-queue with lower priority
        const newPriority = Math.min(
          message.priority + 1,
          MessagePriority.LOW
        ) as MessagePriority;

        const queue = this.queues.get(newPriority);
        if (queue) {
          queue.push(message);
        }
      } else {
        this.metrics.dropped++;
        
      }
    }
  }

  /**
   * Set the callback for processing messages
   */
  onProcess(callback: (messages: QueuedMessage[]) => Promise<void>) {
    this.processCallback = callback;
  }

  /**
   * Check if there are messages in any queue
   */
  private hasMessages(): boolean {
    for (const queue of this.queues.values()) {
      if (queue.length > 0) return true;
    }
    return false;
  }

  /**
   * Update metrics
   */
  private updateMetrics(batchSize: number) {
    this.metrics.processed += batchSize;
    this.metrics.batches++;
    this.metrics.avgBatchSize =
      (this.metrics.avgBatchSize * (this.metrics.batches - 1) + batchSize) /
      this.metrics.batches;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear all queues
   */
  clear() {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Get queue sizes by priority
   */
  getQueueSizes(): Record<MessagePriority, number> {
    const sizes: Partial<Record<MessagePriority, number>> = {};
    for (const [priority, queue] of this.queues.entries()) {
      sizes[priority] = queue.length;
    }
    return sizes as Record<MessagePriority, number>;
  }

  /**
   * Flush all messages immediately
   */
  async flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    while (this.hasMessages()) {
      await this.processBatch();
    }
  }
}

// Singleton instance
export const messageQueue = new MessageQueue();