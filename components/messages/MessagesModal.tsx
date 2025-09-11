'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Search, X, ChevronDown, UserPlus, MessageCircle } from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import ChatModal from '@/components/chat/ChatModal'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface Friend {
  id: string
  friend: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
    isActive?: boolean
  }
}

interface MessagesModalProps {
  initialFriend?: any;
  onFriendSelect?: (friend: any) => void;
}

export function MessagesModal({ initialFriend, onFriendSelect }: MessagesModalProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<any>(initialFriend || null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'friends'>('messages')
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Get current user ID from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentUserId(user.id)
    }

    if (isOpen && !isMinimized) {
      loadConversations()
      if (activeTab === 'friends') {
        loadFriends()
      }
    }
    
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
  }, [isOpen, isMinimized, activeTab])

  // Handle initialFriend prop change
  useEffect(() => {
    if (initialFriend) {
      setSelectedFriend(initialFriend)
      setIsOpen(false) // Close the messages modal when a friend is selected
    }
  }, [initialFriend])

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
      } else if (response.status === 404) {
        console.warn('Conversations endpoint not found, using empty list')
        setConversations([])
        setTotalUnread(0)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      // Set empty conversations on error to allow modal to open
      setConversations([])
      setTotalUnread(0)
    }
  }

  const loadFriends = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFriends(data.friends || [])
      }
    } catch (error) {
      console.error('Failed to load friends:', error)
    }
  }

  const startNewConversation = (friend: any) => {
    const friendData = {
      id: friend.id,
      username: friend.username,
      nickname: friend.nickname,
      profileImageUrl: friend.profileImageUrl,
      isActive: friend.isActive
    }
    setSelectedFriend(friendData)
    setIsOpen(false)
    onFriendSelect?.(friendData)
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

  const filteredFriends = friends.filter(f =>
    f.friend.nickname.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
    f.friend.username.toLowerCase().includes(friendSearchQuery.toLowerCase())
  )

  return (
    <>
      {/* Message Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(true)}
      >
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

      {/* Messages Modal */}
      <AnimatePresence>
        {isOpen && !selectedFriend && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            className={cn(
              "fixed z-50 bg-white rounded-lg shadow-2xl border",
              isMinimized ? "h-14 w-80" : "h-[550px] w-[420px]",
              "flex flex-col"
            )}
            style={{
              position: 'fixed',
              top: '100px',  // 헤더 아래 위치
              right: '40px',
              maxHeight: 'calc(100vh - 140px)'
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b cursor-pointer select-none"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">메시지</h3>
                {totalUnread > 0 && (
                  <Badge variant="destructive">{totalUnread}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMinimized(!isMinimized)
                  }}
                >
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    isMinimized ? "rotate-180" : ""
                  )} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'messages' | 'friends')} className="flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 mx-3 mt-2" style={{ width: 'calc(100% - 24px)' }}>
                    <TabsTrigger value="messages" className="relative">
                      대화
                      {totalUnread > 0 && (
                        <Badge className="ml-1 h-4 px-1 text-xs" variant="destructive">
                          {totalUnread}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="friends">친구</TabsTrigger>
                  </TabsList>

                  {/* Messages Tab */}
                  <TabsContent value="messages" className="flex-1 flex flex-col mt-0">
                    {/* Search */}
                    <div className="p-3 border-b">
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
                    <ScrollArea className="flex-1">
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
                                  "text-sm truncate pr-2",
                                  conv.unreadCount > 0 ? "font-semibold text-black" : "text-muted-foreground"
                                )}>
                                  {conv.lastMessage?.content || '대화를 시작해보세요'}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="destructive" className="ml-auto">
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
                        <p className="text-xs text-muted-foreground mt-2">
                          '새 대화' 탭에서 친구를 선택해 대화를 시작하세요
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Friends Tab */}
                <TabsContent value="friends" className="flex-1 flex flex-col mt-0">
                  {/* Search */}
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="친구 검색..."
                        value={friendSearchQuery}
                        onChange={(e) => setFriendSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  {/* Friends List */}
                  <ScrollArea className="flex-1">
                    {filteredFriends.length > 0 ? (
                      <div className="p-2">
                        {filteredFriends.map((friendship) => {
                          const hasConversation = conversations.some(c => c.friend.id === friendship.friend.id)
                          return (
                            <button
                              key={friendship.id}
                              className="w-full p-3 hover:bg-gray-50 transition-colors text-left rounded-lg group"
                              onClick={() => startNewConversation(friendship.friend)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={friendship.friend.profileImageUrl} />
                                    <AvatarFallback>
                                      {friendship.friend.nickname[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {friendship.friend.isActive && (
                                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{friendship.friend.nickname}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {friendship.friend.isActive ? '온라인' : '오프라인'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {hasConversation && (
                                    <Badge variant="outline" className="text-xs">대화중</Badge>
                                  )}
                                  <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                        <p className="text-sm text-muted-foreground">
                          {friendSearchQuery ? '검색 결과가 없습니다' : '친구가 없습니다'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          먼저 친구를 추가해보세요
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual Chat Modal */}
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