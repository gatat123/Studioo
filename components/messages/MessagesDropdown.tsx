'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Search } from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import ChatModal from '@/components/chat/ChatModal'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
  }
  receiver: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
  }
}

interface Conversation {
  friend: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
    isActive?: boolean
  }
  lastMessage?: Message
  unreadCount: number
}

export function MessagesDropdown() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Get current user ID from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentUserId(user.id)
    }

    loadConversations()
    
    // Socket.io event listeners
    const socket = socketClient.connect()
    
    // New message received
    socket.on('new_message', (data: { message: Message }) => {
      updateConversationWithNewMessage(data.message)
    })
    
    // Message read status update
    socket.on('messages_read', (data: { messageIds: string[], readBy: string }) => {
      updateMessageReadStatus(data.messageIds, data.readBy)
    })
    
    return () => {
      socket.off('new_message')
      socket.off('messages_read')
    }
  }, [])

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        
        // Calculate total unread
        const unread = data.conversations?.reduce((acc: number, conv: Conversation) => 
          acc + conv.unreadCount, 0) || 0
        setTotalUnread(unread)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const updateConversationWithNewMessage = (message: Message) => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => 
        conv.friend.id === message.senderId || conv.friend.id === message.receiverId
      )
      
      const friend = message.senderId === currentUserId ? message.receiver : message.sender
      const newConv: Conversation = {
        friend: {
          id: friend.id,
          username: friend.username,
          nickname: friend.nickname,
          profileImageUrl: friend.profileImageUrl
        },
        lastMessage: message,
        unreadCount: message.senderId !== currentUserId && !message.isRead ? 1 : 0
      }
      
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: message,
          unreadCount: message.senderId !== currentUserId && !message.isRead 
            ? updated[existingIndex].unreadCount + 1 
            : updated[existingIndex].unreadCount
        }
        // Move to top
        const [conv] = updated.splice(existingIndex, 1)
        return [conv, ...updated]
      } else {
        return [newConv, ...prev]
      }
    })
    
    // Update unread count
    if (message.senderId !== currentUserId && !message.isRead) {
      setTotalUnread(prev => prev + 1)
    }
  }

  const updateMessageReadStatus = (messageIds: string[], readBy: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.lastMessage && messageIds.includes(conv.lastMessage.id)) {
        return {
          ...conv,
          lastMessage: { ...conv.lastMessage, isRead: true },
          unreadCount: readBy === currentUserId ? 0 : conv.unreadCount
        }
      }
      return conv
    }))
    
    if (readBy === currentUserId) {
      setTotalUnread(0)
    }
  }

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date)
    const now = new Date()
    const diff = now.getTime() - messageDate.getTime()
    const oneDay = 24 * 60 * 60 * 1000
    
    if (diff < oneDay) {
      return format(messageDate, 'HH:mm')
    } else if (diff < oneDay * 2) {
      return '어제'
    } else if (diff < oneDay * 7) {
      return formatDistanceToNow(messageDate, { addSuffix: true, locale: ko })
    } else {
      return format(messageDate, 'MM.dd')
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <MessageSquare className="h-5 w-5" />
            {totalUnread > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                variant="destructive"
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[360px] p-0">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">메시지</h3>
              <Badge variant="secondary">{conversations.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 메시지 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Conversations List */}
          <ScrollArea className="h-[400px]">
            {filteredConversations.length > 0 ? (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.friend.id}
                    className="w-full p-3 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => {
                      setSelectedFriend(conv.friend)
                      setIsOpen(false)
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conv.friend.profileImageUrl} />
                          <AvatarFallback>
                            {conv.friend.nickname[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conv.friend.isActive && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-sm">{conv.friend.nickname}</p>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm truncate",
                            conv.unreadCount > 0 ? "font-semibold" : "text-muted-foreground"
                          )}>
                            {conv.lastMessage?.content || '대화를 시작해보세요'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? '검색 결과가 없습니다' : '아직 대화가 없습니다'}
                </p>
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Chat Modal */}
      {selectedFriend && currentUserId && (
        <ChatModal
          friend={selectedFriend}
          currentUserId={currentUserId}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </>
  )
}