'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  Users, 
  MessageSquare, 
  Video, 
  Phone,
  MoreVertical,
  Search,
  Plus,
  Hash,
  AtSign,
  Smile,
  UserPlus,
  Settings
} from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { channelsAPI, type Channel, type ChannelMember, type ChannelMessage } from '@/lib/api/channels'
import { CreateChannelModal } from '@/components/team/CreateChannelModal'
import { InviteMemberModal } from '@/components/team/InviteMemberModal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'


export default function TeamPage() {
  const { toast } = useToast()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([])
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()

  useEffect(() => {
    // Load initial channels
    loadChannels()
    
    // Connect to Socket.io
    const socket = socketClient.connect()
    
    return () => {
      if (selectedChannel) {
        socketClient.emit('leave:channel', { channelId: selectedChannel.id })
      }
    }
  }, [])
  
  useEffect(() => {
    if (selectedChannel) {
      // Join channel
      socketClient.emit('join:channel', { channelId: selectedChannel.id })
      
      // Listen for channel events
      socketClient.on(`channel:${selectedChannel.id}:message`, (message: ChannelMessage) => {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      })
      
      socketClient.on(`channel:${selectedChannel.id}:member-joined`, (member: ChannelMember) => {
        setChannelMembers(prev => [...prev, member])
        toast({
          title: '새 멤버',
          description: `${member.user.nickname}님이 채널에 참여했습니다.`
        })
      })
      
      socketClient.on(`channel:${selectedChannel.id}:member-left`, (userId: string) => {
        setChannelMembers(prev => prev.filter(m => m.userId !== userId))
      })
      
      socketClient.on(`channel:${selectedChannel.id}:typing`, (data: { userId: string, isTyping: boolean }) => {
        // Handle typing indicator
      })
      
      // Load channel data
      loadChannelMembers(selectedChannel.id)
      loadMessages(selectedChannel.id)
      
      return () => {
        socketClient.emit('leave:channel', { channelId: selectedChannel.id })
        socketClient.off(`channel:${selectedChannel.id}:message`)
        socketClient.off(`channel:${selectedChannel.id}:member-joined`)
        socketClient.off(`channel:${selectedChannel.id}:member-left`)
        socketClient.off(`channel:${selectedChannel.id}:typing`)
      }
    }
  }, [selectedChannel])
  
  const loadChannels = async () => {
    try {
      const channelList = await channelsAPI.getChannels()
      setChannels(channelList)
      
      // Auto-select first channel if available
      if (channelList.length > 0 && !selectedChannel) {
        setSelectedChannel(channelList[0])
      }
    } catch (error) {
      console.error('Failed to load channels:', error)
      toast({
        title: '오류',
        description: '채널 목록을 불러오는데 실패했습니다',
        variant: 'destructive'
      })
    }
  }
  
  const loadChannelMembers = async (channelId: string) => {
    try {
      const members = await channelsAPI.getMembers(channelId)
      setChannelMembers(members)
    } catch (error) {
      console.error('Failed to load channel members:', error)
    }
  }
  
  const loadMessages = async (channelId: string, cursor?: string) => {
    try {
      setLoading(true)
      const result = await channelsAPI.getMessages(channelId, 50, cursor)
      
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
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return
    
    try {
      // Send message through API
      const message = await channelsAPI.sendMessage(selectedChannel.id, {
        content: newMessage,
        type: 'text'
      })
      
      // Emit through socket for real-time update to other users
      socketClient.emit('channel:send-message', {
        channelId: selectedChannel.id,
        message
      })
      
      // Optimistically add message
      setMessages(prev => [...prev, message])
      setNewMessage('')
      scrollToBottom()
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: '오류',
        description: '메시지 전송에 실패했습니다',
        variant: 'destructive'
      })
    }
  }
  
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }
  
  const handleTyping = () => {
    if (!isTyping && selectedChannel) {
      setIsTyping(true)
      socketClient.emit('channel:typing', { channelId: selectedChannel.id, isTyping: true })
      
      setTimeout(() => {
        setIsTyping(false)
        if (selectedChannel) {
          socketClient.emit('channel:typing', { channelId: selectedChannel.id, isTyping: false })
        }
      }, 2000)
    }
  }
  
  const handleChannelCreated = () => {
    loadChannels()
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <>
      <div className="flex h-full">
        {/* Left Sidebar - Channels */}
      <div className="w-64 border-r bg-muted/30">
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
          
          <ScrollArea className="h-[calc(100vh-240px)]">
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
          </ScrollArea>
        </div>
        
        {/* Channel Members */}
        {selectedChannel && (
          <div className="p-4">
            <h3 className="font-semibold mb-3 text-sm">채널 멤버 ({channelMembers.length})</h3>
            <div className="space-y-2">
              {channelMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.profileImageUrl} />
                      <AvatarFallback className="text-xs">
                        {member.user.nickname[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                      member.user.isActive ? 'bg-green-500' : 'bg-gray-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.user.nickname}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              ))}
              {channelMembers.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">+{channelMembers.length - 5} 더 보기</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">{selectedChannel.name}</h2>
                  <Badge variant="outline">
                    {channelMembers.filter(m => m.user.isActive).length} 온라인
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
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        채널 설정
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
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
                  
                  return (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {message.sender.nickname[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm">{message.sender.nickname}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{message.content}</p>
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
            </ScrollArea>
            
            {/* Message Input */}
            <div className="p-4 border-t">
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
                  onKeyPress={(e) => {
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
          <div className="flex-1 flex items-center justify-center">
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
      
      {/* Right Sidebar - Info Panel (Optional) */}
      <div className="w-80 border-l bg-muted/30">
        <Tabs defaultValue="members" className="h-full">
          <TabsList className="w-full">
            <TabsTrigger value="members" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              멤버
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1">
              파일
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1">
              정보
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="members" className="p-4">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-3">
                {channelMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user.profileImageUrl} />
                          <AvatarFallback>
                            {member.user.nickname[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.user.nickname}</p>
                          <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                          <Badge variant="outline" className="mt-1">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="files" className="p-4">
            <p className="text-sm text-muted-foreground text-center py-8">
              공유된 파일이 없습니다
            </p>
          </TabsContent>
          
          <TabsContent value="info" className="p-4">
            {selectedChannel && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">채널 이름</h4>
                  <p className="text-sm text-muted-foreground">#{selectedChannel.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">채널 유형</h4>
                  <p className="text-sm text-muted-foreground">{selectedChannel.type}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">멤버 수</h4>
                  <p className="text-sm text-muted-foreground">{channelMembers.length}명</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
    </>
  )
}