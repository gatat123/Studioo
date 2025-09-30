'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

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

interface AnnouncementState {
  announcement: Announcement | null
  isEditing: boolean
  isLoading: boolean
  error: string | null
}

interface AnnouncementActions {
  setAnnouncement: (announcement: Announcement | null) => void
  setIsEditing: (isEditing: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  resetState: () => void
}

type AnnouncementStore = AnnouncementState & AnnouncementActions

const initialState: AnnouncementState = {
  announcement: null,
  isEditing: false,
  isLoading: false,
  error: null,
}

export const useAnnouncementStore = create<AnnouncementStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        setAnnouncement: (announcement) =>
          set({ announcement, error: null }),

        setIsEditing: (isEditing) =>
          set({ isEditing }),

        setIsLoading: (isLoading) =>
          set({ isLoading }),

        setError: (error) =>
          set({ error, isLoading: false }),

        resetState: () =>
          set(initialState),
      }),
      {
        name: 'announcement-storage',
        partialize: (state) => ({
          announcement: state.announcement,
        }),
      }
    )
  )
)

// Socket.io 실시간 업데이트를 위한 액션들
export const announcementActions = {
  updateFromSocket: (announcement: Announcement) => {
    useAnnouncementStore.getState().setAnnouncement(announcement)
  },

  clearFromSocket: () => {
    useAnnouncementStore.getState().setAnnouncement(null)
  },
}