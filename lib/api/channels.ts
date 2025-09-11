import { apiClient } from './client'

export interface Channel {
  id: string
  name: string
  description?: string
  type: 'public' | 'private' | 'direct'
  creatorId: string
  studioId?: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
    messages: number
  }
}

export interface ChannelMember {
  id: string
  channelId: string
  userId: string
  role: 'admin' | 'moderator' | 'member'
  joinedAt: string
  lastReadAt?: string
  user: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
    bio?: string
    lastLoginAt?: string
    isActive: boolean
  }
}

export interface ChannelMessage {
  id: string
  channelId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  metadata?: any
  editedAt?: string
  deletedAt?: string
  createdAt: string
  sender: {
    id: string
    username: string
    nickname: string
    profileImageUrl?: string
  }
  files?: ChannelFile[]
}

export interface ChannelFile {
  id: string
  channelId: string
  messageId?: string
  uploaderId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  metadata?: any
  createdAt: string
}

export interface CreateChannelData {
  name: string
  description?: string
  type?: 'public' | 'private'
  studioId?: string
}

export interface SendMessageData {
  content: string
  type?: 'text' | 'image' | 'file'
  metadata?: any
}

export interface InviteMemberData {
  userId: string
  message?: string
}

// Channel APIs
export const channelsAPI = {
  // Get all channels (for current user)
  getChannels: async (): Promise<Channel[]> => {
    const response = await apiClient.get('/api/channels')
    return response.channels || []
  },

  // Create a new channel
  createChannel: async (data: CreateChannelData): Promise<Channel> => {
    const response = await apiClient.post('/api/channels', data)
    return response.channel
  },

  // Get channel details
  getChannel: async (channelId: string): Promise<Channel> => {
    const response = await apiClient.get(`/api/channels/${channelId}`)
    return response.channel
  },

  // Get channel members
  getMembers: async (channelId: string): Promise<ChannelMember[]> => {
    const response = await apiClient.get(`/api/channels/${channelId}/members`)
    return response.members || []
  },

  // Invite member to channel
  inviteMember: async (channelId: string, data: InviteMemberData) => {
    const response = await apiClient.post(`/api/channels/${channelId}/members`, data)
    return response.invite
  },

  // Leave channel
  leaveChannel: async (channelId: string) => {
    const response = await apiClient.delete(`/api/channels/${channelId}/members`)
    return response
  },

  // Get channel messages
  getMessages: async (channelId: string, limit = 50, cursor?: string): Promise<{
    messages: ChannelMessage[]
    hasMore: boolean
    nextCursor?: string
  }> => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (cursor) params.append('cursor', cursor)
    
    const response = await apiClient.get(`/api/channels/${channelId}/messages?${params}`)
    return response
  },

  // Send message to channel
  sendMessage: async (channelId: string, data: SendMessageData): Promise<ChannelMessage> => {
    const response = await apiClient.post(`/api/channels/${channelId}/messages`, data)
    return response.message
  },

  // Upload file to channel
  uploadFile: async (channelId: string, file: File, messageId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (messageId) formData.append('messageId', messageId)
    
    const response = await apiClient.post(`/api/channels/${channelId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.file
  },

  // Accept channel invite
  acceptInvite: async (inviteId: string) => {
    const response = await apiClient.post(`/api/channels/invites/${inviteId}/accept`)
    return response
  },

  // Reject channel invite
  rejectInvite: async (inviteId: string) => {
    const response = await apiClient.post(`/api/channels/invites/${inviteId}/reject`)
    return response
  },

  // Get pending invites
  getPendingInvites: async () => {
    const response = await apiClient.get('/api/channels/invites')
    return response.invites || []
  }
}