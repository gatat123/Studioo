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
  Smile
} from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  username: string
  nickname: string
  profileImageUrl?: string
  status: 'online' | 'offline' | 'away'
  role: string
}

interface ChatMessage {
  id: string
  userId: string
  username: string
  nickname: string
  profileImageUrl?: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'file'
  channel: string
}

interface ChatChannel {
  id: string
  name: string
  type: 'general' | 'project' | 'direct'
  unreadCount: number
  lastMessage?: ChatMessage
}

export default function TeamPage() {
  const { toast } = useToast()
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null)
  const [channels, setChannels] = useState<ChatChannel[]>([
    { id: '1', name: 'general', type: 'general', unreadCount: 0 },
    { id: '2', name: 'design-team', type: 'project', unreadCount: 3 },
    { id: '3', name: 'dev-team', type: 'project', unreadCount: 0 },
  ])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Connect to Socket.io
    const socket = socketClient.connect()
    
    // Join team channel
    socket.emit('join:team')
    
    // Listen for team events
    socketClient.on('team:member-joined', (member: TeamMember) => {
      setTeamMembers(prev => [...prev, member])
      toast({
        title: '팀 멤버 참여',
        description: `${member.nickname}님이 팀에 참여했습니다.`
      })
    })
    
    socketClient.on('team:member-left', (memberId: string) => {
      setTeamMembers(prev => prev.filter(m => m.id !== memberId))
    })
    
    socketClient.on('team:message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message])
      scrollToBottom()
    })
    
    socketClient.on('team:typing', (data: { userId: string, isTyping: boolean }) => {
      // Handle typing indicator
    })
    
    // Load initial data
    loadTeamMembers()
    loadMessages()
    
    return () => {
      socket.emit('leave:team')
      socketClient.off('team:member-joined')
      socketClient.off('team:member-left')
      socketClient.off('team:message')
      socketClient.off('team:typing')
    }
  }, [])
  
  const loadTeamMembers = async () => {
    // TODO: Load team members from API
    setTeamMembers([
      {
        id: '1',
        username: 'john_doe',
        nickname: 'John',
        status: 'online',
        role: 'Designer'
      },
      {
        id: '2',
        username: 'jane_smith',
        nickname: 'Jane',
        status: 'away',
        role: 'Developer'
      },
      {
        id: '3',
        username: 'bob_wilson',
        nickname: 'Bob',
        status: 'offline',
        role: 'Manager'
      }
    ])
  }
  
  const loadMessages = async () => {
    // TODO: Load messages from API
    if (selectedChannel) {
      // Load messages for selected channel
    }
  }
  
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: 'current-user',
      username: 'current-username',
      nickname: 'You',
      content: newMessage,
      timestamp: new Date(),
      type: 'text',
      channel: selectedChannel.id
    }
    
    // Emit message through socket
    socketClient.emit('team:send-message', {
      channelId: selectedChannel.id,
      content: newMessage
    })
    
    // Optimistically add message
    setMessages(prev => [...prev, message])
    setNewMessage('')
    scrollToBottom()
  }
  
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }
  
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      socketClient.emit('team:typing', { channelId: selectedChannel?.id, isTyping: true })
      
      setTimeout(() => {
        setIsTyping(false)
        socketClient.emit('team:typing', { channelId: selectedChannel?.id, isTyping: false })
      }, 2000)
    }
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
    <div className="flex h-full">
      {/* Left Sidebar - Channels */}
      <div className="w-64 border-r bg-muted/30">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">채널</h2>
            <Button size="icon" variant="ghost">
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
                  <Hash className="h-4 w-4 mr-2" />
                  <span className="flex-1 text-left">{channel.name}</span>
                  {channel.unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Team Members */}
        <div className="p-4">
          <h3 className="font-semibold mb-3 text-sm">팀 멤버 ({teamMembers.length})</h3>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profileImageUrl} />
                    <AvatarFallback className="text-xs">
                      {member.nickname[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                    getStatusColor(member.status)
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.nickname}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                    {teamMembers.filter(m => m.status === 'online').length} 온라인
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.filter(m => m.channel === selectedChannel.id).map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.profileImageUrl} />
                      <AvatarFallback className="text-xs">
                        {message.nickname[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">{message.nickname}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{message.content}</p>
                    </div>
                  </div>
                ))}
                
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
                {teamMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profileImageUrl} />
                          <AvatarFallback>
                            {member.nickname[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.nickname}</p>
                          <p className="text-xs text-muted-foreground">@{member.username}</p>
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
                  <p className="text-sm text-muted-foreground">{teamMembers.length}명</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}