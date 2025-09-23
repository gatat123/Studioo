'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Search, X, ChevronDown, UserPlus, MessageCircle, GripHorizontal } from 'lucide-react'
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
  username: string
  nickname?: string
  profileImageUrl?: string
  isActive?: boolean
  friend?: { // For API response structure compatibility
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
    isActive?: boolean
  }
}

interface MessagesModalProps {
  initialFriend?: Friend;
  onFriendSelect?: (friend: Friend) => void;
}

export function MessagesModal({ initialFriend, onFriendSelect }: MessagesModalProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(initialFriend || null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'friends'>('messages')
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  // const searchTimeoutRef = useRef<NodeJS.Timeout>() // Not currently used

  // Drag state for minimized modal - 헤더 아래 위치 (top: 70px)
  const [position, setPosition] = useState({ x: -1, y: 70 }) // x: -1로 초기화하여 첫 위치 설정 보장
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const minimizedRef = useRef<HTMLDivElement>(null)

  // Initialize position to top-right corner (헤더 아래)
  useEffect(() => {
    if (isMinimized && position.x === -1) {
      const windowWidth = window.innerWidth
      setPosition({ x: windowWidth - 280, y: 70 }) // 상단 70px 위치 고정
    }
  }, [isMinimized, position.x])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setConversations([])
        setTotalUnread(0)
      }
    } catch {
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
    } catch {
    }
  }

  const startNewConversation = (friend: Friend) => {
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

  // Drag handlers for minimized modal
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Get window dimensions
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const modalWidth = minimizedRef.current?.offsetWidth || 200
      const modalHeight = minimizedRef.current?.offsetHeight || 60

      // Boundary checks
      const boundedX = Math.max(0, Math.min(newX, windowWidth - modalWidth))
      const boundedY = Math.max(60, Math.min(newY, windowHeight - modalHeight)) // 60px for header

      setPosition({ x: boundedX, y: boundedY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart.x, dragStart.y])

  const filteredConversations = conversations.filter(conv =>
    conv.friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFriends = friends.filter((f) =>
    (f.friend?.nickname || f.nickname || '').toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
    (f.friend?.username || f.username || '').toLowerCase().includes(friendSearchQuery.toLowerCase())
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
        {isOpen && !selectedFriend && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 h-[550px] w-[420px] flex flex-col"
            style={{
              position: 'fixed',
              top: '120px',  // 헤더 아래 여유있게 위치
              right: '40px',
              maxHeight: 'calc(100vh - 140px)'
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b select-none"
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
                          &apos;새 대화&apos; 탭에서 친구를 선택해 대화를 시작하세요
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Floating Container */}
      <AnimatePresence>
        {isOpen && isMinimized && !selectedFriend && (
          <motion.div
            ref={minimizedRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25
            }}
            className="fixed z-50"
            style={{
              left: `${position.x || (window.innerWidth - 250)}px`,
              top: `${position.y || 70}px`,
              cursor: isDragging ? 'move' : 'default'
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 flex items-center gap-1 p-2 select-none">
              {/* Drag Handle */}
              <div
                onMouseDown={handleMouseDown}
                className="cursor-move p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="드래그하여 이동"
              >
                <GripHorizontal className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>

              {/* Main Button */}
              <Button
                variant="ghost"
                className="h-10 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 relative"
                onClick={() => setIsMinimized(false)}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                <span className="font-medium">메시지</span>
                {totalUnread > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center animate-pulse"
                    variant="destructive"
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
              </Button>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  setPosition({ x: -1, y: 70 }) // Reset position when closing (헤더 아래)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual Chat Modal */}
      {selectedFriend && currentUserId && (
        <ChatModal
          friend={selectedFriend}
          currentUserId={currentUserId}
          onClose={() => setSelectedFriend(null)}
          onBack={() => {
            setSelectedFriend(null);
            setIsOpen(true);
          }}
        />
      )}
    </>
  )
}