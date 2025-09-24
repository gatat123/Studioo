import api from './client'

export interface WorkTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  startDate?: string
  completedAt?: string
  assigneeId?: string
  createdById: string
  position: number
  tags?: string[]
  inviteCode?: string
  createdAt: string
  updatedAt: string

  // Relations
  createdBy?: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
  }
  participants?: WorkTaskParticipant[]
  comments?: WorkTaskComment[]
}

export interface WorkTaskParticipant {
  id: string
  workTaskId: string
  userId: string
  role: 'creator' | 'assignee' | 'member' | 'viewer'
  joinedAt: string
  lastViewedAt?: string

  user: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
  }
}

export interface WorkTaskComment {
  id: string
  workTaskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isDeleted: boolean

  user: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
  }
}

export interface CreateWorkTaskData {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  assigneeId?: string
}

export interface UpdateWorkTaskData {
  title?: string
  description?: string
  status?: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  assigneeId?: string
}

export const workTasksAPI = {
  /**
   * Get all work tasks for the authenticated user
   */
  async getWorkTasks(): Promise<WorkTask[]> {
    const response = await api.get('/api/work-tasks')
    return response.data || response.workTasks || response || []
  },

  /**
   * Get a specific work task by ID
   */
  async getWorkTask(id: string): Promise<WorkTask> {
    const response = await api.get(`/api/work-tasks/${id}`)
    return response.data || response
  },

  /**
   * Create a new work task
   */
  async createWorkTask(data: CreateWorkTaskData): Promise<WorkTask> {
    return api.post('/api/work-tasks', data)
  },

  /**
   * Update an existing work task
   */
  async updateWorkTask(id: string, data: UpdateWorkTaskData): Promise<WorkTask> {
    return api.patch(`/api/work-tasks/${id}`, data)
  },

  /**
   * Delete a work task
   */
  async deleteWorkTask(id: string): Promise<void> {
    return api.delete(`/api/work-tasks/${id}`)
  },

  /**
   * Join a work task using invite code
   */
  async joinWorkTask(inviteCode: string): Promise<WorkTask> {
    return api.post('/api/work-tasks/join', { inviteCode })
  },

  /**
   * Add a participant to work task
   */
  async addParticipant(taskId: string, userId: string, role: string = 'member'): Promise<WorkTaskParticipant> {
    return api.post(`/api/work-tasks/${taskId}/participants`, { userId, role })
  },

  /**
   * Remove a participant from work task
   */
  async removeParticipant(taskId: string, participantId: string): Promise<void> {
    return api.delete(`/api/work-tasks/${taskId}/participants/${participantId}`)
  },

  /**
   * Add a comment to work task
   */
  async addComment(taskId: string, content: string): Promise<WorkTaskComment> {
    return api.post(`/api/work-tasks/${taskId}/comments`, { content })
  },

  /**
   * Update a comment
   */
  async updateComment(taskId: string, commentId: string, content: string): Promise<WorkTaskComment> {
    return api.patch(`/api/work-tasks/${taskId}/comments/${commentId}`, { content })
  },

  /**
   * Delete a comment
   */
  async deleteComment(taskId: string, commentId: string): Promise<void> {
    return api.delete(`/api/work-tasks/${taskId}/comments/${commentId}`)
  }
}