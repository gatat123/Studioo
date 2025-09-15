/**
 * Optimized Socket Hook for React Components
 * Provides easy integration with performance optimizations
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { OptimizedSocket, optimizedSocket } from '@/lib/realtime/optimized-socket';
import { MessagePriority } from '@/lib/realtime/message-queue';

export interface UseOptimizedSocketOptions {
  autoConnect?: boolean;
  projectId?: string;
  enableMetrics?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface SocketMetrics {
  latency: number;
  messageRate: number;
  queueSize: number;
  connected: boolean;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface TypingIndicator {
  userId: string;
  location: string;
  isTyping: boolean;
}

export interface PresenceState {
  users: Map<string, {
    id: string;
    name: string;
    avatar?: string;
    cursor?: CursorPosition;
    typing?: TypingIndicator;
    lastSeen: number;
  }>;
}

/**
 * Main hook for optimized socket functionality
 */
export function useOptimizedSocket(options: UseOptimizedSocketOptions = {}) {
  const {
    autoConnect = true,
    projectId,
    enableMetrics = false,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<SocketMetrics>({
    latency: 0,
    messageRate: 0,
    queueSize: 0,
    connected: false
  });

  const socketRef = useRef<OptimizedSocket>(optimizedSocket);
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const latencyCheckRef = useRef<NodeJS.Timeout>();

  // Initialize connection
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Handle project room
  useEffect(() => {
    if (connected && projectId) {
      const socket = socketRef.current;
      socket.joinProject(projectId);

      return () => {
        socket.leaveProject(projectId);
      };
    }
  }, [connected, projectId]);

  // Metrics collection functions (declared before use)
  const startMetricsCollection = useCallback(() => {
    // Collect metrics every second
    metricsIntervalRef.current = setInterval(() => {
      const currentMetrics = socketRef.current.getMetrics();
      setMetrics(prev => ({
        ...prev,
        queueSize: Object.values(currentMetrics.queueSizes).reduce((a, b) => a + b, 0),
        messageRate: currentMetrics.queue.processed - prev.messageRate,
        connected: currentMetrics.connected
      }));
    }, 1000);

    // Measure latency every 5 seconds
    latencyCheckRef.current = setInterval(() => {
      const start = Date.now();
      socketRef.current.emit('ping', { timestamp: start }, MessagePriority.CRITICAL);

      const socket = socketRef.current.getSocket();
      socket?.once('pong', () => {
        const latency = Date.now() - start;
        setMetrics(prev => ({ ...prev, latency }));
      });
    }, 5000);
  }, []);

  const stopMetricsCollection = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }
    if (latencyCheckRef.current) {
      clearInterval(latencyCheckRef.current);
    }
  }, []);

  // Connection management
  const connect = useCallback(() => {
    try {
      socketRef.current.connect();
      setConnected(true);

      // Setup event listeners
      const socket = socketRef.current.getSocket();
      if (socket) {
        socket.on('connect', () => {
          setConnected(true);
          onConnect?.();
        });

        socket.on('disconnect', () => {
          setConnected(false);
          onDisconnect?.();
        });

        socket.on('error', (error: Error) => {
          onError?.(error);
        });
      }

      // Start metrics collection if enabled
      if (enableMetrics) {
        startMetricsCollection();
      }
    } catch (error) {

      onError?.(error as Error);
    }
  }, [enableMetrics, onConnect, onDisconnect, onError, startMetricsCollection]);

  const disconnect = useCallback(() => {
    stopMetricsCollection();
    socketRef.current.disconnect();
    setConnected(false);
  }, [stopMetricsCollection]);

  // Optimized emit methods
  const emit = useCallback((event: string, data: unknown, priority?: MessagePriority) => {
    return socketRef.current.emit(event, data, priority);
  }, []);

  const emitWithAck = useCallback((event: string, data: unknown, priority?: MessagePriority) => {
    return socketRef.current.emitWithAck(event, data, priority);
  }, []);

  // Cursor tracking
  const moveCursor = useCallback((x: number, y: number) => {
    if (projectId) {
      socketRef.current.moveCursor(projectId, x, y);
    }
  }, [projectId]);

  // Typing indicators
  const setTyping = useCallback((location: string, isTyping: boolean) => {
    if (projectId) {
      socketRef.current.setTyping(projectId, location, isTyping);
    }
  }, [projectId]);

  // Batch operations
  const batchComments = useCallback((comments: Array<Record<string, unknown>>) => {
    if (projectId) {
      socketRef.current.batchComments(projectId, comments);
    }
  }, [projectId]);

  const batchAnnotations = useCallback((imageId: string, annotations: Array<Record<string, unknown>>) => {
    socketRef.current.batchAnnotations(imageId, annotations);
  }, []);

  // Flush pending messages
  const flush = useCallback(async () => {
    await socketRef.current.flush();
  }, []);

  return {
    // Connection state
    connected,
    metrics: enableMetrics ? metrics : null,

    // Connection management
    connect,
    disconnect,

    // Messaging
    emit,
    emitWithAck,

    // Optimized features
    moveCursor,
    setTyping,
    batchComments,
    batchAnnotations,

    // Utilities
    flush,
    socket: socketRef.current
  };
}

/**
 * Hook for managing presence state
 */
export function usePresence(projectId?: string) {
  const [presence, setPresence] = useState<PresenceState>({
    users: new Map()
  });

  const { connected, socket } = useOptimizedSocket({ projectId });

  useEffect(() => {
    if (!connected || !socket) return;

    const handleUserJoin = (user: { id: string; name: string; avatar?: string }) => {
      setPresence(prev => {
        const users = new Map(prev.users);
        users.set(user.id, {
          ...user,
          lastSeen: Date.now()
        });
        return { users };
      });
    };

    const handleUserLeave = (userId: string) => {
      setPresence(prev => {
        const users = new Map(prev.users);
        users.delete(userId);
        return { users };
      });
    };

    const handleCursorMove = (data: CursorPosition) => {
      setPresence(prev => {
        const users = new Map(prev.users);
        const user = users.get(data.userId);
        if (user) {
          user.cursor = data;
          user.lastSeen = Date.now();
        }
        return { users };
      });
    };

    const handleTypingUpdate = (data: TypingIndicator) => {
      setPresence(prev => {
        const users = new Map(prev.users);
        const user = users.get(data.userId);
        if (user) {
          user.typing = data;
          user.lastSeen = Date.now();
        }
        return { users };
      });
    };

    const socketInstance = socket.getSocket();
    if (socketInstance) {
      socketInstance.on('user:join', handleUserJoin);
      socketInstance.on('user:leave', handleUserLeave);
      socketInstance.on('cursor:move', handleCursorMove);
      socketInstance.on('typing:update', handleTypingUpdate);

      return () => {
        socketInstance.off('user:join', handleUserJoin);
        socketInstance.off('user:leave', handleUserLeave);
        socketInstance.off('cursor:move', handleCursorMove);
        socketInstance.off('typing:update', handleTypingUpdate);
      };
    }
  }, [connected, socket]);

  // Clean up stale users
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      setPresence(prev => {
        const users = new Map(prev.users);
        for (const [userId, user] of users.entries()) {
          if (now - user.lastSeen > timeout) {
            users.delete(userId);
          }
        }
        return { users };
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return presence;
}

/**
 * Hook for cursor tracking
 */
export function useCursorTracking(enabled = true) {
  const { moveCursor, connected } = useOptimizedSocket();
  const rafRef = useRef<number>();

  const trackCursor = useCallback((event: MouseEvent) => {
    if (!enabled || !connected) return;

    // Cancel previous frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Schedule update on next frame
    rafRef.current = requestAnimationFrame(() => {
      moveCursor(event.clientX, event.clientY);
    });
  }, [enabled, connected, moveCursor]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('mousemove', trackCursor);

      return () => {
        document.removeEventListener('mousemove', trackCursor);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [enabled, trackCursor]);
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(location: string, enabled = true) {
  const { setTyping, connected } = useOptimizedSocket();
  const typingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!enabled || !connected) return;

    if (!typingRef.current) {
      typingRef.current = true;
      setTyping(location, true);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      if (typingRef.current) {
        typingRef.current = false;
        setTyping(location, false);
      }
    }, 3000);
  }, [enabled, connected, location, setTyping]);

  const stopTyping = useCallback(() => {
    if (typingRef.current) {
      typingRef.current = false;
      setTyping(location, false);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [location, setTyping]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return { startTyping, stopTyping };
}

/**
 * Hook for socket event listener
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { socket, connected } = useOptimizedSocket();

  useEffect(() => {
    if (!connected) return;

    const socketInstance = socket.getSocket();
    if (socketInstance) {
      socketInstance.on(event, handler);

      return () => {
        socketInstance.off(event, handler);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, event, socket, handler, ...deps]);
}

/**
 * Hook for performance monitoring
 */
export function useSocketMetrics() {
  const { metrics } = useOptimizedSocket({ enableMetrics: true });

  return useMemo(() => {
    if (!metrics) return null;

    return {
      latency: `${metrics.latency}ms`,
      messageRate: `${metrics.messageRate}/s`,
      queueSize: metrics.queueSize,
      status: metrics.connected ? '🟢 Connected' : '🔴 Disconnected',
      health: metrics.latency < 100 ? 'Excellent' :
              metrics.latency < 300 ? 'Good' :
              metrics.latency < 500 ? 'Fair' : 'Poor'
    };
  }, [metrics]);
}