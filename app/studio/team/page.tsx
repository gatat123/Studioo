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
  Trash2,
  Briefcase,
  ChevronDown,
  X,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader,
  User
} from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { SOCKET_EVENTS, type ChannelMessagePayload } from '@/lib/socket/events'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { safeFormat } from '@/lib/utils/date-helpers'
import { channelsAPI, type Channel, type ChannelMember, type ChannelMessage, type ChannelInvitation } from '@/lib/api/channels'
import { workTasksAPI, type WorkTask, type SubTask } from '@/lib/api/work-tasks'
import { useAuthStore } from '@/store/useAuthStore'
import { CreateChannelModal } from '@/components/team/CreateChannelModal'
import { InviteMemberModal } from '@/components/team/InviteMemberModal'
import { DeleteChannelModal } from '@/components/team/DeleteChannelModal'
import { FileUploadModal } from '@/components/team/FileUploadModal'
import { MessageAttachment } from '@/components/team/MessageAttachment'
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
  const [fileUploadOpen, setFileUploadOpen] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [rightPanelVisible, setRightPanelVisible] = useState(false)
  const [selectedWorkTask, setSelectedWorkTask] = useState<WorkTask | null>(null)
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([])
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const [workDropdownOpen, setWorkDropdownOpen] = useState(false)
  const [loadingWorkTasks, setLoadingWorkTasks] = useState(false)
  const [loadingSubTasks, setLoadingSubTasks] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const workDropdownRef = useRef<HTMLDivElement>(null)

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

    // Listen for channel joined event (after accepting invite)
    socket.on('channel_joined', (data: { channelId: string; channel?: any; message?: string }) => {
      console.log('[Team] Channel joined event received:', data)
      loadChannels() // Reload channel list
      toast({
        title: '채널 참가',
        description: data.message || '채널에 참가했습니다.'
      })
      // Auto-select the new channel
      if (data.channel) {
        setSelectedChannel(data.channel)
      }
    })

    // Listen for channel list update event
    socket.on('channel_list_updated', () => {
      console.log('[Team] Channel list update requested')
      loadChannels() // Reload channel list
    })

    // Listen for invite accepted notification (for inviter)
    socket.on('channel_invite_accepted_notification', (data: { acceptedBy: any; channel: any }) => {
      console.log('[Team] Invite accepted notification:', data)
      toast({
        title: '초대 수락',
        description: `${data.acceptedBy.nickname}님이 ${data.channel.name} 채널 초대를 수락했습니다.`
      })
      loadChannelMembers(selectedChannel?.id || data.channel.id)
    })

    return () => {
      socketClient.off(SOCKET_EVENTS.USER_PRESENCE_UPDATE)
      socket.off('presence_update')
      socket.off('channel_joined')
      socket.off('channel_list_updated')
      socket.off('channel_invite_accepted_notification')
      if (selectedChannel) {
        socketClient.leaveChannel(selectedChannel.id)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (selectedChannel) {
      const socket = socketClient.getSocket()

      // Handle channel join errors
      const handleChannelError = (data: { type: string; message: string }) => {
        if (data.type === 'channel_access_denied' || data.type === 'join_channel_failed') {
          console.error('[Team] Channel join error:', data.message)
          toast({
            title: '채널 참가 실패',
            description: data.message || '채널 참가 중 오류가 발생했습니다.',
            variant: 'destructive'
          })
          // Reset selected channel on error
          setSelectedChannel(null)
          setChannels(prev => prev.filter(ch => ch.id !== selectedChannel.id))
        }
      }

      // Handle channel join success
      const handleChannelJoined = (data: { channelId: string; activeUsers?: any[]; timestamp?: Date }) => {
        if (data.channelId === selectedChannel.id) {
          console.log('[Team] Successfully joined channel:', data.channelId)
          toast({
            title: '채널 참가 성공',
            description: `${selectedChannel.name} 채널에 참가했습니다.`
          })
        }
      }

      // Listen for join success/error events FIRST
      socket?.on('error', handleChannelError)
      socket?.on('channel_joined', handleChannelJoined)

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

      // Also listen to backend event for compatibility
      socketClient.on('new_channel_message', (data: { message: any }) => {
        if (data.message.channelId === selectedChannel.id) {
          setMessages(prev => {
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

      // 채널 참여 성공 이벤트 (초대 수락 후)
      socketClient.on('channel_joined', (data) => {
        if (data.channelId && data.channel) {
          console.log('[Team] Channel joined successfully:', data.channelId)
          loadChannels() // 채널 목록 새로고침
          toast({
            title: '채널 참여 성공',
            description: data.message || `${data.channel.name} 채널에 참여했습니다.`
          })
        }
      })

      // 채널 목록 업데이트 이벤트
      socketClient.on('channel_list_updated', () => {
        console.log('[Team] Channel list update requested')
        loadChannels() // 채널 목록 새로고침
      })

      // 초대 수락 알림 (초대한 사람에게)
      socketClient.on('channel_invite_accepted_notification', (data) => {
        toast({
          title: '초대 수락됨',
          description: `${data.acceptedBy.nickname}님이 ${data.channel.name} 채널 초대를 수락했습니다.`
        })
      })
      
      // Load channel data
      loadChannelMembers(selectedChannel.id)
      loadMessages(selectedChannel.id)

      // Auto-show work panel if channel has linked work task
      if (selectedChannel.workTask) {
        setSelectedWorkTask(selectedChannel.workTask)
        setRightPanelVisible(true)
        loadSubTasks(selectedChannel.workTask.id)
      } else {
        setRightPanelVisible(false)
        setSelectedWorkTask(null)
        setSubTasks([])
      }
      
      return () => {
        const socket = socketClient.getSocket()
        socket?.off('error', handleChannelError)
        socket?.off('channel_joined', handleChannelJoined)
        socketClient.leaveChannel(selectedChannel.id)
        socketClient.off(SOCKET_EVENTS.CHANNEL_MESSAGE_NEW)
        socketClient.off('new_channel_message') // Remove backend event listener
        socketClient.off(SOCKET_EVENTS.CHANNEL_MEMBER_JOINED)
        socketClient.off(SOCKET_EVENTS.CHANNEL_MEMBER_LEFT)
        socketClient.off(SOCKET_EVENTS.CHANNEL_TYPING_START)
        socketClient.off(SOCKET_EVENTS.CHANNEL_TYPING_STOP)
        socketClient.off(SOCKET_EVENTS.CHANNEL_INVITE_RECEIVED)
        socketClient.off('channel_joined')
        socketClient.off('channel_list_updated')
        socketClient.off('channel_invite_accepted_notification')
      }
    }
  }, [selectedChannel, currentUser, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  // Work dropdown 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workDropdownRef.current && !workDropdownRef.current.contains(event.target as Node)) {
        setWorkDropdownOpen(false)
      }
    }

    if (workDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [workDropdownOpen])
  
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
    
    // Listen for confirmation (backend sends 'channel_message_sent')
    const handleMessageSent = (data: { message?: any; tempId?: string }) => {
      if (data.tempId === tempId && data.message) {
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? data.message as ChannelMessage : msg
        ))
        socketClient.off('channel_message_sent', handleMessageSent)
      }
    }
    socketClient.on('channel_message_sent', handleMessageSent)

    const handleMessageError = (data: { error: string, tempId?: string }) => {
      if (data.tempId === tempId) {
        // Remove optimistic message
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        toast({
          title: '오류',
          description: data.error || '메시지 전송에 실패했습니다',
          variant: 'destructive'
        })
        socketClient.off('channel_message_error', handleMessageError)
      }
    }
    socketClient.on('channel_message_error', handleMessageError)
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
  
  const handleFileUpload = async (file: File, caption?: string) => {
    if (!selectedChannel) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)
    if (caption) {
      formData.append('caption', caption)
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${selectedChannel.id}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()

        // Send message with file attachment
        const tempId = `temp-${Date.now()}`
        const fileMessage = {
          id: tempId,
          channelId: selectedChannel.id,
          senderId: currentUser?.id || '',
          content: caption || file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          created_at: new Date().toISOString(),
          sender: {
            id: currentUser?.id || '',
            username: currentUser?.username || '',
            nickname: currentUser?.nickname || '',
            profile_image_url: currentUser?.profile_image_url
          },
          files: [data.file]
        } as ChannelMessage

        // Optimistically add message
        setMessages(prev => [...prev, fileMessage])
        scrollToBottom()

        // Send through Socket.io
        socketClient.sendChannelMessage(
          selectedChannel.id,
          caption || file.name,
          file.type.startsWith('image/') ? 'image' : 'file',
          tempId
        )

        toast({
          title: '파일 업로드 완료',
          description: `${file.name}이(가) 업로드되었습니다.`
        })
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('File upload error:', error)
      toast({
        title: '업로드 실패',
        description: '파일 업로드에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setUploadingFile(false)
      setFileUploadOpen(false)
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

  // Work 관련 함수들
  const loadWorkTasks = async () => {
    try {
      setLoadingWorkTasks(true)
      const tasks = await workTasksAPI.getWorkTasks()
      setWorkTasks(tasks)
    } catch (error) {
      console.error('Failed to load work tasks:', error)
      toast({
        title: '오류',
        description: '작업 목록을 불러오는데 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoadingWorkTasks(false)
    }
  }

  const loadSubTasks = async (workTaskId: string) => {
    try {
      setLoadingSubTasks(true)
      const subtasks = await workTasksAPI.getSubTasks(workTaskId)
      setSubTasks(subtasks)
    } catch (error) {
      console.error('Failed to load subtasks:', error)
      toast({
        title: '오류',
        description: '업무 보드를 불러오는데 실패했습니다.'
        variant: 'destructive'
      })
    } finally {
      setLoadingSubTasks(false)
    }
  }

  const handleWorkIconClick = async () => {
    if (workTasks.length === 0) {
      await loadWorkTasks()
    }
    setWorkDropdownOpen(!workDropdownOpen)
  }

  const handleWorkTaskSelect = async (workTask: WorkTask) => {
    setSelectedWorkTask(workTask)
    setRightPanelVisible(true)
    setWorkDropdownOpen(false)
    await loadSubTasks(workTask.id)
  }

  const handleCloseRightPanel = () => {
    setRightPanelVisible(false)
    setSelectedWorkTask(null)
    setSubTasks([])
  }

  const handleLinkWorkTask = async () => {
    if (!selectedWorkTask || !selectedChannel) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${selectedChannel.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workTaskId: selectedWorkTask.id })
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedChannel(data.channel)
        setChannels(prev => prev.map(ch =>
          ch.id === selectedChannel.id ? data.channel : ch
        ))
        toast({
          title: '작업 연결 완료',
          description: `${selectedWorkTask.title} 작업이 채널에 연결되었습니다.`
        })
      } else {
        throw new Error('Failed to link work task')
      }
    } catch (error) {
      console.error('Error linking work task:', error)
      toast({
        title: '오류',
        description: '작업 연결에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUnlinkWorkTask = async () => {
    if (!selectedChannel) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${selectedChannel.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workTaskId: null })
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedChannel(data.channel)
        setChannels(prev => prev.map(ch =>
          ch.id === selectedChannel.id ? data.channel : ch
        ))
        toast({
          title: '연결 해제 완료',
          description: '작업 연결이 해제되었습니다.'
        })
        handleCloseRightPanel()
      } else {
        throw new Error('Failed to unlink work task')
      }
    } catch (error) {
      console.error('Error unlinking work task:', error)
      toast({
        title: '오류',
        description: '연결 해제에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  // Helper function to calculate days elapsed
  const getDaysElapsed = (updatedAt: string) => {
    const updatedDate = new Date(updatedAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - updatedDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Helper function to format date in Korean
  const formatKoreanDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Channels */}
      <div className="w-64 border-r bg-muted/30 flex flex-col h-full flex-shrink-0">
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
                                const result = await response.json();

                                // 즉시 토스트 표시
                                toast({
                                  title: '채널 참여 성공!',
                                  description: result.message || `${invite.channel.name} 채널에 참여했습니다.`
                                });

                                // 채널 목록 즉시 새로고침
                                await loadChannels();

                                // 새로 참여한 채널을 선택 (옵션)
                                if (result.channel) {
                                  setSelectedChannel(result.channel);
                                }
                              } else {
                                const errorData = await response.json();
                                toast({
                                  title: '오류',
                                  description: errorData.error || '초대 수락에 실패했습니다.',
                                  variant: 'destructive'
                                });
                              }
                            } catch (error) {
                              console.error('Channel invite accept error:', error);
                              toast({
                                title: '오류',
                                description: '처리 중 오류가 발생했습니다.',
                                variant: 'destructive'
                              });
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
                                toast({
                                  title: '초대 거절',
                                  description: '초대를 거절했습니다.'
                                });

                                // 채널 목록 즉시 새로고침 (초대 목록에서 제거됨)
                                await loadChannels();
                              } else {
                                const errorData = await response.json();
                                toast({
                                  title: '오류',
                                  description: errorData.error || '초대 거절에 실패했습니다.',
                                  variant: 'destructive'
                                });
                              }
                            } catch (error) {
                              console.error('Channel invite reject error:', error);
                              toast({
                                title: '오류',
                                description: '처리 중 오류가 발생했습니다.',
                                variant: 'destructive'
                              });
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

      {/* Spacer for centering when right panel is hidden */}
      {!rightPanelVisible && <div className="flex-1 max-w-xs" />}

      {/* Main Chat Area - Center when right panel is hidden */}
      <div className={cn(
        "flex flex-col h-full transition-all duration-300",
        rightPanelVisible ? "flex-1" : "max-w-3xl w-full"
      )}>
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
                  {/* Work Icon with Dropdown */}
                  <div className="relative" ref={workDropdownRef}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleWorkIconClick}
                      disabled={loadingWorkTasks}
                    >
                      {loadingWorkTasks ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Briefcase className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Work Tasks Dropdown */}
                    {workDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
                        <div className="p-3 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">작업 선택</h3>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setWorkDropdownOpen(false)}
                              className="h-6 w-6"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {workTasks.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">작업이 없습니다</p>
                            </div>
                          ) : (
                            <div className="space-y-1 p-2">
                              {workTasks.map((task) => (
                                <Button
                                  key={task.id}
                                  variant="ghost"
                                  className="w-full justify-start h-auto p-3"
                                  onClick={() => handleWorkTaskSelect(task)}
                                >
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm">{task.title}</span>
                                      <Badge
                                        variant={task.status === 'completed' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {task.status === 'pending' && '대기'}
                                        {task.status === 'in_progress' && '진행중'}
                                        {task.status === 'review' && '검토중'}
                                        {task.status === 'completed' && '완료'}
                                        {task.status === 'cancelled' && '취소'}
                                      </Badge>
                                    </div>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {task.description}
                                      </p>
                                    )}
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

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
                        <AvatarImage src={message.sender.profile_image_url || message.sender.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {message.sender.nickname[0]?.toUpperCase()}
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
                          {/* File attachments */}
                          {message.files && message.files.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {message.files.map((file) => (
                                <MessageAttachment key={file.id} file={file} />
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground mt-1">
                            {safeFormat(message.created_at || message.createdAt, 'HH:mm')}
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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setFileUploadOpen(true)}
                  disabled={uploadingFile}
                >
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

      {/* Right Spacer for centering when right panel is hidden */}
      {!rightPanelVisible && <div className="flex-1 max-w-xs" />}

      {/* Right Sidebar - Work Panel */}
      {rightPanelVisible && selectedWorkTask && (
        <div className="w-96 border-l bg-background h-full overflow-y-auto">
          {/* Work Task Header */}
          <div className="p-4 border-b bg-background/95 backdrop-blur flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">작업 상세</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCloseRightPanel}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Work Summary */}
          <div className="p-4 border-b">
            <h3 className="font-medium text-lg mb-2">{selectedWorkTask.title}</h3>
            {selectedWorkTask.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {selectedWorkTask.description}
              </p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">상태</span>
                <Badge
                  variant={selectedWorkTask.status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {selectedWorkTask.status === 'pending' && '대기'}
                  {selectedWorkTask.status === 'in_progress' && '진행중'}
                  {selectedWorkTask.status === 'review' && '검토중'}
                  {selectedWorkTask.status === 'completed' && '완료'}
                  {selectedWorkTask.status === 'cancelled' && '취소'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">우선순위</span>
                <Badge
                  variant={selectedWorkTask.priority === 'urgent' ? 'destructive' : 'outline'}
                  className="text-xs"
                >
                  {selectedWorkTask.priority === 'low' && '낮음'}
                  {selectedWorkTask.priority === 'medium' && '보통'}
                  {selectedWorkTask.priority === 'high' && '높음'}
                  {selectedWorkTask.priority === 'urgent' && '긴급'}
                </Badge>
              </div>

              {selectedWorkTask.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">마감일</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">
                      {new Date(selectedWorkTask.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">업무 보드</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">
                    {subTasks.filter(task => task.status === 'done').length} / {subTasks.length}
                  </span>
                  <CheckCircle className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          {/* SubTasks */}
          <div className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">업무 보드</h3>
                  {/* Link/Unlink buttons for channel creator */}
                  {selectedChannel && selectedChannel.creatorId === currentUser?.id && (
                    <div className="flex items-center gap-2">
                      {selectedChannel.workTask ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnlinkWorkTask()}
                          className="h-6 text-xs"
                        >
                          연결 해제
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkWorkTask()}
                          className="h-6 text-xs"
                        >
                          작업 연결
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {loadingSubTasks && (
                  <Loader className="h-4 w-4 animate-spin" />
                )}
              </div>

              {subTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">업무 보드가 없습니다</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* TODO */}
                  {subTasks.filter(task => task.status === 'todo').length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        할 일 ({subTasks.filter(task => task.status === 'todo').length})
                      </h4>
                      <div className="space-y-2">
                        {subTasks.filter(task => task.status === 'todo').map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-background">
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">{task.title}</h5>
                              {task.description && (
                                <p className="text-xs text-muted-foreground overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                  {task.description}
                                </p>
                              )}

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>생성일:</span>
                                  <span>{formatKoreanDate(task.createdAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>수정일:</span>
                                  <span>{formatKoreanDate(task.updatedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>경과일:</span>
                                  <span>{getDaysElapsed(task.updatedAt)}일</span>
                                </div>
                                {task.assignee && (
                                  <div className="flex items-center justify-between">
                                    <span>담당자:</span>
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{task.assignee.nickname}</span>
                                    </div>
                                  </div>
                                )}
                                {task.participants && task.participants.length > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>참여자:</span>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span>{task.participants.length}명</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.priority === 'low' && '낮음'}
                                  {task.priority === 'medium' && '보통'}
                                  {task.priority === 'high' && '높음'}
                                  {task.priority === 'urgent' && '긴급'}
                                </Badge>
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {formatKoreanDate(task.dueDate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* IN_PROGRESS */}
                  {subTasks.filter(task => task.status === 'in_progress').length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        진행 중 ({subTasks.filter(task => task.status === 'in_progress').length})
                      </h4>
                      <div className="space-y-2">
                        {subTasks.filter(task => task.status === 'in_progress').map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">{task.title}</h5>
                              {task.description && (
                                <p className="text-xs text-muted-foreground overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                  {task.description}
                                </p>
                              )}

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>생성일:</span>
                                  <span>{formatKoreanDate(task.createdAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>수정일:</span>
                                  <span>{formatKoreanDate(task.updatedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>경과일:</span>
                                  <span>{getDaysElapsed(task.updatedAt)}일</span>
                                </div>
                                {task.assignee && (
                                  <div className="flex items-center justify-between">
                                    <span>담당자:</span>
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{task.assignee.nickname}</span>
                                    </div>
                                  </div>
                                )}
                                {task.participants && task.participants.length > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>참여자:</span>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span>{task.participants.length}명</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.priority === 'low' && '낮음'}
                                  {task.priority === 'medium' && '보통'}
                                  {task.priority === 'high' && '높음'}
                                  {task.priority === 'urgent' && '긴급'}
                                </Badge>
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {formatKoreanDate(task.dueDate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* REVIEW */}
                  {subTasks.filter(task => task.status === 'review').length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        검토 중 ({subTasks.filter(task => task.status === 'review').length})
                      </h4>
                      <div className="space-y-2">
                        {subTasks.filter(task => task.status === 'review').map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">{task.title}</h5>
                              {task.description && (
                                <p className="text-xs text-muted-foreground overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                  {task.description}
                                </p>
                              )}

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>생성일:</span>
                                  <span>{formatKoreanDate(task.createdAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>수정일:</span>
                                  <span>{formatKoreanDate(task.updatedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>경과일:</span>
                                  <span>{getDaysElapsed(task.updatedAt)}일</span>
                                </div>
                                {task.assignee && (
                                  <div className="flex items-center justify-between">
                                    <span>담당자:</span>
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{task.assignee.nickname}</span>
                                    </div>
                                  </div>
                                )}
                                {task.participants && task.participants.length > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>참여자:</span>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span>{task.participants.length}명</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.priority === 'low' && '낮음'}
                                  {task.priority === 'medium' && '보통'}
                                  {task.priority === 'high' && '높음'}
                                  {task.priority === 'urgent' && '긴급'}
                                </Badge>
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {formatKoreanDate(task.dueDate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DONE */}
                  {subTasks.filter(task => task.status === 'done').length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        완료 ({subTasks.filter(task => task.status === 'done').length})
                      </h4>
                      <div className="space-y-2">
                        {subTasks.filter(task => task.status === 'done').map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm line-through text-muted-foreground">
                                {task.title}
                              </h5>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-through overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                  {task.description}
                                </p>
                              )}

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>생성일:</span>
                                  <span>{formatKoreanDate(task.createdAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>완료일:</span>
                                  <span>{task.completedAt ? formatKoreanDate(task.completedAt) : '미완료'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>소요일:</span>
                                  <span>
                                    {task.completedAt
                                      ? Math.floor((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                                      : getDaysElapsed(task.updatedAt)
                                    }일
                                  </span>
                                </div>
                                {task.assignee && (
                                  <div className="flex items-center justify-between">
                                    <span>담당자:</span>
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{task.assignee.nickname}</span>
                                    </div>
                                  </div>
                                )}
                                {task.participants && task.participants.length > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>참여자:</span>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span>{task.participants.length}명</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.priority === 'low' && '낮음'}
                                  {task.priority === 'medium' && '보통'}
                                  {task.priority === 'high' && '높음'}
                                  {task.priority === 'urgent' && '긴급'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

      {selectedChannel && (
        <FileUploadModal
          open={fileUploadOpen}
          onOpenChange={setFileUploadOpen}
          onFileSelect={handleFileUpload}
          maxSize={50} // 50MB max
        />
      )}
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