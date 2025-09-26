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

export interface SubTask {
  id: string
  workTaskId: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  startDate?: string
  completedAt?: string
  assigneeId?: string
  createdById: string
  position: number
  tags?: string[]
  createdAt: string
  updatedAt: string

  // Relations
  createdBy?: {
    id: string
    nickname: string
    profileImageUrl?: string
  }
  assignee?: {
    id: string
    nickname: string
    profileImageUrl?: string
  }
  comments?: SubTaskComment[]
}

export interface SubTaskComment {
  id: string
  subTaskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isDeleted: boolean

  user: {
    id: string
    nickname: string
    profileImageUrl?: string
  }
}

export interface SubTaskAttachment {
  id: string
  subTaskId: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  fileUrl: string
  uploadedById: string
  createdAt: string

  uploadedBy: {
    id: string
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

export interface CreateSubTaskData {
  title: string
  description?: string
  status?: 'todo' | 'in_progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  assigneeId?: string
  position?: number
}

export interface UpdateSubTaskData {
  title?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  assigneeId?: string
  position?: number
}

export const workTasksAPI = {
  /**
   * Get all work tasks for the authenticated user
   */
  async getWorkTasks(): Promise<WorkTask[]> {
    try {
      const response = await api.get('/api/work-tasks') as any

      // Check for backend response structure: { success: true, data: { workTasks: [...] } }
      if (response && typeof response === 'object') {
        if (response.success && response.data?.workTasks) {
          return response.data.workTasks
        }
        // Legacy: direct array response
        if (Array.isArray(response)) {
          return response
        }
      }

      console.warn('[workTasksAPI] Unexpected response structure:', response)
      return []
    } catch (error) {
      console.error('[workTasksAPI] Error fetching work tasks:', error)
      // Return empty array on error to prevent map failures
      return []
    }
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
    const response = await api.post('/api/work-tasks', data) as any

    // Backend returns { success: true, data: workTask }
    if (response && response.success && response.data) {
      return response.data
    }

    return response
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
  },

  // ===== SubTask Methods =====

  /**
   * Get all subtasks for a work task
   */
  async getSubTasks(workTaskId: string): Promise<SubTask[]> {
    try {
      const response = await api.get(`/api/work-tasks/${workTaskId}/subtasks`) as SubTask[]

      // Backend returns array directly
      if (Array.isArray(response)) {
        return response
      }

      console.warn('[workTasksAPI] Unexpected subtask response structure:', response)
      return []
    } catch (error) {
      console.error('[workTasksAPI] Error fetching subtasks:', error)
      return []
    }
  },

  /**
   * Create a new subtask
   */
  async createSubTask(workTaskId: string, data: CreateSubTaskData): Promise<SubTask> {
    return api.post(`/api/work-tasks/${workTaskId}/subtasks`, data)
  },

  /**
   * Update an existing subtask
   */
  async updateSubTask(workTaskId: string, subtaskId: string, data: UpdateSubTaskData): Promise<SubTask> {
    return api.patch(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}`, data)
  },

  /**
   * Delete a subtask
   */
  async deleteSubTask(workTaskId: string, subtaskId: string): Promise<void> {
    return api.delete(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}`)
  },

  /**
   * Get all comments for a subtask
   */
  async getSubTaskComments(workTaskId: string, subtaskId: string): Promise<SubTaskComment[]> {
    try {
      const response = await api.get(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/comments`) as SubTaskComment[]

      // Backend returns array directly
      if (Array.isArray(response)) {
        return response
      }

      console.warn('[workTasksAPI] Unexpected subtask comments response structure:', response)
      return []
    } catch (error) {
      console.error('[workTasksAPI] Error fetching subtask comments:', error)
      return []
    }
  },

  /**
   * Add a comment to subtask
   */
  async addSubTaskComment(workTaskId: string, subtaskId: string, content: string): Promise<SubTaskComment> {
    return api.post(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/comments`, { content })
  },

  /**
   * Update a subtask comment
   */
  async updateSubTaskComment(
    workTaskId: string,
    subtaskId: string,
    commentId: string,
    content: string
  ): Promise<SubTaskComment> {
    return api.patch(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/comments/${commentId}`, { content })
  },

  /**
   * Delete a subtask comment
   */
  async deleteSubTaskComment(workTaskId: string, subtaskId: string, commentId: string): Promise<void> {
    return api.delete(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/comments/${commentId}`)
  },

  // ===== SubTask Attachment Methods =====

  /**
   * Get all attachments for a subtask
   */
  async getSubTaskAttachments(workTaskId: string, subtaskId: string): Promise<SubTaskAttachment[]> {
    try {
      const response = await api.get(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/attachments`) as SubTaskAttachment[]

      // Backend returns array directly
      if (Array.isArray(response)) {
        return response
      }

      console.warn('[workTasksAPI] Unexpected subtask attachments response structure:', response)
      return []
    } catch (error) {
      console.error('[workTasksAPI] Error fetching subtask attachments:', error)
      return []
    }
  },

  /**
   * Upload a file to subtask
   */
  async uploadSubTaskAttachment(workTaskId: string, subtaskId: string, file: File): Promise<SubTaskAttachment> {
    const formData = new FormData()
    formData.append('file', file)

    // Use fetch directly for file upload instead of the api client
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '파일 업로드에 실패했습니다.')
    }

    return response.json()
  },

  /**
   * Download a subtask attachment
   */
  async downloadSubTaskAttachment(workTaskId: string, subtaskId: string, attachmentId: string): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/attachments/${attachmentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '파일 다운로드에 실패했습니다.')
    }

    return response.blob()
  },

  /**
   * Delete a subtask attachment
   */
  async deleteSubTaskAttachment(workTaskId: string, subtaskId: string, attachmentId: string): Promise<void> {
    return api.delete(`/api/work-tasks/${workTaskId}/subtasks/${subtaskId}/attachments/${attachmentId}`)
  }
}