'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { socketClient } from '@/lib/socket/client';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: 'channel_message' | 'channel_invite' | 'friend_request' | 'system';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    channelId?: string;
    channelName?: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    inviteId?: string;
  };
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // Load initial notifications
    loadNotifications();

    // Connect to Socket.io
    const socket = socketClient.connect();

    // Listen for new channel messages
    socket.on('new_channel_message', (data: { message: any }) => {
      // Only show notification if message is from another user
      if (data.message.senderId !== user.id) {
        const notification: Notification = {
          id: `msg-${Date.now()}`,
          type: 'channel_message',
          title: '새 메시지',
          content: `${data.message.sender.nickname}: ${data.message.content.substring(0, 50)}${data.message.content.length > 50 ? '...' : ''}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: {
            channelId: data.message.channelId,
            channelName: data.message.channel?.name,
            senderId: data.message.senderId,
            senderName: data.message.sender.nickname,
            senderAvatar: data.message.sender.profileImageUrl
          }
        };

        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show toast notification
        toast.success(`${data.message.sender.nickname}님의 메시지`, {
          description: data.message.content.substring(0, 100),
          action: {
            label: '보기',
            onClick: () => router.push('/studio/team')
          }
        });
      }
    });

    // Listen for channel invites
    socket.on('channel_invite_received', (data: { invite: any }) => {
      const notification: Notification = {
        id: `invite-${Date.now()}`,
        type: 'channel_invite',
        title: '채널 초대',
        content: `${data.invite.inviter.nickname}님이 ${data.invite.channel.name} 채널에 초대했습니다`,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: {
          channelId: data.invite.channelId,
          channelName: data.invite.channel.name,
          inviteId: data.invite.id,
          senderId: data.invite.inviterId,
          senderName: data.invite.inviter.nickname,
          senderAvatar: data.invite.inviter.profileImageUrl
        }
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      toast.info('채널 초대', {
        description: `${data.invite.inviter.nickname}님이 ${data.invite.channel.name} 채널에 초대했습니다`,
        action: {
          label: '확인',
          onClick: () => setIsOpen(true)
        }
      });
    });

    // Listen for friend requests
    socket.on('friend_request_received', (data: { sender: any, message?: string }) => {
      const notification: Notification = {
        id: `friend-${Date.now()}`,
        type: 'friend_request',
        title: '친구 요청',
        content: `${data.sender.nickname}님이 친구 요청을 보냈습니다`,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: {
          senderId: data.sender.id,
          senderName: data.sender.nickname,
          senderAvatar: data.sender.profileImageUrl
        }
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      toast.info('친구 요청', {
        description: `${data.sender.nickname}님이 친구 요청을 보냈습니다`,
        action: {
          label: '확인',
          onClick: () => setIsOpen(true)
        }
      });
    });

    return () => {
      socket.off('new_channel_message');
      socket.off('channel_invite_received');
      socket.off('friend_request_received');
    };
  }, [user, router]);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    switch (notification.type) {
      case 'channel_message':
      case 'channel_invite':
        router.push('/studio/team');
        break;
      case 'friend_request':
        // Open friends modal
        break;
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'channel_message':
        return '💬';
      case 'channel_invite':
        return '📨';
      case 'friend_request':
        return '👥';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              모두 읽음
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer",
                    !notification.isRead && "bg-muted/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {notification.metadata?.senderAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={notification.metadata.senderAvatar} />
                        <AvatarFallback>
                          {notification.metadata.senderName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}