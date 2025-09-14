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

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  types: {
    comment: boolean;
    mention: boolean;
    invite: boolean;
    project_update: boolean;
    version_upload: boolean;
    member_join: boolean;
    member_leave: boolean;
    role_change: boolean;
    system: boolean;
  };
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  projectName?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Settings
  settings: NotificationSettings;

  // UI State
  isNotificationPanelOpen: boolean;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;

  // Settings actions
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  toggleNotificationType: (type: NotificationType) => void;

  // UI actions
  toggleNotificationPanel: () => void;
  setNotificationPanelOpen: (isOpen: boolean) => void;

  // Sync with server
  syncNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      settings: {
        enabled: true,
        sound: true,
        desktop: true,
        email: true,
        types: {
          comment: true,
          mention: true,
          invite: true,
          project_update: true,
          version_upload: true,
          member_join: true,
          member_leave: false,
          role_change: true,
          system: true,
        },
      },
      isNotificationPanelOpen: false,

      // Actions
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Play sound if enabled
        const { settings } = get();
        if (settings.enabled && settings.sound && settings.types[notification.type]) {
          // Play notification sound
          if (typeof window !== 'undefined') {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
              // Ignore errors (user hasn't interacted with page yet)
            });
          }
        }

        // Show desktop notification if enabled
        if (settings.enabled && settings.desktop && settings.types[notification.type]) {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/logo.png',
                tag: newNotification.id,
              });
            }
          }
        }
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));

        // Request desktop notification permission if enabled
        if (newSettings.desktop && typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }
      },

      toggleNotificationType: (type) => {
        set((state) => ({
          settings: {
            ...state.settings,
            types: {
              ...state.settings.types,
              [type]: !state.settings.types[type],
            },
          },
        }));
      },

      toggleNotificationPanel: () => {
        set((state) => ({ isNotificationPanelOpen: !state.isNotificationPanelOpen }));
      },

      setNotificationPanelOpen: (isOpen) => {
        set({ isNotificationPanelOpen: isOpen });
      },

      syncNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.read).length;
        set({ notifications, unreadCount });
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        // Don't persist notifications - they should come from server
      }),
    }
  )
);

// Helper hook for real-time notifications
export const useRealtimeNotifications = () => {
  const { addNotification, syncNotifications } = useNotificationStore();

  return {
    handleNewNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      addNotification(notification);
    },
    handleNotificationSync: (notifications: Notification[]) => {
      syncNotifications(notifications);
    },
  };
};