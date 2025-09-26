/**
 * Socket.io Event Definitions for Studio Platform
 * Real-time event types and payloads
 */

import type { User, Comment, Scene, Image, Project } from '@/types';

// Event Names
export const SOCKET_EVENTS = {
  // Connection Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room Events
  JOIN_PROJECT: 'join_project',
  LEAVE_PROJECT: 'leave_project',
  JOIN_SCENE: 'join_scene',
  LEAVE_SCENE: 'leave_scene',

  // History/Comment Events
  HISTORY_UPDATE: 'history:update',
  COMMENT_NEW: 'comment:new',
  COMMENT_UPDATE: 'comment:update',
  COMMENT_DELETE: 'comment:delete',

  // Scene Events
  SCENE_CREATE: 'scene:create',
  SCENE_UPDATE: 'scene:update',
  SCENE_DELETE: 'scene:delete',

  // Image Events
  IMAGE_UPLOAD: 'image:upload',
  IMAGE_UPDATE: 'image:update',
  IMAGE_DELETE: 'image:delete',
  IMAGE_VERSION_CHANGE: 'image:version:change',

  // Annotation Events
  ANNOTATION_CREATE: 'annotation:create',
  ANNOTATION_UPDATE: 'annotation:update',
  ANNOTATION_DELETE: 'annotation:delete',

  // Presence Events
  USER_JOIN: 'user:join',
  USER_LEAVE: 'user:leave',
  CURSOR_MOVE: 'cursor:move',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Collaboration Events
  PROJECT_UPDATE: 'project:update',
  COLLABORATION_UPDATE: 'collaboration:update',
} as const;

// Event Payload Types
export interface HistoryUpdatePayload {
  project_id: string;
  type: 'comment' | 'scene' | 'image' | 'annotation';
  action: 'create' | 'update' | 'delete';
  data: {
    id: string;
    content?: string;
    user?: Partial<User>;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };
}

export interface CommentEventPayload {
  project_id: string;
  scene_id?: string;
  comment: Comment;
  user?: Partial<User>;
}

export interface SceneEventPayload {
  project_id: string;
  scene: Scene;
  user?: Partial<User>;
}

export interface ImageEventPayload {
  project_id: string;
  scene_id: string;
  image: Partial<Image>;
  type: 'lineart' | 'art';
  user?: Partial<User>;
}

export interface ImageVersionChangePayload {
  project_id: string;
  scene_id: string;
  image_id: string;
  newVersion: number;
  imageType: 'lineart' | 'art';
  user?: Partial<User>;
}

export interface AnnotationEventPayload {
  project_id: string;
  image_id: string;
  annotation: {
    id: string;
    type: string;
    content?: string;
    data?: unknown;
  };
  user?: Partial<User>;
}

export interface PresenceEventPayload {
  project_id: string;
  user_id: string;
  user: Partial<User>;
  status?: 'online' | 'away' | 'offline';
  location?: string;
  cursorPosition?: { x: number; y: number };
}

export interface TypingEventPayload {
  project_id: string;
  user_id: string;
  user: Partial<User>;
  location: string;
  isTyping: boolean;
}

export interface ProjectUpdatePayload {
  project_id: string;
  updates: Partial<Project>;
  user?: Partial<User>;
}

// Socket Event Emitter Types
export type SocketEventMap = {
  // History Events
  [SOCKET_EVENTS.HISTORY_UPDATE]: (payload: HistoryUpdatePayload) => void;

  // Comment Events
  [SOCKET_EVENTS.COMMENT_NEW]: (payload: CommentEventPayload) => void;
  [SOCKET_EVENTS.COMMENT_UPDATE]: (payload: CommentEventPayload) => void;
  [SOCKET_EVENTS.COMMENT_DELETE]: (payload: { project_id: string; comment_id: string; user?: Partial<User> }) => void;

  // Scene Events
  [SOCKET_EVENTS.SCENE_CREATE]: (payload: SceneEventPayload) => void;
  [SOCKET_EVENTS.SCENE_UPDATE]: (payload: SceneEventPayload) => void;
  [SOCKET_EVENTS.SCENE_DELETE]: (payload: { project_id: string; scene_id: string; user?: Partial<User> }) => void;

  // Image Events
  [SOCKET_EVENTS.IMAGE_UPLOAD]: (payload: ImageEventPayload) => void;
  [SOCKET_EVENTS.IMAGE_UPDATE]: (payload: ImageEventPayload) => void;
  [SOCKET_EVENTS.IMAGE_DELETE]: (payload: { project_id: string; image_id: string; user?: Partial<User> }) => void;
  [SOCKET_EVENTS.IMAGE_VERSION_CHANGE]: (payload: ImageVersionChangePayload) => void;

  // Annotation Events
  [SOCKET_EVENTS.ANNOTATION_CREATE]: (payload: AnnotationEventPayload) => void;
  [SOCKET_EVENTS.ANNOTATION_UPDATE]: (payload: AnnotationEventPayload) => void;
  [SOCKET_EVENTS.ANNOTATION_DELETE]: (payload: { project_id: string; annotation_id: string; user?: Partial<User> }) => void;

  // Presence Events
  [SOCKET_EVENTS.USER_JOIN]: (payload: PresenceEventPayload) => void;
  [SOCKET_EVENTS.USER_LEAVE]: (payload: PresenceEventPayload) => void;
  [SOCKET_EVENTS.CURSOR_MOVE]: (payload: PresenceEventPayload) => void;
  [SOCKET_EVENTS.TYPING_START]: (payload: TypingEventPayload) => void;
  [SOCKET_EVENTS.TYPING_STOP]: (payload: TypingEventPayload) => void;

  // Project Events
  [SOCKET_EVENTS.PROJECT_UPDATE]: (payload: ProjectUpdatePayload) => void;
};

// Helper function to emit socket events with type safety
export function emitSocketEvent<K extends keyof SocketEventMap>(
  socket: { emit: (event: string, payload: unknown) => void },
  event: K,
  payload: Parameters<SocketEventMap[K]>[0]
) {
  socket.emit(event, payload);
}

// Helper function to listen to socket events with type safety
export function onSocketEvent<K extends keyof SocketEventMap>(
  socket: { on: (event: string, handler: (...args: unknown[]) => void) => void },
  event: K,
  handler: SocketEventMap[K]
) {
  socket.on(event, handler);
}

// Helper function to remove socket event listener
export function offSocketEvent<K extends keyof SocketEventMap>(
  socket: { off: (event: string, handler?: (...args: unknown[]) => void) => void },
  event: K,
  handler?: SocketEventMap[K]
) {
  socket.off(event, handler);
}