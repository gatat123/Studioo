export interface User {
  id: string;
  username: string;
  nickname: string;
  profileImage?: string;
}

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
  project?: any;
  scene?: any;
  parentComment?: Comment;
  user?: User;
  author?: User;  // Some APIs return author instead of user
  replies?: Comment[];
  metadata?: {
    annotation_image?: string;
    original_image_id?: string;
    image_type?: string;
  };
  // Legacy properties for backward compatibility - 모두 optional
  createdAt?: string;
  updatedAt?: string;
  isEdited?: boolean;
  parentId?: string;
  attachments?: CommentAttachment[];
  projectId?: string;
  sceneId?: string;
  [key: string]: any; // 추가 속성 허용
}

export interface CommentAttachment {
  id: string;
  url: string;
  type: 'image' | 'file';
  name: string;
  size: number;
}

export type SortOption = 'newest' | 'oldest' | 'mostReplies';

export interface CommentSectionProps {
  projectId?: string;
  sceneId?: string;
  className?: string;
}
