import { io, Socket } from 'socket.io-client';
import { authAPI } from '@/lib/api/auth';
import { SOCKET_EVENTS, type SocketEventMap } from '@/lib/socket/events';

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      console.log('[SocketClient] Already connected, returning existing socket:', this.socket.id);
      return this.socket;
    }

    const token = authAPI.getToken();
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    console.log('[SocketClient] 🔌 Connecting to:', socketUrl);
    console.log('[SocketClient] Auth token present:', !!token);

    this.socket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    console.log('[SocketClient] Socket instance created, connecting...');
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SocketClient] ✅ Connected to server, socket ID:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] ❌ Disconnected from server, reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketClient] ❌ Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[SocketClient] Max reconnection attempts reached, giving up');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('[SocketClient] ❌ Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Project room management
  joinProject(projectId: string) {
    this.socket?.emit('join_project', { projectId });
  }

  leaveProject(projectId: string) {
    this.socket?.emit('leave_room', { roomId: `project:${projectId}` });
  }

  // Scene room management
  joinScene(projectId: string, sceneId: string) {
    this.socket?.emit('join_scene', { projectId, sceneId });
  }

  leaveScene(sceneId: string) {
    this.socket?.emit('leave_room', { roomId: `scene:${sceneId}` });
  }

  // Cursor tracking
  sendCursorPosition(projectId: string, x: number, y: number) {
    this.socket?.emit('cursor:move', { projectId, x, y });
  }

  // Typing indicators
  startTyping(projectId: string, location: string) {
    this.socket?.emit('typing:start', { projectId, location });
  }

  stopTyping(projectId: string, location: string) {
    this.socket?.emit('typing:stop', { projectId, location });
  }

  // Comment real-time updates with new event system
  sendComment(projectId: string, comment: {
    id: string;
    content: string;
    userId: string;
    [key: string]: unknown;
  }) {
    this.emit(SOCKET_EVENTS.COMMENT_NEW, {
      project_id: projectId,
      comment: { ...comment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as Parameters<SocketEventMap[typeof SOCKET_EVENTS.COMMENT_NEW]>[0]['comment'],
      scene_id: undefined
    });
  }

  updateComment(projectId: string, commentId: string, content: string) {
    this.emit(SOCKET_EVENTS.COMMENT_UPDATE, {
      project_id: projectId,
      comment: { id: commentId, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as Parameters<SocketEventMap[typeof SOCKET_EVENTS.COMMENT_UPDATE]>[0]['comment'],
      scene_id: undefined
    });
  }

  deleteComment(projectId: string, commentId: string) {
    this.emit(SOCKET_EVENTS.COMMENT_DELETE, { project_id: projectId, comment_id: commentId });
  }

  // History update notification
  sendHistoryUpdate(projectId: string, type: 'comment' | 'scene' | 'image' | 'annotation', action: 'create' | 'update' | 'delete', data: {
    id: string;
    content?: string;
    user?: unknown;
    metadata?: Record<string, unknown>;
  }) {
    this.emit(SOCKET_EVENTS.HISTORY_UPDATE, {
      project_id: projectId,
      type,
      action,
      data: {
        id: data.id,
        content: data.content,
        user: data.user,
        timestamp: new Date().toISOString(),
        metadata: data.metadata
      }
    });
  }

  // Image upload notification
  notifyImageUpload(projectId: string, sceneId: string, image: {
    id: string;
    fileName: string;
    fileSize: number;
    [key: string]: unknown;
  }) {
    this.socket?.emit('image:upload', { projectId, sceneId, image });
  }

  // Annotation real-time updates
  createAnnotation(imageId: string, annotation: {
    id: string;
    type: string;
    data: unknown;
    [key: string]: unknown;
  }) {
    this.socket?.emit('annotation:create', { imageId, annotation });
  }

  updateAnnotation(imageId: string, annotationId: string, updates: Record<string, unknown>) {
    this.socket?.emit('annotation:update', { imageId, annotationId, updates });
  }

  deleteAnnotation(imageId: string, annotationId: string) {
    this.socket?.emit('annotation:delete', { imageId, annotationId });
  }

  // Custom event emitter with type safety
  emit<K extends keyof SocketEventMap>(event: K | string, data?: K extends keyof SocketEventMap ? Parameters<SocketEventMap[K]>[0] : unknown) {
    this.socket?.emit(event as string, data);
  }

  // Custom event listener registration with type safety
  on<K extends keyof SocketEventMap>(event: K | string, callback: K extends keyof SocketEventMap ? SocketEventMap[K] : (...args: unknown[]) => void) {
    this.socket?.on(event as string, callback as (...args: unknown[]) => void);
  }

  off<K extends keyof SocketEventMap>(event: K | string, callback?: K extends keyof SocketEventMap ? SocketEventMap[K] : (...args: unknown[]) => void) {
    this.socket?.off(event as string, callback as (...args: unknown[]) => void);
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();

// Export convenience methods
export const connectSocket = () => socketClient.connect();
export const disconnectSocket = () => socketClient.disconnect();
export const getSocket = () => socketClient.getSocket();