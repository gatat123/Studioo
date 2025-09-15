'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Bell,
  X,
  Settings,
  Check,
  Trash2,
  MessageSquare,
  AtSign,
  UserPlus,
  Upload,
  Users,
  Shield,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificationStore, type NotificationType } from '@/store/useNotificationStore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  comment: <MessageSquare className="w-4 h-4" />,
  mention: <AtSign className="w-4 h-4" />,
  invite: <UserPlus className="w-4 h-4" />,
  project_update: <Upload className="w-4 h-4" />,
  version_upload: <Upload className="w-4 h-4" />,
  member_join: <Users className="w-4 h-4" />,
  member_leave: <Users className="w-4 h-4" />,
  role_change: <Shield className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
};

const notificationColors: Record<NotificationType, string> = {
  comment: 'text-blue-500',
  mention: 'text-purple-500',
  invite: 'text-green-500',
  project_update: 'text-orange-500',
  version_upload: 'text-cyan-500',
  member_join: 'text-emerald-500',
  member_leave: 'text-red-500',
  role_change: 'text-yellow-500',
  system: 'text-gray-500',
};

export function NotificationCenter() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isNotificationPanelOpen,
    setNotificationPanelOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      setNotificationPanelOpen(false);
      router.push(notification.link);
    }
  };

  const handleSettingsClick = () => {
    setNotificationPanelOpen(false);
    router.push('/settings/notifications');
  };

  return (
    <Popover open={isNotificationPanelOpen} onOpenChange={setNotificationPanelOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="알림"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] p-0"
        align="end"
        alignOffset={-40}
        sideOffset={10}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">알림</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              className="w-8 h-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotificationPanelOpen(false)}
              className="w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">
                전체
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                읽지 않음 {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>

            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    모두 읽음
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-7 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  모두 삭제
                </Button>
              </div>
            )}
          </div>

          <TabsContent value={filter} className="mt-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">알림이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={cn(
                        'p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group',
                        !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          {notification.userAvatar ? (
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={notification.userAvatar} />
                              <AvatarFallback>
                                {notification.userName?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div
                              className={cn(
                                'w-10 h-10 rounded-full bg-muted flex items-center justify-center',
                                notificationColors[notification.type]
                              )}
                            >
                              {notificationIcons[notification.type]}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium truncate pr-2">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {notification.projectName && (
                                <Badge variant="secondary" className="text-xs">
                                  {notification.projectName}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                  locale: ko,
                                })}
                              </span>
                            </div>

                            {notification.link && (
                              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}