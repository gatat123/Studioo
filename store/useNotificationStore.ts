import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Notification types
export type NotificationType =
  | 'comment'
  | 'mention'
  | 'invite'
  | 'project_update'
  | 'version_upload'
  | 'member_join'
  | 'member_leave'
  | 'role_change'
  | 'system';

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  projectName?: string;
  projectId?: string;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Notification store state interface
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isNotificationPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  setNotificationPanelOpen: (isOpen: boolean) => void;
  updateUnreadCount: () => void;
  fetchNotifications: () => Promise<void>;
  clearError: () => void;
}

// Mock notification generator for testing (to be replaced with actual API calls)
const generateMockNotifications = (): Notification[] => {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'comment',
      title: '새로운 댓글',
      message: 'John님이 "프로젝트 디자인 시안"에 댓글을 남겼습니다.',
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(), // 5분 전
      link: '/studio/projects/1',
      projectName: '프로젝트 디자인',
      userName: 'John',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
    {
      id: '2',
      type: 'mention',
      title: '멘션 알림',
      message: '@당신을 멘션했습니다: "이 부분 검토 부탁드립니다"',
      read: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // 30분 전
      link: '/studio/projects/2',
      projectName: 'UI 개선 작업',
      userName: 'Sarah',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    {
      id: '3',
      type: 'version_upload',
      title: '새 버전 업로드',
      message: 'v2.0.0 버전이 업로드되었습니다.',
      read: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
      link: '/studio/projects/1/versions',
      projectName: '프로젝트 디자인',
    },
    {
      id: '4',
      type: 'invite',
      title: '프로젝트 초대',
      message: '새로운 프로젝트 "마케팅 캠페인"에 초대되었습니다.',
      read: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1일 전
      link: '/studio/projects/3',
      projectName: '마케팅 캠페인',
    },
  ];
};

// Create notification store with persistence
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isNotificationPanelOpen: false,
      isLoading: false,
      error: null,
      lastFetch: null,

      // Set all notifications
      setNotifications: (notifications) => {
        set({
          notifications: notifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        });
        get().updateUnreadCount();
      },

      // Add a new notification
      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));
        get().updateUnreadCount();
      },

      // Mark notification as read
      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }));
        get().updateUnreadCount();
      },

      // Mark all notifications as read
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      // Delete a notification
      deleteNotification: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
        }));
        get().updateUnreadCount();
      },

      // Clear all notifications
      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      // Toggle notification panel
      setNotificationPanelOpen: (isOpen) => {
        set({ isNotificationPanelOpen: isOpen });
      },

      // Update unread count
      updateUnreadCount: () => {
        const count = get().notifications.filter((n) => !n.read).length;
        set({ unreadCount: count });
      },

      // Fetch notifications from API
      fetchNotifications: async () => {
        set({ isLoading: true, error: null });

        try {
          // TODO: Replace with actual API call
          // const response = await notificationAPI.getNotifications();
          // const notifications = response.data;

          // Temporary: Use mock data for development
          const notifications = generateMockNotifications();

          set({
            notifications: notifications.sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
            isLoading: false,
            lastFetch: new Date().toISOString(),
          });

          get().updateUnreadCount();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '알림을 불러오는데 실패했습니다.';
          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        lastFetch: state.lastFetch,
      }),
    }
  )
);

// WebSocket event listener for real-time notifications
interface WebSocket {
  on: (event: string, callback: (data: unknown) => void) => void;
}

export const initNotificationWebSocket = (socket: WebSocket) => {
  const store = useNotificationStore.getState();

  // Listen for new notifications
  socket.on('notification:new', (notification: Notification) => {
    store.addNotification(notification);
  });

  // Listen for notification updates
  socket.on('notification:update', (data: { id: string; read: boolean }) => {
    if (data.read) {
      store.markAsRead(data.id);
    }
  });

  // Listen for notification deletion
  socket.on('notification:delete', (notificationId: string) => {
    store.deleteNotification(notificationId);
  });
};

// Notification helper functions
export const createNotification = (
  type: NotificationType,
  title: string,
  message: string,
  options?: Partial<Notification>
): Notification => {
  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    ...options,
  };
};

// Export notification type guards
export const isSystemNotification = (notification: Notification): boolean => {
  return notification.type === 'system';
};

export const isProjectNotification = (notification: Notification): boolean => {
  return ['project_update', 'version_upload', 'member_join', 'member_leave', 'role_change'].includes(notification.type);
};

export const isUserNotification = (notification: Notification): boolean => {
  return ['comment', 'mention', 'invite'].includes(notification.type);
};