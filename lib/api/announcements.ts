import api, { APIError } from './client'

export interface Announcement {
  id: string
  content: string
  updatedAt: string
  createdAt: string
  userId: string
  user: {
    id: string
    nickname: string
    profileImageUrl?: string
    is_admin?: boolean
  }
}

export interface CreateAnnouncementData {
  content: string
}

export interface UpdateAnnouncementData {
  content: string
}

class AnnouncementsAPI {
  /**
   * 공지사항 조회
   */
  async getAnnouncement(): Promise<Announcement | null> {
    try {
      const response = await api.get('/api/announcements') as Announcement
      return response
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return null // 공지사항이 없는 경우
      }
      throw error
    }
  }

  /**
   * 공지사항 생성 (관리자만)
   */
  async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
    try {
      const response = await api.post('/api/announcements', data) as Announcement
      return response
    } catch (error) {
      console.error('[AnnouncementsAPI] Error creating announcement:', error)
      throw error
    }
  }

  /**
   * 공지사항 수정 (관리자만)
   */
  async updateAnnouncement(data: UpdateAnnouncementData): Promise<Announcement> {
    try {
      const response = await api.put('/api/announcements', data) as Announcement
      return response
    } catch (error) {
      console.error('[AnnouncementsAPI] Error updating announcement:', error)
      throw error
    }
  }

  /**
   * 공지사항 삭제 (관리자만)
   */
  async deleteAnnouncement(): Promise<void> {
    try {
      await api.delete('/api/announcements')
    } catch (error) {
      console.error('[AnnouncementsAPI] Error deleting announcement:', error)
      throw error
    }
  }
}

export const announcementsAPI = new AnnouncementsAPI()