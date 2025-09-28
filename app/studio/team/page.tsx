'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  MessageSquare,
  MoreVertical,
  Search,
  Plus,
  Hash,
  AtSign,
  Smile,
  UserPlus,
  Settings,
  LogOut,
  Trash2
} from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { SOCKET_EVENTS, type ChannelMessagePayload } from '@/lib/socket/events'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { safeFormat } from '@/lib/utils/date-helpers'
import { channelsAPI, type Channel, type ChannelMember, type ChannelMessage, type ChannelInvitation } from '@/lib/api/channels'
import { useAuthStore } from '@/store/useAuthStore'
import { CreateChannelModal } from '@/components/team/CreateChannelModal'
import { InviteMemberModal } from '@/components/team/InviteMemberModal'
import { DeleteChannelModal } from '@/components/team/DeleteChannelModal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'


function TeamPageContent() {
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()
  const searchParams = useSearchParams()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [pendingInvites, setPendingInvites] = useState<ChannelInvitation[]>([])
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([])
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const [deleteChannelOpen, setDeleteChannelOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()

  useEffect(() => {
    // Load initial channels
    loadChannels()

    // Connect to Socket.io
    socketClient.connect()

    // Listen for user presence updates globally
    socketClient.on(SOCKET_EVENTS.USER_PRESENCE_UPDATE, (data) => {
      // Update member online status in the member list
      setChannelMembers(prev => prev.map(member =>
        member.userId === data.userId
          ? { ...member, user: { ...member.user, isActive: data.status === 'online' } }
          : member
      ))
    })

    // Alternative presence update event for backward compatibility
    const socket = socketClient.connect()
    socket.on('presence_update', (data: { userId: string; isOnline: boolean }) => {
      setChannelMembers(prev => prev.map(member =>
        member.userId === data.userId
          ? { ...member, user: { ...member.user, isActive: data.isOnline } }
          : member
      ))
    })

    return () => {
      socketClient.off(SOCKET_EVENTS.USER_PRESENCE_UPDATE)
      socket.off('presence_update')
      if (selectedChannel) {
        socketClient.leaveChannel(selectedChannel.id)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (selectedChannel) {
      // Join channel using standardized events
      socketClient.joinChannel(selectedChannel.id)

      // Listen for real-time channel messages
      socketClient.on(SOCKET_EVENTS.CHANNEL_MESSAGE_NEW, (data) => {
        if (data.message.channelId === selectedChannel.id) {
          setMessages(prev => {
            // Avoid duplicate messages
            const exists = prev.some(m => m.id === data.message.id)
            if (exists) return prev
            return [...prev, data.message]
          })
          scrollToBottom()
        }
      })
      
      // Listen for member joined
      socketClient.on(SOCKET_EVENTS.CHANNEL_MEMBER_JOINED, (data) => {
        if (data.user) {
          loadChannelMembers(selectedChannel.id)
          toast({
            title: '새 멤버',
            description: `${data.user.nickname}님이 채널에 참여했습니다.`
          })
        }
      })

      // Listen for member left
      socketClient.on(SOCKET_EVENTS.CHANNEL_MEMBER_LEFT, (data) => {
        setChannelMembers(prev => prev.filter(m => m.userId !== data.userId))
      })
      
      // Listen for typing indicators
      socketClient.on(SOCKET_EVENTS.CHANNEL_TYPING_START, (data) => {
        // Handle typing indicator
        if (data.userId !== currentUser?.id) {
          // Show typing indicator for other users
        }
      })

      socketClient.on(SOCKET_EVENTS.CHANNEL_TYPING_STOP, () => {
        // Hide typing indicator
      })
      
      // 초대 수신 이벤트
      socketClient.on(SOCKET_EVENTS.CHANNEL_INVITE_RECEIVED, (data) => {
        loadChannels() // 채널 목록 새로고침
        toast({
          title: '채널 초대',
          description: `${data.invite.inviter.nickname}님이 ${data.invite.channel.name} 채널에 초대했습니다.`
        })
      })
      
      // Load channel data
      loadChannelMembers(selectedChannel.id)
      loadMessages(selectedChannel.id)
      
      return () => {
        socketClient.leaveChannel(selectedChannel.id)
        socketClient.off(SOCKET_EVENTS.CHANNEL_MESSAGE_NEW)
        socketClient.off(SOCKET_EVENTS.CHANNEL_MEMBER_JOINED)
        socketClient.off(SOCKET_EVENTS.CHANNEL_MEMBER_LEFT)
        socketClient.off(SOCKET_EVENTS.CHANNEL_TYPING_START)
        socketClient.off(SOCKET_EVENTS.CHANNEL_TYPING_STOP)
        socketClient.off(SOCKET_EVENTS.CHANNEL_INVITE_RECEIVED)
      }
    }
  }, [selectedChannel, currentUser, toast]) // eslint-disable-line react-hooks/exhaustive-deps
  
  const loadChannels = useCallback(async () => {
    try {
      const response = await channelsAPI.getChannels()
      
      setChannels(response.channels)
      setPendingInvites(response.pendingInvites)
      
      // Auto-select first channel if available
      if (response.channels.length > 0 && !selectedChannel) {
        setSelectedChannel(response.channels[0])
      }
    } catch {
      // Failed to load channels
      toast({
        title: '오류',
        description: '채널 목록을 불러오는데 실패했습니다',
        variant: 'destructive'
      })
    }
  }, [selectedChannel, toast])
  
  const loadChannelMembers = async (channel_id: string) => {
    try {
      const members = await channelsAPI.getMembers(channel_id)
      // Initialize all members as offline, Socket.io will update actual status
      const membersWithOfflineStatus = members.map(member => ({
        ...member,
        user: {
          ...member.user,
          isActive: false, // Start with offline status
          isOnline: false
        }
      }))
      setChannelMembers(membersWithOfflineStatus)

      // Request presence status for all members after loading
      if (socketClient.isConnected()) {
        socketClient.requestPresenceStatus(channel_id, members.map(m => m.userId))
      }
    } catch {
      // Failed to load channel members
    }
  }
  
  const loadMessages = useCallback(async (channel_id: string, cursor?: string) => {
    try {
      setLoading(true)
      const result = await channelsAPI.getMessages(channel_id, 50, cursor)
      
      if (cursor) {
        // Append to existing messages for pagination
        setMessages(prev => [...result.messages, ...prev])
      } else {
        // Replace messages for initial load
        setMessages(result.messages)
      }
      
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
      
      if (!cursor) {
        scrollToBottom()
      }
    } catch {
      // Failed to load messages
    } finally {
      setLoading(false)
    }
  }, [])
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return
    
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      channelId: selectedChannel.id,
      senderId: currentUser?.id || '',
      content: newMessage.trim(),
      type: 'text',
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser?.id || '',
        username: currentUser?.username || '',
        nickname: currentUser?.nickname || '',
        profile_image_url: currentUser?.profile_image_url
      }
    } as ChannelMessage
    
    // Optimistically add message
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    scrollToBottom()
    
    // Send through Socket.io for real-time delivery
    socketClient.sendChannelMessage(selectedChannel.id, newMessage.trim(), 'text', tempId)
    
    // Listen for confirmation
    const handleMessageSent = (data: ChannelMessagePayload) => {
      if (data.tempId === tempId && data.message) {
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? data.message as ChannelMessage : msg
        ))
        socketClient.off(SOCKET_EVENTS.CHANNEL_MESSAGE_SENT, handleMessageSent)
      }
    }
    socketClient.on(SOCKET_EVENTS.CHANNEL_MESSAGE_SENT, handleMessageSent)

    const handleMessageError = (data: { error: string, tempId?: string, channel_id: string }) => {
      if (data.tempId === tempId) {
        // Remove optimistic message
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        toast({
          title: '오류',
          description: data.error || '메시지 전송에 실패했습니다',
          variant: 'destructive'
        })
        socketClient.off(SOCKET_EVENTS.CHANNEL_MESSAGE_ERROR, handleMessageError)
      }
    }
    socketClient.on(SOCKET_EVENTS.CHANNEL_MESSAGE_ERROR, handleMessageError)
  }
  
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }
  
  const handleTyping = () => {
    if (!isTyping && selectedChannel) {
      setIsTyping(true)
      socketClient.startChannelTyping(selectedChannel.id)

      setTimeout(() => {
        setIsTyping(false)
        if (selectedChannel) {
          socketClient.stopChannelTyping(selectedChannel.id)
        }
      }, 2000)
    }
  }
  
  const handleChannelCreated = () => {
    loadChannels()
  }
  
  const handleLeaveChannel = async () => {
    if (!selectedChannel) return
    
    const isAdmin = channelMembers.find(m => m.userId === currentUser?.id)?.role === 'admin'
    const otherMembers = channelMembers.filter(m => m.userId !== currentUser?.id)
    
    if (isAdmin && otherMembers.length > 0) {
      // Admin leaving - need to assign new admin
      toast({
        title: '새 관리자 지정',
        description: '채널을 나가기 전에 새 관리자를 지정해주세요.',
        variant: 'destructive'
      })
      // TODO: Open modal to select new admin
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${selectedChannel.id}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        toast({
          title: '채널 탈퇴',
          description: `${selectedChannel.name} 채널에서 나갔습니다.`
        })
        
        // Remove channel from list
        setChannels(prev => prev.filter(ch => ch.id !== selectedChannel.id))
        setSelectedChannel(null)
        
        // Emit socket event
        socketClient.leaveChannel(selectedChannel.id)
      } else {
        // Failed to leave channel
      }
    } catch {
      // Leave channel error
      toast({
        title: '오류',
        description: '채널 탈퇴에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }
  
  const handleChannelSettings = () => {
    // TODO: Open channel settings modal for admin
    toast({
      title: '채널 설정',
      description: '채널 설정 기능은 준비 중입니다.'
    })
  }

  const handleChannelDeleted = () => {
    // Remove the deleted channel from the list
    if (selectedChannel) {
      setChannels(prev => prev.filter(ch => ch.id !== selectedChannel.id))

      // Select another channel or clear selection
      const remainingChannels = channels.filter(ch => ch.id !== selectedChannel.id)
      setSelectedChannel(remainingChannels.length > 0 ? remainingChannels[0] : null)

      // Clear channel-specific data
      setChannelMembers([])
      setMessages([])
    }
  }
  
  // Removed unused getStatusColor function

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Channels */}
      <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">채널</h2>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setCreateChannelOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="채널 검색..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* 대기 중인 초대 */}
            {pendingInvites.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">초대받은 채널</h3>
                <div className="space-y-1">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="px-2 py-2 mx-2 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-slate-600" />
                          <span className="text-sm font-medium">{invite.channel.name}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {invite.inviter.nickname}님이 초대
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/invitations/${invite.id}/accept`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                toast({ title: '채널에 참여했습니다!' });
                                await loadChannels();
                              }
                            } catch {
                              toast({ title: '오류', description: '처리 중 오류가 발생했습니다.', variant: 'destructive' });
                            }
                          }}
                        >
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/invitations/${invite.id}/reject`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                toast({ title: '초대를 거절했습니다.' });
                                await loadChannels();
                              }
                            } catch {
                              toast({ title: '오류', description: '처리 중 오류가 발생했습니다.', variant: 'destructive' });
                            }
                          }}
                        >
                          거절
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 채널 목록 */}
            <div className="space-y-1">
              {channels.filter(ch => 
                ch.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannel?.id === channel.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedChannel(channel)}
                >
                  {channel.type === 'private' ? (
                    <AtSign className="h-4 w-4 mr-2" />
                  ) : (
                    <Hash className="h-4 w-4 mr-2" />
                  )}
                  <span className="flex-1 text-left">{channel.name}</span>
                  {channel._count?.messages && channel._count.messages > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {channel._count.messages}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Channel Members */}
        {selectedChannel && (() => {
          // Check if admin is viewing as admin (from admin dashboard)
          const isAdminMode = searchParams.get('channel') === selectedChannel.id && currentUser?.is_admin
          // Filter out admin from members if in admin mode
          const displayMembers = isAdminMode
            ? channelMembers.filter(m => m.userId !== currentUser?.id)
            : channelMembers

          return (
            <div className="p-4">
              <h3 className="font-semibold mb-3 text-sm">채널 멤버 ({displayMembers.length})</h3>
              <div className="space-y-2">
                {displayMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.profile_image_url} />
                      <AvatarFallback className="text-xs">
                        {member.user.nickname[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                      // Current user is always online
                      member.userId === currentUser?.id ? 'bg-green-500' :
                      (member.user.isActive || member.user.isOnline ? 'bg-green-500' : 'bg-gray-400')
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.user.nickname}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
                ))}
                {displayMembers.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{displayMembers.length - 5} 더 보기</p>
                )}
              </div>
            </div>
          )
        })()}
      </div>
      
      {/* Main Chat Area - 50% width reduction */}
      <div className="flex-1 max-w-[800px] flex flex-col h-full">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background/95 backdrop-blur flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">{selectedChannel.name}</h2>
                  <Badge variant="outline">
                    {(() => {
                      const isAdminMode = searchParams.get('channel') === selectedChannel.id && currentUser?.is_admin
                      const onlineMembers = channelMembers.filter(m => {
                        // If admin mode, exclude admin from count
                        if (isAdminMode && m.userId === currentUser?.id) return false
                        // Current user is always online
                        if (m.userId === currentUser?.id) return true
                        return m.user.isActive || m.user.isOnline
                      })
                      return onlineMembers.length
                    })()} 온라인
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => setInviteMemberOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setInviteMemberOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        멤버 초대
                      </DropdownMenuItem>
                      {channelMembers.find(m => m.userId === currentUser?.id && m.role === 'admin') && (
                        <DropdownMenuItem onClick={() => handleChannelSettings()}>
                          <Settings className="h-4 w-4 mr-2" />
                          채널 설정
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {/* Show delete option only for admins or channel creators */}
                      {(channelMembers.find(m => m.userId === currentUser?.id && m.role === 'admin') ||
                        selectedChannel?.creator_id === currentUser?.id) && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteChannelOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          채널 삭제
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleLeaveChannel()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        채널 나가기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
              {hasMore && (
                <div className="text-center py-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => loadMessages(selectedChannel.id, nextCursor)}
                    disabled={loading}
                  >
                    {loading ? '로딩 중...' : '이전 메시지 보기'}
                  </Button>
                </div>
              )}
              <div className="space-y-4">
                {messages.map((message) => {
                  if (message.type === 'system') {
                    return (
                      <div key={message.id} className="text-center py-2">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {message.content}
                        </span>
                      </div>
                    )
                  }
                  
                  const isOwnMessage = currentUser?.id === message.senderId
                  
                  return (
                    <div key={message.id} className={cn(
                      "flex gap-3",
                      isOwnMessage && "flex-row-reverse"
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender.profile_image_url} />
                        <AvatarFallback className="text-xs">
                          {message.sender.nickname[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "max-w-[70%] flex flex-col",
                        isOwnMessage && "items-end"
                      )}>
                        <div className={cn(
                          "flex flex-col",
                          isOwnMessage && "items-end"
                        )}>
                          <span className="font-medium text-sm mb-1">{message.sender.nickname}</span>
                          <div className={cn(
                            "px-3 py-2 rounded-lg inline-block",
                            isOwnMessage 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          )}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {safeFormat(message.created_at, 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">아직 메시지가 없습니다</p>
                    <p className="text-xs text-muted-foreground mt-1">첫 메시지를 보내보세요</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Message Input - Moved up from bottom */}
            <div className="p-4 border-t bg-background flex-shrink-0">
              <div className="flex gap-2">
                <Button size="icon" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder={`#${selectedChannel.name}에 메시지 보내기`}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  className="flex-1"
                />
                <Button size="icon" variant="ghost">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">채널을 선택하세요</h3>
              <p className="text-sm text-muted-foreground">
                왼쪽에서 채널을 선택하여 대화를 시작하세요
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Sidebar - Extra space for future features */}
      <div className="flex-1 border-l bg-muted/10 h-full overflow-y-auto">
        {/* Future features area */}
        <div className="p-8 text-center">
          <div className="text-muted-foreground">
            <p className="text-sm">추후 기능이 추가될 예정입니다</p>
          </div>
        </div>
      </div>
      </div>
      
      {/* Modals */}
      <CreateChannelModal 
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        onChannelCreated={handleChannelCreated}
      />
      
      {selectedChannel && (
        <InviteMemberModal
          open={inviteMemberOpen}
          onOpenChange={setInviteMemberOpen}
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
        />
      )}

      <DeleteChannelModal
        open={deleteChannelOpen}
        onOpenChange={setDeleteChannelOpen}
        channel={selectedChannel}
        onChannelDeleted={handleChannelDeleted}
      />
    </>
  )
}

export default function TeamPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-64 border-r bg-muted/10 animate-pulse">
          <div className="p-4">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
      <TeamPageContent />
    </Suspense>
  )
}