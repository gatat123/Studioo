/**
 * Web Worker for Socket.io Message Processing
 * Handles heavy computational tasks off the main thread
 */

// Message processing utilities
class MessageProcessor {
  constructor() {
    this.cache = new Map();
    this.compressionEnabled = true;
  }

  /**
   * Process incoming message based on type
   */
  process(event, data) {
    switch (event) {
      case 'scene:update':
        return this.processSceneUpdate(data);

      case 'annotations:batch':
        return this.processAnnotationsBatch(data);

      case 'project:sync':
        return this.processProjectSync(data);

      case 'bulk:update':
        return this.processBulkUpdate(data);

      default:
        return data; // Pass through for unknown events
    }
  }

  /**
   * Process scene updates with diff calculation
   */
  processSceneUpdate(data) {
    const { sceneId, updates } = data;

    // Get cached scene state
    const cachedScene = this.cache.get(`scene:${sceneId}`);

    if (cachedScene) {
      // Calculate diff
      const diff = this.calculateDiff(cachedScene, updates);

      // Apply diff to cached state
      const newState = this.applyDiff(cachedScene, diff);
      this.cache.set(`scene:${sceneId}`, newState);

      return {
        ...data,
        diff,
        optimized: true
      };
    } else {
      // First time seeing this scene
      this.cache.set(`scene:${sceneId}`, updates);
      return data;
    }
  }

  /**
   * Process batch of annotations
   */
  processAnnotationsBatch(data) {
    const { imageId, annotations } = data;

    // Group annotations by type for efficient processing
    const grouped = annotations.reduce((acc, annotation) => {
      const type = annotation.type || 'default';
      if (!acc[type]) acc[type] = [];
      acc[type].push(annotation);
      return acc;
    }, {});

    // Process each group
    const processed = {};
    for (const [type, items] of Object.entries(grouped)) {
      processed[type] = this.optimizeAnnotations(items);
    }

    return {
      imageId,
      annotations: processed,
      optimized: true,
      count: annotations.length
    };
  }

  /**
   * Process project synchronization
   */
  processProjectSync(data) {
    const { projectId, state } = data;

    // Compress large state objects
    if (this.compressionEnabled && JSON.stringify(state).length > 1024) {
      const compressed = this.compress(state);
      return {
        projectId,
        state: compressed,
        compressed: true
      };
    }

    return data;
  }

  /**
   * Process bulk updates
   */
  processBulkUpdate(data) {
    const { updates } = data;

    // Sort updates by priority and timestamp
    const sorted = updates.sort((a, b) => {
      // Priority first
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then timestamp
      return a.timestamp - b.timestamp;
    });

    // Merge similar updates
    const merged = this.mergeUpdates(sorted);

    return {
      updates: merged,
      original: updates.length,
      optimized: merged.length
    };
  }

  /**
   * Calculate diff between two objects
   */
  calculateDiff(oldObj, newObj) {
    const diff = {
      added: {},
      modified: {},
      deleted: []
    };

    // Check for added and modified
    for (const key in newObj) {
      if (!(key in oldObj)) {
        diff.added[key] = newObj[key];
      } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        diff.modified[key] = newObj[key];
      }
    }

    // Check for deleted
    for (const key in oldObj) {
      if (!(key in newObj)) {
        diff.deleted.push(key);
      }
    }

    return diff;
  }

  /**
   * Apply diff to object
   */
  applyDiff(obj, diff) {
    const result = { ...obj };

    // Apply additions
    for (const key in diff.added) {
      result[key] = diff.added[key];
    }

    // Apply modifications
    for (const key in diff.modified) {
      result[key] = diff.modified[key];
    }

    // Apply deletions
    for (const key of diff.deleted) {
      delete result[key];
    }

    return result;
  }

  /**
   * Optimize annotations for rendering
   */
  optimizeAnnotations(annotations) {
    // Remove duplicate annotations
    const seen = new Set();
    const unique = annotations.filter(ann => {
      const key = `${ann.x}:${ann.y}:${ann.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by z-index or creation time
    unique.sort((a, b) => {
      if (a.zIndex !== undefined && b.zIndex !== undefined) {
        return a.zIndex - b.zIndex;
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    return unique;
  }

  /**
   * Merge similar updates
   */
  mergeUpdates(updates) {
    const merged = [];
    const mergeMap = new Map();

    for (const update of updates) {
      const key = `${update.type}:${update.targetId}`;

      if (mergeMap.has(key)) {
        // Merge with existing
        const existing = mergeMap.get(key);
        existing.data = { ...existing.data, ...update.data };
        existing.timestamp = update.timestamp; // Use latest timestamp
      } else {
        // Add new
        const copy = { ...update };
        mergeMap.set(key, copy);
        merged.push(copy);
      }
    }

    return merged;
  }

  /**
   * Simple compression (could be replaced with proper compression library)
   */
  compress(obj) {
    const json = JSON.stringify(obj);
    // In a real implementation, use a proper compression library
    // For now, just return a marker that compression would happen
    return {
      __compressed: true,
      size: json.length,
      data: json // In production, this would be compressed
    };
  }

  /**
   * Clear cache for memory management
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Initialize processor
const processor = new MessageProcessor();

// Performance monitoring
let processedCount = 0;
let totalProcessingTime = 0;

// Handle messages from main thread
self.onmessage = function(event) {
  const { type, event: messageEvent, data, id } = event.data;

  try {
    switch (type) {
      case 'process':
        const startTime = performance.now();
        const processed = processor.process(messageEvent, data);
        const processingTime = performance.now() - startTime;

        // Update metrics
        processedCount++;
        totalProcessingTime += processingTime;

        // Send processed message back
        self.postMessage({
          type: 'processed',
          data: {
            event: messageEvent,
            data: processed,
            metrics: {
              processingTime,
              processed: processedCount,
              avgTime: totalProcessingTime / processedCount
            }
          },
          id
        });
        break;

      case 'clear-cache':
        processor.clearCache();
        self.postMessage({
          type: 'cache-cleared',
          data: { cleared: true }
        });
        break;

      case 'get-stats':
        self.postMessage({
          type: 'stats',
          data: {
            cache: processor.getCacheStats(),
            processing: {
              count: processedCount,
              totalTime: totalProcessingTime,
              avgTime: processedCount > 0 ? totalProcessingTime / processedCount : 0
            }
          }
        });
        break;

      case 'config':
        // Update configuration
        if (data.compressionEnabled !== undefined) {
          processor.compressionEnabled = data.compressionEnabled;
        }
        self.postMessage({
          type: 'config-updated',
          data: { success: true }
        });
        break;

      default:
        self.postMessage({
          type: 'error',
          data: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: {
        message: error.message,
        stack: error.stack,
        originalEvent: messageEvent
      }
    });
  }
};

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  // Clear old cache entries
  if (processor.cache.size > 100) {
    const stats = processor.getCacheStats();
    const toRemove = stats.keys.slice(0, 50); // Remove oldest 50

    toRemove.forEach(key => {
      processor.cache.delete(key);
    });

    self.postMessage({
      type: 'cache-cleanup',
      data: {
        removed: toRemove.length,
        remaining: processor.cache.size
      }
    });
  }
}, 30000); // Every 30 seconds

// Log initialization
self.postMessage({
  type: 'initialized',
  data: {
    version: '1.0.0',
    features: ['processing', 'caching', 'compression', 'merging']
  }
});