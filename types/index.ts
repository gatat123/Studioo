/**
 * Type definitions for Studio Collaboration Platform
 */

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  bio?: string | null;
  profile_image?: string | null;
  profile_image_url?: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  studio?: Studio;
  // Legacy properties for backward compatibility
  profileImage?: string;
  profileImageUrl?: string; // Backend API returns this (camelCase)
}

// Studio types
export interface Studio {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  projects?: Project[];
}

// Project types
export interface Project {
  id: string;
  studio_id: string;
  creator_id: string;
  name: string;
  description?: string | null;
  deadline?: string | Date | null;
  tag?: 'illustration' | 'storyboard' | null;
  inviteCode?: string | null;
  status: 'active' | 'completed' | 'archived';
  project_type: 'studio' | 'work';
  has_updates: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  character_list?: any;
  overall_story?: string | null;
  set_list?: any;
  studio?: Studio;
  creator?: User;
  participants?: ProjectParticipant[];
  scenes?: Scene[];
  comments?: Comment[];
  subTasks?: SubTask[];
  _count?: {
    scenes: number;
    participants: number;
    comments: number;
    subTasks?: number;
  };
}

// Project Participant types
export interface ProjectParticipant {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer' | 'member';
  joined_at: string | Date;
  last_viewed_at?: string | Date | null;
  project?: Project;
  user?: User;  // Optional as it may not always be included
}

// Scene types
export interface Scene {
  id: string;
  project_id: string;
  scene_number?: number;
  index?: number;
  title?: string;
  description?: string | null;
  notes?: string | null;
  created_by?: string;
  created_at: string | Date;
  updated_at: string | Date;
  project?: Project;
  creator?: User;
  images?: Image[];
  comments?: Comment[];
  subTasks?: SubTask[];
  _count?: {
    images: number;
    comments: number;
    subTasks?: number;
  };
}

// Image types
export interface Image {
  id: string;
  scene_id: string;
  type: 'lineart' | 'art';
  file_url: string;
  file_size?: bigint | string | number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  is_current: boolean;
  uploaded_by: string;
  uploaded_at: string | Date;
  metadata?: unknown;
  scene?: Scene;
  uploader?: User;
  history?: ImageHistory[];
  annotations?: Annotation[];
}

// Image History types
export interface ImageHistory {
  id: string;
  image_id: string;
  scene_id: string;
  version_number: number;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  change_description?: string | null;
  image?: Image;
  scene?: Scene;
  uploader?: User;
}

// Comment types
export interface Comment {
  id: string;
  project_id?: string | null;
  scene_id?: string | null;
  parent_comment_id?: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  project?: Project;
  scene?: Scene;
  parentComment?: Comment;
  user?: User;
  author?: User;  // Some APIs return author instead of user
  replies?: Comment[];
  metadata?: {
    annotation_image?: string;
    original_image_id?: string;
    image_type?: string;
  };
  // Legacy properties for backward compatibility
  createdAt?: string;
  updatedAt?: string;
  isEdited?: boolean;
  parentId?: string;
  projectId?: string;
  sceneId?: string;
  attachments?: {
    id: string;
    url: string;
    type: 'image' | 'file';
    name: string;
    size: number;
  }[];
}

// Annotation types
export interface Annotation {
  id: string;
  image_id: string;
  user_id: string;
  type: 'drawing' | 'text' | 'arrow' | 'rectangle';
  position_x: number;
  position_y: number;
  width?: number | null;
  height?: number | null;
  content?: string | null;
  drawing_data?: Record<string, unknown>;
  color?: string | null;
  created_at: string;
  updated_at: string;
  image?: Image;
  user?: User;
}

// User Presence types
export interface UserPresence {
  id: string;
  user_id: string;
  project_id?: string | null;
  scene_id?: string | null;
  status?: 'online' | 'away' | 'offline' | null;
  cursor_x?: number | null;
  cursor_y?: number | null;
  is_typing: boolean;
  last_activity: string;
  socket_id?: string | null;
  user?: User;
  project?: Project;
  scene?: Scene;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  project_id?: string | null;
  type: string;
  title: string;
  content?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  user?: User;
  project?: Project;
}

// Collaboration Log types
export interface CollaborationLog {
  id: string;
  project_id: string;
  user_id: string;
  action_type: string;
  target_type?: string | null;
  target_id?: string | null;
  description?: string | null;
  metadata?: unknown;
  created_at: string;
  project?: Project;
  user?: User;
}

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  nickname: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  studio?: {
    id: string;
    name: string;
    description?: string;
  };
}

// Session types
export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}
// SubTask types
export interface SubTask {
  id: string;
  workTaskId: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | Date | null;
  startDate?: string | Date | null;
  completedAt?: string | Date | null;
  assigneeId?: string | null;
  createdById: string;
  position: number;
  tags?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
  workTask?: Project;
  assignee?: User;
  createdBy?: User;
  participants?: SubTaskParticipant[];
  comments?: SubTaskComment[];
  attachments?: SubTaskAttachment[];
}

// SubTask Participant types
export interface SubTaskParticipant {
  id: string;
  subtaskId: string;
  userId: string;
  joinedAt: string | Date;
  user: User;
}

// SubTask Comment types
export interface SubTaskComment {
  id: string;
  subTaskId: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  isEdited: boolean;
  isDeleted: boolean;
  subTask?: SubTask;
  user?: User;
}

// SubTask Attachment types
export interface SubTaskAttachment {
  id: string;
  subTaskId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedById: string;
  createdAt: string | Date;
  subTask?: SubTask;
  uploadedBy?: User;
}
